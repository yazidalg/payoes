package payments

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type PaymentPatch struct {
	Status                   *string
	PaidAsset                *string
	PaidAssetIssuer          **string
	QuotedPaidAmount         *string
	QuotedSettlementAmount   *string
	QuoteRate                *string
	SettlementQuoteRate      *string
	QuoteExpiresAt           *time.Time
	Amount                   *string
	PlatformFeeAmount        *string
	MerchantSettlementAmount *string
	DepositTxHash            *string
	SettlementTxHash         *string
	RefundTxHash             *string
	TxHash                   *string
	PayerAddress             *string
	ReceivedAmount           *string
	RefundReason             **string
	ConfirmedAt              *time.Time
	Metadata                 map[string]string
	ClearDepositTxHash       bool
	ClearSettlementTxHash    bool
	ClearRefundTxHash        bool
	ClearTxHash              bool
	ClearPayerAddress        bool
	ClearReceivedAmount      bool
	ClearRefundReason        bool
	ExpiresAt                *time.Time
}

func (s *Service) PatchPayment(ctx context.Context, payment *Payment, patch PaymentPatch) (*Payment, error) {
	meta := payment.Metadata
	if patch.Metadata != nil {
		meta = patch.Metadata
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}

	status := payment.Status
	if patch.Status != nil {
		status = *patch.Status
	}
	paidAsset := payment.PaidAsset
	if patch.PaidAsset != nil {
		paidAsset = patch.PaidAsset
	}
	paidIssuer := payment.PaidAssetIssuer
	if patch.PaidAssetIssuer != nil {
		paidIssuer = *patch.PaidAssetIssuer
	}
	quotedPaid := payment.QuotedPaidAmount
	if patch.QuotedPaidAmount != nil {
		quotedPaid = patch.QuotedPaidAmount
	}
	quotedSettlement := payment.QuotedSettlementAmount
	if patch.QuotedSettlementAmount != nil {
		quotedSettlement = patch.QuotedSettlementAmount
	}
	quoteRate := payment.QuoteRate
	if patch.QuoteRate != nil {
		quoteRate = patch.QuoteRate
	}
	settlementQuoteRate := payment.SettlementQuoteRate
	if patch.SettlementQuoteRate != nil {
		settlementQuoteRate = patch.SettlementQuoteRate
	}
	quoteExpires := payment.QuoteExpiresAt
	if patch.QuoteExpiresAt != nil {
		quoteExpires = patch.QuoteExpiresAt
	}
	amount := payment.Amount
	if patch.Amount != nil {
		amount = *patch.Amount
	}
	platformFee := payment.PlatformFeeAmount
	if patch.PlatformFeeAmount != nil {
		platformFee = *patch.PlatformFeeAmount
	}
	merchantSettlement := payment.MerchantSettlementAmount
	if patch.MerchantSettlementAmount != nil {
		merchantSettlement = patch.MerchantSettlementAmount
	}
	depositTx := payment.DepositTxHash
	if patch.ClearDepositTxHash {
		depositTx = nil
	} else if patch.DepositTxHash != nil {
		depositTx = patch.DepositTxHash
	}
	settlementTx := payment.SettlementTxHash
	if patch.ClearSettlementTxHash {
		settlementTx = nil
	} else if patch.SettlementTxHash != nil {
		settlementTx = patch.SettlementTxHash
	}
	refundTx := payment.RefundTxHash
	if patch.ClearRefundTxHash {
		refundTx = nil
	} else if patch.RefundTxHash != nil {
		refundTx = patch.RefundTxHash
	}
	txHash := payment.TxHash
	if patch.ClearTxHash {
		txHash = nil
	} else if patch.TxHash != nil {
		txHash = patch.TxHash
	}
	payer := payment.PayerAddress
	if patch.ClearPayerAddress {
		payer = nil
	} else if patch.PayerAddress != nil {
		payer = patch.PayerAddress
	}
	received := payment.ReceivedAmount
	if patch.ClearReceivedAmount {
		received = nil
	} else if patch.ReceivedAmount != nil {
		received = patch.ReceivedAmount
	}
	refundReason := payment.RefundReason
	if patch.ClearRefundReason {
		refundReason = nil
	} else if patch.RefundReason != nil {
		refundReason = *patch.RefundReason
	}
	confirmedAt := payment.ConfirmedAt
	if patch.ConfirmedAt != nil {
		confirmedAt = patch.ConfirmedAt
	}
	expiresAt := payment.ExpiresAt
	if patch.ExpiresAt != nil {
		expiresAt = patch.ExpiresAt
	}

	updated, err := s.scanPayment(s.pool.QueryRow(ctx, `
		UPDATE payments SET
			status = $2::payment_status,
			paid_asset = $3,
			paid_asset_issuer = $4,
			quoted_paid_amount = $5,
			quoted_settlement_amount = $6,
			quote_rate = $7,
			settlement_quote_rate = $8,
			quote_expires_at = $9,
			amount = $10,
			platform_fee_amount = $11,
			merchant_settlement_amount = $12,
			deposit_tx_hash = $13,
			settlement_tx_hash = $14,
			refund_tx_hash = $15,
			tx_hash = $16,
			payer_address = $17,
			received_amount = $18,
			refund_reason = $19,
			confirmed_at = $20,
			metadata = $21::jsonb,
			expires_at = $22,
			updated_at = NOW()
		WHERE id = $1
		RETURNING `+paymentSelect,
		payment.ID, status, paidAsset, paidIssuer, quotedPaid, quotedSettlement,
		quoteRate, settlementQuoteRate, quoteExpires, amount, platformFee, merchantSettlement,
		depositTx, settlementTx, refundTx, txHash, payer, received, refundReason, confirmedAt,
		metaJSON, expiresAt,
	))
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *Service) SetPaidAsset(ctx context.Context, payment *Payment, asset AllowedAsset) (*Payment, error) {
	code := asset.AssetCode
	return s.PatchPayment(ctx, payment, PaymentPatch{
		PaidAsset:       &code,
		PaidAssetIssuer: &asset.IssuerAddress,
	})
}

