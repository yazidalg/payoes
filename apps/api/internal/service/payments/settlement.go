package payments

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/payoesteam/payoes/apps/api/internal/pricing"
	"github.com/payoesteam/payoes/apps/api/internal/stellar"
)

const (
	RefundUnderpay     = "underpay"
	RefundWrongAsset   = "wrong_asset"
	RefundExpired      = "expired"
	RefundQuoteExpired = "quote_expired"
	RefundNoLiquidity  = "no_liquidity"
	RefundSettleFailed = "settle_failed"
)

type ConfirmDepositResult struct {
	OK      bool
	Pending bool
	Status  string
	Error   string
	Payment *Payment
}

type DepositCheckResult struct {
	Detected bool
	Payment  *Payment
}

// RunEscrowSettlementWorker ports the cron entrypoint.
func RunEscrowSettlementWorker(ctx context.Context, svc *Service) (processed int, err error) {
	for _, environment := range []string{"sandbox", "production"} {
		n, detectErr := svc.DetectEscrowDepositsFromHorizon(ctx, environment)
		if detectErr != nil {
			log.Printf("escrow deposit detection (%s): %v", environment, detectErr)
			continue
		}
		processed += n
	}
	n, err := svc.ProcessPendingEscrowSettlements(ctx)
	processed += n
	return processed, err
}

func (s *Service) ProcessPendingEscrowSettlements(ctx context.Context) (int, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+paymentSelect+`
		FROM payments
		WHERE payment_flow = 'escrow'
		  AND status::text = ANY($1::text[])`,
		[]string{"deposit_received", "settling", "settlement_failed", "completed"},
	)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	processed := 0
	for rows.Next() {
		payment, err := s.scanPaymentRow(rows)
		if err != nil {
			return processed, err
		}
		if payment.Status == "completed" && payment.SettlementTxHash != nil {
			continue
		}
		if payment.Status == "refunding" || IsEscrowRefundTerminal(payment) {
			continue
		}
		awaiting := payment.DepositTxHash != nil && payment.ReceivedAmount != nil && payment.SettlementTxHash == nil
		if payment.DepositTxHash != nil && IsDepositTxAlreadyHandled(payment, *payment.DepositTxHash) && !awaiting {
			continue
		}
		if _, err := s.ProcessEscrowSettlement(ctx, payment); err != nil {
			log.Printf("escrow settlement %s: %v", payment.PublicID, err)
			continue
		}
		processed++
	}
	return processed, rows.Err()
}

