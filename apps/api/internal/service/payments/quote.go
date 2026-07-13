package payments

import (
	"context"
	"fmt"
	"time"

	"github.com/stellar/go-stellar-sdk/txnbuild"

	"github.com/payoesteam/payoes/apps/api/internal/pricing"
	"github.com/payoesteam/payoes/apps/api/internal/stellar"
)

type PayableResult struct {
	Payment *Payment
	Error   string
}

func NeedsPaymentQuoteRefresh(payment *Payment, paidAsset AllowedAsset) bool {
	if payment.PricingCurrency == nil || payment.PricingAmount == nil {
		return false
	}
	assetChanged := payment.PaidAsset == nil || !AllowedAssetsEquivalent(
		AllowedAsset{AssetCode: *payment.PaidAsset, IssuerAddress: payment.PaidAssetIssuer},
		paidAsset,
		payment.Environment,
	)
	return payment.QuotedPaidAmount == nil ||
		payment.QuoteExpiresAt == nil ||
		pricing.IsQuoteExpired(payment.QuoteExpiresAt) ||
		assetChanged
}

func (s *Service) EnsurePayablePayment(ctx context.Context, payment *Payment) (PayableResult, error) {
	if payment.Status == "completed" {
		return PayableResult{Payment: payment, Error: "Payment is already completed"}, nil
	}

	if payment.Status == "expired" && payment.InvoiceID != nil {
		sessionExpiresAt, err := s.resolveInvoiceSessionExpiry(ctx, payment)
		if err != nil {
			return PayableResult{}, err
		}
		if sessionExpiresAt != nil && sessionExpiresAt.After(time.Now()) {
			pending := "pending"
			reopened, err := s.PatchPayment(ctx, payment, PaymentPatch{
				Status:    &pending,
				ExpiresAt: sessionExpiresAt,
			})
			if err != nil {
				return PayableResult{}, err
			}
			return PayableResult{Payment: reopened}, nil
		}
	}

	if IsRetryableFailedPayment(payment) {
		reopened, err := s.ResetForRetry(ctx, payment)
		if err != nil {
			return PayableResult{}, err
		}
		return PayableResult{Payment: reopened}, nil
	}

	if IsCheckoutProcessingStatus(payment.Status) {
		return PayableResult{Payment: payment}, nil
	}

	if payment.Status == "settlement_failed" {
		if payment.SettlementTxHash != nil {
			repaired, err := s.ProcessEscrowSettlement(ctx, payment)
			if err != nil {
				return PayableResult{}, err
			}
			return PayableResult{Payment: repaired}, nil
		}
		return PayableResult{
			Payment: payment,
			Error:   "Settlement could not be completed. Please contact the merchant if your funds were not returned.",
		}, nil
	}

	if payment.Status != "pending" && payment.Status != "failed" {
		if payment.Status == "expired" {
			msg, err := s.resolveInvoicePaymentSessionExpiredError(ctx, payment)
			if err != nil {
				return PayableResult{}, err
			}
			return PayableResult{Payment: payment, Error: msg}, nil
		}
		return PayableResult{Payment: payment, Error: "Payment is " + payment.Status}, nil
	}

	if IsPaymentSessionExpired(payment) {
		expired := "expired"
		if _, err := s.PatchPayment(ctx, payment, PaymentPatch{Status: &expired}); err != nil {
			return PayableResult{}, err
		}
		msg, err := s.resolveInvoicePaymentSessionExpiredError(ctx, payment)
		if err != nil {
			return PayableResult{}, err
		}
		return PayableResult{Payment: payment, Error: msg}, nil
	}

	return PayableResult{Payment: payment}, nil
}