func (s *Service) ApplyQuote(ctx context.Context, payment *Payment, paidAmount, rate string, expiresAt time.Time, settlementAmount, settlementQuoteRate *string) (*Payment, error) {
	normPaid := normalizeStellarAmount(paidAmount)
	var normSettlement *string
	feeBase := normPaid
	if settlementAmount != nil && *settlementAmount != "" {
		v := normalizeStellarAmount(*settlementAmount)
		normSettlement = &v
		feeBase = v
	}
	fee := calculatePlatformFeeAmount(feeBase)
	merchant := calculateMerchantSettlementAmount(feeBase)
	return s.PatchPayment(ctx, payment, PaymentPatch{
		Amount:                   &normPaid,
		QuotedPaidAmount:         &normPaid,
		QuotedSettlementAmount:   normSettlement,
		QuoteRate:                &rate,
		SettlementQuoteRate:      settlementQuoteRate,
		QuoteExpiresAt:           &expiresAt,
		PlatformFeeAmount:        &fee,
		MerchantSettlementAmount: &merchant,
	})
}

func (s *Service) UpdateStatus(ctx context.Context, payment *Payment, status string, txHash *string, confirmedAt *time.Time, payerAddress *string, paidAsset *AllowedAsset) (*Payment, error) {
	patch := PaymentPatch{Status: &status}
	if txHash != nil {
		patch.TxHash = txHash
	}
	if confirmedAt != nil {
		patch.ConfirmedAt = confirmedAt
	}
	if payerAddress != nil {
		patch.PayerAddress = payerAddress
	}
	if paidAsset != nil {
		code := paidAsset.AssetCode
		patch.PaidAsset = &code
		patch.PaidAssetIssuer = &paidAsset.IssuerAddress
	}
	return s.PatchPayment(ctx, payment, patch)
}

func (s *Service) ClaimSettlementAttempt(ctx context.Context, payment *Payment) (*Payment, error) {
	if payment.SettlementTxHash != nil {
		return nil, nil
	}
	if payment.Status == "refunding" || payment.Status == "refunded" || IsEscrowRefundTerminal(payment) {
		return nil, nil
	}
	return s.scanPayment(s.pool.QueryRow(ctx, `
		UPDATE payments SET status = 'settling'::payment_status, updated_at = NOW()
		WHERE id = $1
		  AND settlement_tx_hash IS NULL
		  AND status::text = ANY($2::text[])
		RETURNING `+paymentSelect,
		payment.ID, []string{"deposit_received", "settlement_failed", "completed"},
	))
}