func (s *Service) ProcessEscrowSettlement(ctx context.Context, payment *Payment) (*Payment, error) {
	if payment.PaymentFlow != "escrow" {
		return payment, nil
	}

	payment, err := s.repairEscrowPaymentIfSettled(ctx, payment)
	if err != nil {
		return nil, err
	}

	if payment.Status == "refunded" || payment.Status == "expired" || IsEscrowRefundTerminal(payment) {
		return payment, nil
	}
	if payment.Status == "refunding" {
		return payment, nil
	}
	if payment.Status == "settling" && payment.SettlementTxHash == nil {
		fresh, err := s.GetByPublicID(ctx, payment.PublicID)
		if err != nil {
			return nil, err
		}
		if fresh != nil {
			return fresh, nil
		}
		return payment, nil
	}
	if payment.Status == "completed" && payment.SettlementTxHash != nil {
		return payment, nil
	}

	awaitingMerchantSettlement := payment.DepositTxHash != nil && payment.ReceivedAmount != nil && payment.SettlementTxHash == nil
	if payment.DepositTxHash != nil && IsDepositTxAlreadyHandled(payment, *payment.DepositTxHash) && !awaitingMerchantSettlement {
		return payment, nil
	}
	if payment.DepositTxHash == nil || payment.PayerAddress == nil || payment.ReceivedAmount == nil {
		return payment, nil
	}

	receivedAsset := PaidAssetOf(payment)
	payerAddress := *payment.PayerAddress
	receivedAmount := *payment.ReceivedAmount

	if isUnderpay(payment, receivedAmount) {
		return s.executeRefund(ctx, payment, RefundUnderpay, receivedAmount, payerAddress, false)
	}
	if IsPaymentSessionExpired(payment) {
		return s.executeRefund(ctx, payment, RefundExpired, receivedAmount, payerAddress, false)
	}
	if payment.QuoteExpiresAt != nil && pricing.IsQuoteExpired(payment.QuoteExpiresAt) {
		return s.executeRefund(ctx, payment, RefundQuoteExpired, receivedAmount, payerAddress, false)
	}

	claimed, err := s.ClaimSettlementAttempt(ctx, payment)
	if err != nil {
		return nil, err
	}
	if claimed == nil {
		fresh, err := s.GetByPublicID(ctx, payment.PublicID)
		if err != nil {
			return nil, err
		}
		if fresh != nil {
			return fresh, nil
		}
		return payment, nil
	}

	escrow, err := stellar.GetEscrowConfig(claimed.Environment)
	if err != nil {
		return s.executeRefund(ctx, claimed, RefundSettleFailed, receivedAmount, payerAddress, true)
	}

	merchantAmount := MerchantSettlementAmountOf(claimed)

	var settlementHash string
	if requiresCrossAssetSettlement(claimed) {
		hash, settleErr := s.settleCrossAsset(claimed, escrow, receivedAsset, receivedAmount, merchantAmount)
		if settleErr != nil {
			reason := RefundSettleFailed
			if isLiquidityError(settleErr) {
				reason = RefundNoLiquidity
			}
			return s.executeRefund(ctx, claimed, reason, receivedAmount, payerAddress, true)
		}
		settlementHash = hash
	} else {
		// Classic escrow deposits land in the operator account. Settle by paying the merchant
		// from the operator wallet. Soroban settle_same_asset_deposit remains stubbed.
		memo := claimed.Memo
		hash, settleErr := stellar.SignAndSubmitPayment(
			escrow.Keypair,
			claimed.ReceivingAddress,
			merchantAmount,
			stellar.PaymentAsset{AssetCode: receivedAsset.AssetCode, IssuerAddress: receivedAsset.IssuerAddress},
			claimed.Environment,
			memo,
		)
		if settleErr != nil {
			latest, _ := s.GetByPublicID(ctx, payment.PublicID)
			if latest != nil && latest.SettlementTxHash != nil {
				return s.markCompletedFromSettlement(ctx, latest)
			}
			return s.executeRefund(ctx, claimed, RefundSettleFailed, receivedAmount, payerAddress, true)
		}
		settlementHash = hash
	}

	completed := claimed
	if claimed.Status != "completed" {
		now := time.Now()
		tx := claimed.DepositTxHash
		if tx == nil {
			tx = claimed.TxHash
		}
		asset := receivedAsset
		updated, err := s.UpdateStatus(ctx, claimed, "completed", tx, &now, &payerAddress, &asset)
		if err != nil {
			return nil, err
		}
		completed = updated
	}

	finalized, err := s.PatchPayment(ctx, completed, PaymentPatch{
		SettlementTxHash: &settlementHash,
		TxHash:           &settlementHash,
	})
	if err != nil {
		return nil, err
	}

	_ = s.dispatchPaymentEvent(ctx, finalized, "payment.completed")
	return finalized, nil
}

func (s *Service) settleCrossAsset(
	settling *Payment,
	escrow *stellar.EscrowConfig,
	receivedAsset AllowedAsset,
	receivedAmount string,
	merchantAmount string,
) (string, error) {
	// Path payments are not fully ported yet: attempt same-asset settlement asset payout
	// when the operator already holds the settlement asset (common for stablecoin pairs).
	settlementAsset := SettlementAssetOf(settling)
	memo := settling.Memo
	hash, err := stellar.SignAndSubmitPayment(
		escrow.Keypair,
		settling.ReceivingAddress,
		merchantAmount,
		stellar.PaymentAsset{AssetCode: settlementAsset.AssetCode, IssuerAddress: settlementAsset.IssuerAddress},
		settling.Environment,
		memo,
	)
	if err != nil {
		_ = receivedAsset
		_ = receivedAmount
		return "", err
	}
	return hash, nil
}