func (s *Service) resolveInvoiceSessionExpiry(ctx context.Context, payment *Payment) (*time.Time, error) {
	if payment.InvoiceID == nil {
		return payment.ExpiresAt, nil
	}
	var status string
	var dueAt *time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT status, due_at FROM invoices WHERE id = $1 LIMIT 1`, *payment.InvoiceID,
	).Scan(&status, &dueAt)
	if err != nil {
		return payment.ExpiresAt, nil
	}
	if status != "open" {
		return payment.ExpiresAt, nil
	}
	if dueAt != nil {
		return dueAt, nil
	}
	fallback := payment.CreatedAt.Add(24 * time.Hour)
	return &fallback, nil
}

func (s *Service) resolveInvoicePaymentSessionExpiredError(ctx context.Context, payment *Payment) (string, error) {
	if payment.InvoiceID == nil {
		return "This checkout session has expired. Ask the merchant to send a new payment link.", nil
	}
	var dueAt *time.Time
	_ = s.pool.QueryRow(ctx, `SELECT due_at FROM invoices WHERE id = $1 LIMIT 1`, *payment.InvoiceID).Scan(&dueAt)
	if dueAt != nil {
		return "This invoice checkout session has expired. Ask the merchant to send a new invoice.", nil
	}
	return "This checkout session has expired. Ask the merchant to send a new payment link.", nil
}

func (s *Service) PreviewPaymentQuote(ctx context.Context, payment *Payment, paidAsset AllowedAsset, ttlMinutes int) (*pricing.Quote, error) {
	match, settlement, err := s.resolveQuotePaidAsset(payment, paidAsset)
	if err != nil {
		return nil, err
	}
	return pricing.BuildPaymentQuote(
		*payment.PricingAmount,
		*payment.PricingCurrency,
		pricing.AllowedAsset{AssetCode: match.AssetCode, IssuerAddress: match.IssuerAddress},
		pricing.AllowedAsset{AssetCode: settlement.AssetCode, IssuerAddress: settlement.IssuerAddress},
		ttlMinutes,
	)
}

func (s *Service) RefreshPaymentQuote(ctx context.Context, payment *Payment, paidAsset AllowedAsset, ttlMinutes int) (*Payment, *pricing.Quote, error) {
	canonical, settlement, match, err := s.resolveQuotePaidAssetFull(payment, paidAsset)
	if err != nil {
		return nil, nil, err
	}
	quote, err := pricing.BuildPaymentQuote(
		*payment.PricingAmount,
		*payment.PricingCurrency,
		pricing.AllowedAsset{AssetCode: match.AssetCode, IssuerAddress: match.IssuerAddress},
		pricing.AllowedAsset{AssetCode: settlement.AssetCode, IssuerAddress: settlement.IssuerAddress},
		ttlMinutes,
	)
	if err != nil {
		return nil, nil, err
	}

	withPaid, err := s.SetPaidAsset(ctx, payment, canonical)
	if err != nil {
		return nil, nil, err
	}
	settlementRate := quote.SettlementQuoteRate
	updated, err := s.ApplyQuote(ctx, withPaid, quote.PaidAmount, quote.Rate, quote.ExpiresAt, &quote.SettlementAmount, &settlementRate)
	if err != nil {
		return nil, nil, err
	}

	_ = SyncEscrowOperatorTrustlines(updated.Environment, updated.AllowedAssets)
	return updated, quote, nil
}

func (s *Service) resolveQuotePaidAsset(payment *Payment, paidAsset AllowedAsset) (AllowedAsset, AllowedAsset, error) {
	canonical, settlement, match, err := s.resolveQuotePaidAssetFull(payment, paidAsset)
	_ = canonical
	return match, settlement, err
}

func (s *Service) resolveQuotePaidAssetFull(payment *Payment, paidAsset AllowedAsset) (canonical, settlement, match AllowedAsset, err error) {
	if payment.PricingCurrency == nil || payment.PricingAmount == nil {
		err = fmt.Errorf("This payment does not require a conversion quote")
		return
	}
	if len(*payment.PricingCurrency) != 3 {
		err = fmt.Errorf("Unsupported invoice currency")
		return
	}
	found := FindAllowedAsset(payment.AllowedAssets, paidAsset.AssetCode, paidAsset.IssuerAddress, payment.Environment)
	if found == nil {
		err = fmt.Errorf("Selected asset is not allowed for this payment")
		return
	}
	match = *found
	settlement = SettlementAssetOf(payment)
	canonical = ResolveAllowedAsset(match, payment.Environment)
	return
}

// SyncEscrowOperatorTrustlines ensures the escrow operator can receive allowed assets.
func SyncEscrowOperatorTrustlines(environment string, allowed []AllowedAsset) error {
	if !stellar.IsOperatorConfigured(environment) {
		return nil
	}
	escrow, err := stellar.GetEscrowConfig(environment)
	if err != nil {
		return err
	}
	required := make([]stellar.TrustlineAsset, 0)
	seen := map[string]bool{}
	for _, asset := range allowed {
		if asset.AssetCode == "XLM" {
			continue
		}
		resolved := ResolveAllowedAsset(asset, environment)
		issuer := issuerOrEmpty(resolved.IssuerAddress)
		if issuer == "" {
			continue
		}
		key := resolved.AssetCode + ":" + issuer
		if seen[key] {
			continue
		}
		seen[key] = true
		required = append(required, stellar.TrustlineAsset{
			AssetCode:     resolved.AssetCode,
			IssuerAddress: issuer,
			DisplayName:   resolved.AssetCode,
		})
	}
	if len(required) == 0 {
		return nil
	}
	missing, err := stellar.GetMissingTrustlines(escrow.PublicKey, required, environment)
	if err != nil || len(missing) == 0 {
		return err
	}
	xdrStr, err := stellar.BuildChangeTrustTransactionXDR(escrow.PublicKey, missing, environment)
	if err != nil {
		return err
	}
	generic, err := txnbuild.TransactionFromXDR(xdrStr)
	if err != nil {
		return err
	}
	tx, ok := generic.Transaction()
	if !ok {
		return fmt.Errorf("expected transaction")
	}
	signed, err := tx.Sign(stellar.NetworkPassphrase(environment), escrow.Keypair)
	if err != nil {
		return err
	}
	b64, err := signed.Base64()
	if err != nil {
		return err
	}
	_, err = stellar.SubmitSignedXDR(b64, environment)
	return err
}

func GetEscrowDepositTrustlineError(asset AllowedAsset, environment string) (string, error) {
	if asset.AssetCode == "XLM" {
		return "", nil
	}
	resolved := ResolveAllowedAsset(asset, environment)
	issuer := issuerOrEmpty(resolved.IssuerAddress)
	if issuer == "" {
		return asset.AssetCode + " is not configured for deposits on this network.", nil
	}
	if !stellar.IsOperatorConfigured(environment) {
		return "", nil
	}
	escrow, err := stellar.GetEscrowConfig(environment)
	if err != nil {
		return "", err
	}
	account, err := stellar.LoadAccount(escrow.PublicKey, environment)
	if err != nil {
		return "", err
	}
	if account != nil && stellar.AccountTrustsAsset(account, resolved.AssetCode, issuer) {
		return "", nil
	}
	return resolved.AssetCode + " deposits are not ready yet. Wait a moment and try again, or pay with XLM.", nil
}