func (s *Service) ClaimRefundAttempt(ctx context.Context, payment *Payment, reason string) (*Payment, error) {
	meta := payment.Metadata
	if payment.DepositTxHash != nil {
		meta = MarkDepositTxHandled(payment.Metadata, *payment.DepositTxHash)
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}
	updated, err := s.scanPayment(s.pool.QueryRow(ctx, `
		UPDATE payments SET
			status = 'refunding',
			refund_reason = $2,
			metadata = $3::jsonb,
			updated_at = NOW()
		WHERE id = $1
		  AND status NOT IN ('refunding', 'refunded')
		RETURNING `+paymentSelect,
		payment.ID, reason, metaJSON,
	))
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func expectedDepositAmount(payment *Payment) string {
	if payment.QuotedPaidAmount != nil && *payment.QuotedPaidAmount != "" {
		return *payment.QuotedPaidAmount
	}
	return payment.Amount
}

func (s *Service) ResetForRetry(ctx context.Context, payment *Payment) (*Payment, error) {
	meta := payment.Metadata
	if payment.DepositTxHash != nil {
		meta = MarkDepositTxHandled(payment.Metadata, *payment.DepositTxHash)
	}
	pending := "pending"
	return s.PatchPayment(ctx, payment, PaymentPatch{
		Status:                &pending,
		ClearDepositTxHash:    true,
		ClearRefundTxHash:     true,
		ClearRefundReason:     true,
		ClearReceivedAmount:   true,
		ClearSettlementTxHash: true,
		ClearTxHash:           true,
		ClearPayerAddress:     true,
		Metadata:              meta,
	})
}

func FormatRefundReasonForCheckout(reason *string) *string {
	if reason == nil {
		return nil
	}
	var msg string
	switch *reason {
	case "underpay":
		msg = "The amount received was less than required. Your funds were refunded. You can pay again."
	case "wrong_asset":
		msg = "The payment was sent in an unsupported asset. Your funds were refunded."
	case "expired":
		msg = "The payment session expired before settlement. Your funds were refunded."
	case "quote_expired":
		msg = "The rate lock expired before settlement. Your funds were refunded."
	case "no_liquidity":
		msg = "Settlement could not be completed due to insufficient liquidity. Your funds were refunded."
	case "slippage_exceeded":
		msg = "Settlement could not be completed due to price movement. Your funds were refunded."
	case "settle_failed":
		msg = "Settlement could not be completed. Your funds were refunded."
	default:
		msg = "The previous payment attempt was refunded. You can try again."
	}
	return &msg
}

func IsRetryableFailedPayment(payment *Payment) bool {
	if payment.Status == "refunded" {
		if payment.RefundReason != nil && *payment.RefundReason == "expired" {
			return false
		}
		return true
	}
	if payment.Status == "settlement_failed" && payment.SettlementTxHash == nil {
		return payment.RefundReason != nil
	}
	return false
}

func IsPaymentInProgressStatus(status string) bool {
	switch status {
	case "deposit_received", "refunding", "settling":
		return true
	default:
		return false
	}
}

func IsCheckoutProcessingStatus(status string) bool {
	if status == "processing" {
		return true
	}
	return IsPaymentInProgressStatus(status)
}

func IsPaymentSessionExpired(payment *Payment) bool {
	return payment.ExpiresAt != nil && !payment.ExpiresAt.After(time.Now())
}

func MerchantSettlementAmountOf(payment *Payment) string {
	if payment.MerchantSettlementAmount != nil && *payment.MerchantSettlementAmount != "" {
		return *payment.MerchantSettlementAmount
	}
	base := payment.Amount
	if payment.QuotedSettlementAmount != nil && *payment.QuotedSettlementAmount != "" {
		base = *payment.QuotedSettlementAmount
	} else if payment.QuotedPaidAmount != nil && *payment.QuotedPaidAmount != "" {
		base = *payment.QuotedPaidAmount
	}
	return calculateMerchantSettlementAmount(base)
}

func requiresCrossAssetSettlement(payment *Payment) bool {
	if payment.QuotedSettlementAmount == nil || payment.PaidAsset == nil {
		return false
	}
	return !AllowedAssetsEquivalent(PaidAssetOf(payment), SettlementAssetOf(payment), payment.Environment)
}

func isUnderpay(payment *Payment, receivedAmount string) bool {
	return !amountsWithinSlippage(expectedDepositAmount(payment), receivedAmount, 50)
}

func amountsWithinSlippage(expected, actual string, bps int) bool {
	// local copy to avoid pricing import cycles in hot path helpers
	var exp, act float64
	_, err1 := fmt.Sscanf(expected, "%f", &exp)
	_, err2 := fmt.Sscanf(actual, "%f", &act)
	if err1 != nil || err2 != nil {
		return false
	}
	if exp == 0 {
		return act == 0
	}
	diff := (act - exp) / exp
	if diff < 0 {
		diff = -diff
	}
	return diff <= float64(bps)/10_000
}