func isLiquidityError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "liquidity") || strings.Contains(msg, "op_under")
}

func (s *Service) repairEscrowPaymentIfSettled(ctx context.Context, payment *Payment) (*Payment, error) {
	if payment.Status != "settlement_failed" || payment.SettlementTxHash == nil {
		return payment, nil
	}
	completed := "completed"
	repaired, err := s.PatchPayment(ctx, payment, PaymentPatch{
		Status:            &completed,
		ClearRefundReason: true,
		TxHash:            payment.SettlementTxHash,
	})
	if err != nil {
		return nil, err
	}
	_ = s.dispatchPaymentEvent(ctx, repaired, "payment.completed")
	return repaired, nil
}

func (s *Service) markCompletedFromSettlement(ctx context.Context, payment *Payment) (*Payment, error) {
	completed := "completed"
	repaired, err := s.PatchPayment(ctx, payment, PaymentPatch{
		Status:            &completed,
		ClearRefundReason: true,
		TxHash:            payment.SettlementTxHash,
	})
	if err != nil {
		return nil, err
	}
	_ = s.dispatchPaymentEvent(ctx, repaired, "payment.completed")
	return repaired, nil
}

func (s *Service) executeRefund(
	ctx context.Context,
	payment *Payment,
	reason string,
	amount string,
	payerAddress string,
	depositHeld bool,
) (*Payment, error) {
	_ = depositHeld
	if IsEscrowRefundTerminal(payment) {
		return payment, nil
	}
	if payment.RefundTxHash != nil {
		if payment.Status != "refunded" {
			refunded := "refunded"
			return s.PatchPayment(ctx, payment, PaymentPatch{Status: &refunded})
		}
		return payment, nil
	}
	if payment.DepositTxHash != nil && IsDepositTxAlreadyHandled(payment, *payment.DepositTxHash) {
		return payment, nil
	}

	refunding, err := s.ClaimRefundAttempt(ctx, payment, reason)
	if err != nil || refunding == nil {
		return payment, err
	}

	escrow, err := stellar.GetEscrowConfig(payment.Environment)
	if err != nil {
		failed := "settlement_failed"
		reasonCopy := reason
		reasonPtr := &reasonCopy
		_, _ = s.PatchPayment(ctx, refunding, PaymentPatch{Status: &failed, RefundReason: &reasonPtr})
		_ = s.dispatchPaymentEvent(ctx, refunding, "payment.settlement_failed")
		return refunding, nil
	}

	asset := PaidAssetOf(refunding)
	memo := "refund:" + payment.PublicID
	if len(memo) > stellar.MemoMaxLength {
		memo = memo[:stellar.MemoMaxLength]
	}
	memoPtr := memo
	hash, submitErr := stellar.SignAndSubmitPayment(
		escrow.Keypair,
		payerAddress,
		amount,
		stellar.PaymentAsset{AssetCode: asset.AssetCode, IssuerAddress: asset.IssuerAddress},
		payment.Environment,
		&memoPtr,
	)
	if submitErr != nil {
		latest, _ := s.GetByPublicID(ctx, payment.PublicID)
		if latest != nil && latest.SettlementTxHash != nil {
			return s.markCompletedFromSettlement(ctx, latest)
		}
		failed := "settlement_failed"
		reasonCopy := reason
		reasonPtr := &reasonCopy
		_, _ = s.PatchPayment(ctx, refunding, PaymentPatch{Status: &failed, RefundReason: &reasonPtr})
		_ = s.dispatchPaymentEvent(ctx, refunding, "payment.settlement_failed")
		return refunding, nil
	}

	refunded := "refunded"
	updated, err := s.PatchPayment(ctx, refunding, PaymentPatch{
		Status:       &refunded,
		RefundTxHash: &hash,
		TxHash:       &hash,
	})
	if err != nil {
		return nil, err
	}
	_ = s.dispatchPaymentEvent(ctx, updated, "payment.refunded")
	return updated, nil
}

func (s *Service) dispatchPaymentEvent(ctx context.Context, payment *Payment, event string) error {
	if s.settlementDeps.Webhooks == nil {
		return nil
	}
	serialized, err := s.Serialize(ctx, payment, s.settlementDeps.CheckoutBaseURL)
	if err != nil {
		return err
	}
	return s.settlementDeps.Webhooks.DispatchEvent(ctx, payment.OrganizationID, payment.Environment, event, serialized)
}

func (s *Service) BuildEscrowClassicDepositTransaction(
	ctx context.Context,
	payment *Payment,
	payerAddress string,
	amount string,
	paidAsset AllowedAsset,
) (string, error) {
	if payment.DepositAddress == nil || *payment.DepositAddress == "" {
		return "", fmt.Errorf("Escrow deposit address is not configured for this payment")
	}
	deposit := *payment.DepositAddress
	var memo *string
	if !strings.HasPrefix(deposit, "M") {
		m := payment.PublicID
		if payment.Memo != nil && *payment.Memo != "" {
			m = *payment.Memo
		}
		memo = &m
	}
	return stellar.BuildPaymentTransactionXDR(stellar.BuildPaymentInput{
		SourcePublicKey:      payerAddress,
		DestinationPublicKey: deposit,
		Amount:               amount,
		Asset:                stellar.PaymentAsset{AssetCode: paidAsset.AssetCode, IssuerAddress: paidAsset.IssuerAddress},
		Environment:          payment.Environment,
		Memo:                 memo,
	})
}

func (s *Service) SubmitClassicEscrowDeposit(payment *Payment, signedXDR string) (string, error) {
	return stellar.SubmitSignedXDR(signedXDR, payment.Environment)
}

func (s *Service) SubmitSorobanEscrowDeposit(payment *Payment, signedXDR string) (string, error) {
	if !stellar.IsSorobanConfigured(payment.Environment) {
		return "", fmt.Errorf("Soroban is not configured for this environment")
	}
	return stellar.SubmitSorobanSignedXDR(payment.Environment, signedXDR)
}

func (s *Service) ConfirmClassicEscrowDeposit(ctx context.Context, payment *Payment, txHash string) (ConfirmDepositResult, error) {
	fresh, err := s.GetByPublicID(ctx, payment.PublicID)
	if err != nil {
		return ConfirmDepositResult{}, err
	}
	if fresh == nil {
		fresh = payment
	}

	if fresh.Status == "completed" {
		return ConfirmDepositResult{OK: true, Payment: fresh}, nil
	}
	if fresh.Status == "refunded" {
		return ConfirmDepositResult{OK: false, Error: "Payment was refunded.", Payment: fresh}, nil
	}

	const maxAttempts = 8
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			time.Sleep(2 * time.Second)
			fresh, err = s.GetByPublicID(ctx, payment.PublicID)
			if err != nil {
				return ConfirmDepositResult{}, err
			}
			if fresh == nil {
				fresh = payment
			}
			if fresh.Status == "completed" {
				return ConfirmDepositResult{OK: true, Payment: fresh}, nil
			}
			if fresh.Status == "refunded" {
				return ConfirmDepositResult{OK: false, Error: "Payment was refunded.", Payment: fresh}, nil
			}
		}

		relayed, err := s.relayManualEscrowDeposit(ctx, fresh, txHash)
		if err != nil {
			log.Printf("relay escrow deposit %s: %v", fresh.PublicID, err)
		}
		fresh, _ = s.GetByPublicID(ctx, payment.PublicID)
		if fresh == nil {
			fresh = payment
		}
		if fresh.Status == "completed" {
			return ConfirmDepositResult{OK: true, Payment: fresh}, nil
		}
		if relayed {
			if fresh.Status == "refunded" {
				return ConfirmDepositResult{OK: false, Error: "Payment was refunded.", Payment: fresh}, nil
			}
			return ConfirmDepositResult{OK: false, Pending: true, Status: fresh.Status, Payment: fresh}, nil
		}
		if fresh.Status == "deposit_received" || fresh.Status == "settlement_failed" {
			settled, err := s.ProcessEscrowSettlement(ctx, fresh)
			if err != nil {
				return ConfirmDepositResult{}, err
			}
			fresh = settled
			if fresh.Status == "completed" {
				return ConfirmDepositResult{OK: true, Payment: fresh}, nil
			}
			if fresh.Status == "refunded" {
				return ConfirmDepositResult{OK: false, Error: "Payment was refunded.", Payment: fresh}, nil
			}
			return ConfirmDepositResult{OK: false, Pending: true, Status: fresh.Status, Payment: fresh}, nil
		}
		if fresh.Status == "settling" || fresh.Status == "refunding" {
			return ConfirmDepositResult{OK: false, Pending: true, Status: fresh.Status, Payment: fresh}, nil
		}
	}

	fresh, _ = s.GetByPublicID(ctx, payment.PublicID)
	if fresh == nil {
		fresh = payment
	}
	if fresh.Status == "completed" {
		return ConfirmDepositResult{OK: true, Payment: fresh}, nil
	}
	return ConfirmDepositResult{
		OK:      false,
		Pending: true,
		Status:  fresh.Status,
		Payment: fresh,
		Error:   "Deposit not detected yet. Try again in a moment.",
	}, nil
}

func (s *Service) DetectEscrowDepositForPayment(ctx context.Context, payment *Payment) (DepositCheckResult, error) {
	fresh, err := s.GetByPublicID(ctx, payment.PublicID)
	if err != nil {
		return DepositCheckResult{}, err
	}
	if fresh == nil {
		fresh = payment
	}

	if fresh.Status == "completed" || fresh.Status == "refunded" || fresh.Status == "refunding" {
		return DepositCheckResult{Detected: true, Payment: fresh}, nil
	}
	if fresh.Status == "deposit_received" || fresh.Status == "settlement_failed" {
		updated, err := s.ProcessEscrowSettlement(ctx, fresh)
		if err != nil {
			return DepositCheckResult{}, err
		}
		fresh = updated
		detected := fresh.Status == "completed" || fresh.Status == "refunded" || fresh.Status == "refunding" ||
			IsPaymentInProgressStatus(fresh.Status) || fresh.Status != payment.Status
		return DepositCheckResult{Detected: detected, Payment: fresh}, nil
	}
	if fresh.Status == "settling" {
		return DepositCheckResult{Detected: true, Payment: fresh}, nil
	}
	if fresh.PaymentFlow != "escrow" || fresh.DepositAddress == nil || fresh.Status != "pending" {
		return DepositCheckResult{Detected: false, Payment: fresh}, nil
	}

	escrow, err := stellar.GetEscrowConfig(fresh.Environment)
	if err != nil {
		return DepositCheckResult{Detected: false, Payment: fresh}, nil
	}
	records, err := stellar.ListRecentPaymentsForAccount(escrow.PublicKey, fresh.Environment, 50)
	if err != nil {
		return DepositCheckResult{}, err
	}
	for _, record := range records {
		if record.Type != "payment" {
			continue
		}
		destination := record.To
		if record.ToMuxed != "" {
			destination = record.ToMuxed
		}
		if destination != *fresh.DepositAddress {
			continue
		}
		ok, err := s.relayManualEscrowDeposit(ctx, fresh, record.TxHash)
		if err != nil {
			log.Printf("detect deposit relay %s: %v", fresh.PublicID, err)
			continue
		}
		if ok {
			updated, _ := s.GetByPublicID(ctx, fresh.PublicID)
			if updated == nil {
				updated = fresh
			}
			return DepositCheckResult{Detected: true, Payment: updated}, nil
		}
	}
	updated, _ := s.GetByPublicID(ctx, fresh.PublicID)
	if updated == nil {
		updated = fresh
	}
	if updated.Status != fresh.Status {
		detected := updated.Status == "completed" || updated.Status == "refunded" || IsPaymentInProgressStatus(updated.Status)
		return DepositCheckResult{Detected: detected, Payment: updated}, nil
	}
	return DepositCheckResult{Detected: false, Payment: updated}, nil
}

func (s *Service) DetectEscrowDepositsFromHorizon(ctx context.Context, environment string) (int, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+paymentSelect+`
		FROM payments
		WHERE environment = $1
		  AND payment_flow = 'escrow'
		  AND status = 'pending'
		  AND deposit_address IS NOT NULL`, environment)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	pending := map[string]*Payment{}
	for rows.Next() {
		p, err := s.scanPaymentRow(rows)
		if err != nil {
			return 0, err
		}
		if p.DepositAddress != nil {
			pending[*p.DepositAddress] = p
		}
	}
	if len(pending) == 0 {
		return 0, rows.Err()
	}

	escrow, err := stellar.GetEscrowConfig(environment)
	if err != nil {
		return 0, nil
	}
	records, err := stellar.ListRecentPaymentsForAccount(escrow.PublicKey, environment, 200)
	if err != nil {
		return 0, err
	}
	processed := 0
	for _, record := range records {
		if record.Type != "payment" {
			continue
		}
		destination := record.To
		if record.ToMuxed != "" {
			destination = record.ToMuxed
		}
		payment, ok := pending[destination]
		if !ok {
			continue
		}
		okRelay, err := s.relayManualEscrowDeposit(ctx, payment, record.TxHash)
		if err != nil {
			continue
		}
		if okRelay {
			processed++
		}
	}
	return processed, nil
}

func (s *Service) relayManualEscrowDeposit(ctx context.Context, payment *Payment, txHash string) (bool, error) {
	if payment.DepositAddress == nil {
		return false, nil
	}
	var memo *string
	if !strings.HasPrefix(*payment.DepositAddress, "M") {
		m := payment.PublicID
		if payment.Memo != nil && *payment.Memo != "" {
			m = *payment.Memo
		}
		memo = &m
	}
	inbound, err := stellar.VerifyEscrowDepositByMemo(txHash, *payment.DepositAddress, payment.Environment, memo)
	if err != nil {
		return false, err
	}
	if !inbound.Valid {
		return false, nil
	}

	if payment.DepositTxHash != nil && *payment.DepositTxHash == txHash &&
		(payment.Status == "deposit_received" || payment.Status == "settlement_failed") {
		result, err := s.ProcessEscrowSettlement(ctx, payment)
		if err != nil {
			return false, err
		}
		return result.Status == "refunded" || result.Status == "completed", nil
	}
	if payment.Status == "settling" || payment.Status == "refunding" {
		return false, nil
	}
	if IsDepositTxAlreadyHandled(payment, txHash) {
		return false, nil
	}

	active := payment
	paid := AllowedAsset{AssetCode: inbound.PaidAsset.AssetCode, IssuerAddress: inbound.PaidAsset.IssuerAddress}
	allowed := FindAllowedAsset(active.AllowedAssets, paid.AssetCode, paid.IssuerAddress, active.Environment)
	if allowed == nil {
		refunded, err := s.refundManualEscrowDeposit(ctx, active, txHash, inbound.PayerAddress, inbound.ReceivedAmount, paid, RefundWrongAsset)
		if err != nil {
			return false, err
		}
		return refunded.Status == "refunded", nil
	}

	selectedPaid := (*AllowedAsset)(nil)
	if active.PaidAsset != nil {
		a := AllowedAsset{AssetCode: *active.PaidAsset, IssuerAddress: active.PaidAssetIssuer}
		selectedPaid = &a
	}
	depositMatches := selectedPaid != nil && AllowedAssetsEquivalent(*selectedPaid, paid, active.Environment)

	if active.PricingCurrency != nil && active.PricingAmount != nil && NeedsPaymentQuoteRefresh(active, *allowed) {
		refreshed, _, err := s.RefreshPaymentQuote(ctx, active, *allowed, 0)
		if err != nil {
			return false, err
		}
		active = refreshed
	} else if selectedPaid == nil || !depositMatches {
		updated, err := s.SetPaidAsset(ctx, active, *allowed)
		if err != nil {
			return false, err
		}
		active = updated
	}

	if isUnderpay(active, inbound.ReceivedAmount) {
		refunded, err := s.refundManualEscrowDeposit(ctx, active, txHash, inbound.PayerAddress, inbound.ReceivedAmount, paid, RefundUnderpay)
		if err != nil {
			return false, err
		}
		return refunded.Status == "refunded", nil
	}

	deposited, err := s.recordManualEscrowDeposit(ctx, active, txHash, inbound.PayerAddress, inbound.ReceivedAmount, paid)
	if err != nil {
		return false, err
	}
	withHandled, err := s.PatchPayment(ctx, deposited, PaymentPatch{
		Metadata: MarkDepositTxHandled(deposited.Metadata, txHash),
	})
	if err != nil {
		return false, err
	}
	settled, err := s.ProcessEscrowSettlement(ctx, withHandled)
	if err != nil {
		return false, err
	}
	return settled.Status == "completed", nil
}

func (s *Service) recordManualEscrowDeposit(
	ctx context.Context,
	payment *Payment,
	txHash, payerAddress, receivedAmount string,
	paid AllowedAsset,
) (*Payment, error) {
	status := "deposit_received"
	code := paid.AssetCode
	return s.PatchPayment(ctx, payment, PaymentPatch{
		Status:          &status,
		DepositTxHash:   &txHash,
		PayerAddress:    &payerAddress,
		ReceivedAmount:  &receivedAmount,
		PaidAsset:       &code,
		PaidAssetIssuer: &paid.IssuerAddress,
	})
}

func (s *Service) refundManualEscrowDeposit(
	ctx context.Context,
	payment *Payment,
	txHash, payerAddress, receivedAmount string,
	receivedAsset AllowedAsset,
	reason string,
) (*Payment, error) {
	if payment.RefundTxHash != nil || IsEscrowRefundTerminal(payment) || IsDepositTxAlreadyHandled(payment, txHash) {
		return payment, nil
	}
	deposited, err := s.recordManualEscrowDeposit(ctx, payment, txHash, payerAddress, receivedAmount, receivedAsset)
	if err != nil {
		return nil, err
	}
	withHandled, err := s.PatchPayment(ctx, deposited, PaymentPatch{
		Metadata: MarkDepositTxHandled(deposited.Metadata, txHash),
	})
	if err != nil {
		return nil, err
	}
	return s.executeRefund(ctx, withHandled, reason, receivedAmount, payerAddress, false)
}

func (s *Service) ConfirmEscrowContractDeposit(ctx context.Context, payment *Payment, txHash, payerAddress, amount string) (recorded bool, status string, updated *Payment, err error) {
	rpcStatus, err := stellar.GetSorobanTransactionStatus(payment.Environment, txHash)
	if err != nil {
		return false, "", nil, err
	}
	if rpcStatus != "SUCCESS" {
		return false, rpcStatus, payment, nil
	}
	asset := PaidAssetOf(payment)
	now := time.Now()
	statusDeposit := "deposit_received"
	code := asset.AssetCode
	updated, err = s.PatchPayment(ctx, payment, PaymentPatch{
		Status:          &statusDeposit,
		DepositTxHash:   &txHash,
		TxHash:          &txHash,
		PayerAddress:    &payerAddress,
		ReceivedAmount:  &amount,
		PaidAsset:       &code,
		PaidAssetIssuer: &asset.IssuerAddress,
		ConfirmedAt:     &now,
	})
	if err != nil {
		return false, "", nil, err
	}
	return true, "SUCCESS", updated, nil
}
