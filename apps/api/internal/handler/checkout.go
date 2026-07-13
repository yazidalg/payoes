package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/payoesteam/payoes/apps/api/internal/config"
	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	checkoutsessions "github.com/payoesteam/payoes/apps/api/internal/service/checkoutsessions"
	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
)

// CheckoutHandler ports apps/web/src/app/api/checkout/*
type CheckoutHandler struct {
	pool     *pgxpool.Pool
	payments *paymentsvc.Service
	sessions *checkoutsessions.Service
	cfg      config.Config
}

func NewCheckoutHandler(pool *pgxpool.Pool, payments *paymentsvc.Service, sessions *checkoutsessions.Service, cfg config.Config) *CheckoutHandler {
	return &CheckoutHandler{pool: pool, payments: payments, sessions: sessions, cfg: cfg}
}

func deprecatedPaymentFlowResponse(w http.ResponseWriter) {
	httpx.JSON(w, http.StatusGone, map[string]any{
		"error": "This payment uses a deprecated flow. Create a new payment to continue.",
		"code":  "deprecated_payment_flow",
	})
}

func (h *CheckoutHandler) resolvePayment(ctx context.Context, checkoutID string) (*paymentsvc.Payment, error) {
	resolved, err := h.sessions.ResolvePaymentForHostedCheckout(ctx, checkoutID)
	if err != nil {
		return nil, err
	}
	if resolved == nil {
		return nil, nil
	}
	return resolved.Payment, nil
}

// Get ports GET /api/checkout/{paymentId}
func (h *CheckoutHandler) Get(w http.ResponseWriter, r *http.Request) {
	paymentID := chi.URLParam(r, "paymentId")
	payment, err := h.resolvePayment(r.Context(), paymentID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment")
		return
	}
	if payment == nil {
		httpx.Error(w, http.StatusNotFound, "Payment not found")
		return
	}

	var lastAttemptError any
	if paymentsvc.IsRetryableFailedPayment(payment) {
		if msg := paymentsvc.FormatRefundReasonForCheckout(payment.RefundReason); msg != nil {
			lastAttemptError = *msg
		}
	}

	payable, err := h.payments.EnsurePayablePayment(r.Context(), payment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment")
		return
	}
	payment = payable.Payment

	var merchant struct {
		Name         string  `json:"name"`
		LogoURL      *string `json:"logoUrl"`
		LogoInitials string  `json:"logoInitials"`
	}
	_ = h.pool.QueryRow(r.Context(), `
		SELECT name, logo_url, logo_initials FROM organizations WHERE id = $1`, payment.OrganizationID,
	).Scan(&merchant.Name, &merchant.LogoURL, &merchant.LogoInitials)

	amount := payment.Amount
	if payment.QuotedPaidAmount != nil && *payment.QuotedPaidAmount != "" {
		amount = *payment.QuotedPaidAmount
	}

	var paidAsset any
	if payment.PaidAsset != nil {
		paidAsset = map[string]any{
			"asset_code":     payment.PaidAsset,
			"issuer_address": payment.PaidAssetIssuer,
		}
	}

	var sessionError any
	if payment.Status != "completed" && payable.Error != "" {
		sessionError = payable.Error
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"payment": map[string]any{
			"id":     payment.PublicID,
			"amount": amount,
			"settlement_asset": map[string]any{
				"asset_code":     payment.SettlementAsset,
				"issuer_address": payment.SettlementAssetIssuer,
			},
			"allowed_assets":           payment.AllowedAssets,
			"paid_asset":               paidAsset,
			"status":                   payment.Status,
			"session_error":            sessionError,
			"last_attempt_error":       lastAttemptError,
			"description":              payment.Description,
			"environment":              payment.Environment,
			"expires_at":               payment.ExpiresAt,
			"quote_expires_at":         payment.QuoteExpiresAt,
			"pricing_currency":         payment.PricingCurrency,
			"pricing_amount":           payment.PricingAmount,
			"quoted_paid_amount":       payment.QuotedPaidAmount,
			"quoted_settlement_amount": payment.QuotedSettlementAmount,
			"quote_rate":               payment.QuoteRate,
			"settlement_quote_rate":    payment.SettlementQuoteRate,
			"source_type":              payment.SourceType,
			"payment_flow":             payment.PaymentFlow,
			"receiving_address":        payment.ReceivingAddress,
			"deposit_address":          payment.DepositAddress,
			"memo":                     payment.Memo,
		},
		"items":               []any{},
		"merchant":            merchant,
		"invoice":             nil,
		"customer_collection": nil,
	})
}

// Post ports POST /api/checkout/{paymentId}
func (h *CheckoutHandler) Post(w http.ResponseWriter, r *http.Request) {
	paymentID := chi.URLParam(r, "paymentId")
	payment, err := h.resolvePayment(r.Context(), paymentID)
	if err != nil || payment == nil {
		httpx.Error(w, http.StatusNotFound, "Payment not found")
		return
	}

	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	defer r.Body.Close()

	action, _ := body["action"].(string)
	action = strings.TrimSpace(action)

	if action == "check_deposit" {
		h.handleCheckDeposit(w, r, payment, body)
		return
	}

	payable, err := h.payments.EnsurePayablePayment(r.Context(), payment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment")
		return
	}
	if payable.Error != "" {
		httpx.Error(w, http.StatusGone, payable.Error)
		return
	}
	payment = payable.Payment

	switch action {
	case "confirm_classic_deposit":
		h.handleConfirmClassicDeposit(w, r, payment, body)
	case "confirm_escrow_contract":
		h.handleConfirmEscrowContract(w, r, payment, body)
	case "submit_classic":
		h.handleSubmitClassic(w, r, payment, body)
	case "submit_soroban":
		h.handleSubmitSoroban(w, r, payment, body)
	case "build_transaction":
		h.handleBuildTransaction(w, r, payment, body)
	case "refresh_quote":
		h.handleRefreshQuote(w, r, payment, body)
	case "confirm_payment":
		if payment.PaymentFlow != "escrow" {
			deprecatedPaymentFlowResponse(w)
			return
		}
		httpx.JSON(w, http.StatusGone, map[string]any{
			"error": "Use confirm_escrow_contract after submitting a Soroban escrow deposit transaction.",
			"code":  "deprecated_confirmation_flow",
		})
	case "":
		httpx.Error(w, http.StatusBadRequest, "action is required")
	default:
		// Legacy confirm body { txHash } without action
		if txHash, ok := body["txHash"].(string); ok && strings.TrimSpace(txHash) != "" {
			if payment.PaymentFlow != "escrow" {
				deprecatedPaymentFlowResponse(w)
				return
			}
			httpx.JSON(w, http.StatusGone, map[string]any{
				"error": "Use confirm_escrow_contract after submitting a Soroban escrow deposit transaction.",
				"code":  "deprecated_confirmation_flow",
			})
			return
		}
		httpx.Error(w, http.StatusBadRequest, "Unknown action")
	}
}

func (h *CheckoutHandler) handleCheckDeposit(w http.ResponseWriter, r *http.Request, payment *paymentsvc.Payment, body map[string]any) {
	if payment.PaymentFlow != "escrow" {
		deprecatedPaymentFlowResponse(w)
		return
	}
	if payment.Status == "completed" {
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "completed", "detected": true})
		return
	}

	txHash := ""
	if v, ok := body["tx_hash"].(string); ok {
		txHash = strings.TrimSpace(v)
	}

	if txHash != "" {
		confirmed, err := h.payments.ConfirmClassicEscrowDeposit(r.Context(), payment, txHash)
		if err != nil {
			httpx.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		if confirmed.OK {
			httpx.JSON(w, http.StatusOK, map[string]any{
				"status":   "completed",
				"detected": true,
				"tx_hash":  confirmed.Payment.TxHash,
			})
			return
		}
		if confirmed.Pending {
			latest := confirmed.Payment
			if latest.Status == "completed" {
				httpx.JSON(w, http.StatusOK, map[string]any{
					"status":   "completed",
					"detected": true,
					"tx_hash":  latest.TxHash,
				})
				return
			}
			httpx.JSON(w, http.StatusAccepted, map[string]any{
				"status":   latest.Status,
				"detected": true,
				"phase":    "processing",
			})
			return
		}
	}

	result, err := h.payments.DetectEscrowDepositForPayment(r.Context(), payment)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	p := result.Payment
	if p.Status == "completed" {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"status":   "completed",
			"detected": true,
			"tx_hash":  p.TxHash,
		})
		return
	}
	if p.Status == "refunded" {
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "refunded", "detected": true})
		return
	}
	if paymentsvc.IsPaymentInProgressStatus(p.Status) {
		httpx.JSON(w, http.StatusAccepted, map[string]any{
			"status":   p.Status,
			"detected": true,
			"phase":    "processing",
		})
		return
	}
	if p.Status == "settlement_failed" {
		httpx.JSON(w, http.StatusConflict, map[string]any{
			"status":   "settlement_failed",
			"detected": true,
			"error":    "Settlement could not be completed. Please contact the merchant if your funds were not returned.",
		})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"status":   p.Status,
		"detected": result.Detected,
	})
}

func (h *CheckoutHandler) handleConfirmClassicDeposit(w http.ResponseWriter, r *http.Request, payment *paymentsvc.Payment, body map[string]any) {
	txHash, _ := body["txHash"].(string)
	txHash = strings.TrimSpace(txHash)
	if txHash == "" || payment.PaymentFlow != "escrow" {
		deprecatedPaymentFlowResponse(w)
		return
	}
	result, err := h.payments.ConfirmClassicEscrowDeposit(r.Context(), payment, txHash)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	if result.OK {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"status":  result.Payment.Status,
			"tx_hash": result.Payment.TxHash,
		})
		return
	}
	if result.Pending {
		msg := result.Error
		if msg == "" {
			msg = "Deposit is still processing."
		}
		httpx.JSON(w, http.StatusAccepted, map[string]any{
			"status": result.Status,
			"error":  msg,
		})
		return
	}
	msg := result.Error
	if msg == "" {
		msg = "Unable to confirm deposit"
	}
	httpx.Error(w, http.StatusBadRequest, msg)
}

func (h *CheckoutHandler) handleConfirmEscrowContract(w http.ResponseWriter, r *http.Request, payment *paymentsvc.Payment, body map[string]any) {
	txHash, _ := body["txHash"].(string)
	payer, _ := body["payerAddress"].(string)
	txHash = strings.TrimSpace(txHash)
	payer = strings.TrimSpace(payer)
	if txHash == "" || payer == "" || payment.PaymentFlow != "escrow" {
		deprecatedPaymentFlowResponse(w)
		return
	}
	amount := payment.Amount
	if payment.QuotedPaidAmount != nil && *payment.QuotedPaidAmount != "" {
		amount = *payment.QuotedPaidAmount
	}
	recorded, status, updated, err := h.payments.ConfirmEscrowContractDeposit(r.Context(), payment, txHash, payer, amount)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	if !recorded {
		httpx.JSON(w, http.StatusAccepted, map[string]any{"status": status})
		return
	}
	settled, err := h.payments.ProcessEscrowSettlement(r.Context(), updated)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"status":  settled.Status,
		"tx_hash": settled.TxHash,
	})
}

func (h *CheckoutHandler) handleSubmitClassic(w http.ResponseWriter, r *http.Request, payment *paymentsvc.Payment, body map[string]any) {
	signedXDR, _ := body["signedXdr"].(string)
	signedXDR = strings.TrimSpace(signedXDR)
	if signedXDR == "" || payment.PaymentFlow != "escrow" {
		deprecatedPaymentFlowResponse(w)
		return
	}
	hash, err := h.payments.SubmitClassicEscrowDeposit(payment, signedXDR)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"tx_hash": hash, "status": "processing"})
}

func (h *CheckoutHandler) handleSubmitSoroban(w http.ResponseWriter, r *http.Request, payment *paymentsvc.Payment, body map[string]any) {
	signedXDR, _ := body["signedXdr"].(string)
	signedXDR = strings.TrimSpace(signedXDR)
	if signedXDR == "" || payment.PaymentFlow != "escrow" {
		deprecatedPaymentFlowResponse(w)
		return
	}
	hash, err := h.payments.SubmitSorobanEscrowDeposit(payment, signedXDR)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"tx_hash": hash, "status": "processing"})
}

func (h *CheckoutHandler) handleBuildTransaction(w http.ResponseWriter, r *http.Request, payment *paymentsvc.Payment, body map[string]any) {
	sourcePublicKey, _ := body["sourcePublicKey"].(string)
	sourcePublicKey = strings.TrimSpace(sourcePublicKey)
	paidAssetRaw, _ := body["paid_asset"].(map[string]any)
	if sourcePublicKey == "" || paidAssetRaw == nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if payment.PaymentFlow != "escrow" {
		deprecatedPaymentFlowResponse(w)
		return
	}

	assetCode, _ := paidAssetRaw["asset_code"].(string)
	assetCode = strings.TrimSpace(assetCode)
	var issuer *string
	if v, ok := paidAssetRaw["issuer_address"].(string); ok {
		t := strings.TrimSpace(v)
		if t != "" {
			issuer = &t
		}
	}
	if assetCode == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	match := paymentsvc.FindAllowedAsset(payment.AllowedAssets, assetCode, issuer, payment.Environment)
	if match == nil {
		httpx.Error(w, http.StatusBadRequest, "Selected asset is not allowed for this payment")
		return
	}
	canonical := paymentsvc.ResolveAllowedAsset(*match, payment.Environment)
	active := payment
	quoteRefreshHandled := false

	if payment.PricingCurrency != nil && payment.PricingAmount != nil &&
		paymentsvc.NeedsPaymentQuoteRefresh(payment, canonical) {
		refreshed, _, err := h.payments.RefreshPaymentQuote(r.Context(), payment, canonical, h.cfg.InvoiceQuoteTTLMinutes)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		active = refreshed
		quoteRefreshHandled = true
	} else {
		updated, err := h.payments.SetPaidAsset(r.Context(), payment, canonical)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to update payment")
			return
		}
		active = updated
	}

	if active.PricingCurrency != nil && active.PricingAmount != nil {
		if active.QuotedPaidAmount == nil || *active.QuotedPaidAmount == "" {
			httpx.Error(w, http.StatusBadRequest, "Payment quote is missing. Try again in a moment.")
			return
		}
	}

	depositAmount := active.Amount
	if active.QuotedPaidAmount != nil && *active.QuotedPaidAmount != "" {
		depositAmount = *active.QuotedPaidAmount
	}

	// Classic checkout deposits do not require Soroban register_payment.
	// Operator trustlines are synced so the escrow wallet can receive the asset.
	if !quoteRefreshHandled {
		_ = paymentsvc.SyncEscrowOperatorTrustlines(active.Environment, active.AllowedAssets)
	}

	xdrStr, err := h.payments.BuildEscrowClassicDepositTransaction(r.Context(), active, sourcePublicKey, depositAmount, canonical)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"xdr":          xdrStr,
		"payment_type": "escrow_classic_deposit",
	})
}

func (h *CheckoutHandler) handleRefreshQuote(w http.ResponseWriter, r *http.Request, payment *paymentsvc.Payment, body map[string]any) {
	paidAssetRaw, _ := body["paid_asset"].(map[string]any)
	if paidAssetRaw == nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid paid asset")
		return
	}
	assetCode, _ := paidAssetRaw["asset_code"].(string)
	assetCode = strings.TrimSpace(assetCode)
	var issuer *string
	if v, ok := paidAssetRaw["issuer_address"].(string); ok {
		t := strings.TrimSpace(v)
		if t != "" {
			issuer = &t
		}
	}
	asset := paymentsvc.AllowedAsset{AssetCode: assetCode, IssuerAddress: issuer}
	updated, quote, err := h.payments.RefreshPaymentQuote(r.Context(), payment, asset, h.cfg.InvoiceQuoteTTLMinutes)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"pricing_amount":         quote.PricingAmount,
		"pricing_currency":       quote.PricingCurrency,
		"paid_asset":             quote.PaidAsset,
		"paid_amount":            quote.PaidAmount,
		"settlement_asset":       quote.SettlementAsset,
		"settlement_amount":      quote.SettlementAmount,
		"rate":                   quote.Rate,
		"settlement_quote_rate":  quote.SettlementQuoteRate,
		"requires_path_payment":  quote.RequiresPathPayment,
		"expires_at":             quote.ExpiresAt.UTC().Format("2006-01-02T15:04:05.000Z"),
		"quoted_paid_amount":     updated.QuotedPaidAmount,
		"quoted_settlement_amount": updated.QuotedSettlementAmount,
	})
}

// Quote ports GET /api/checkout/{paymentId}/quote
func (h *CheckoutHandler) Quote(w http.ResponseWriter, r *http.Request) {
	paymentID := chi.URLParam(r, "paymentId")
	payment, err := h.resolvePayment(r.Context(), paymentID)
	if err != nil || payment == nil {
		httpx.Error(w, http.StatusNotFound, "Payment not found")
		return
	}

	payable, err := h.payments.EnsurePayablePayment(r.Context(), payment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment")
		return
	}
	if payable.Error != "" {
		httpx.Error(w, http.StatusGone, payable.Error)
		return
	}
	payment = payable.Payment

	assetCode := strings.TrimSpace(r.URL.Query().Get("paid_asset_code"))
	if assetCode == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid paid asset")
		return
	}
	var issuer *string
	if v := strings.TrimSpace(r.URL.Query().Get("paid_asset_issuer")); v != "" {
		issuer = &v
	}
	paidAsset := paymentsvc.AllowedAsset{AssetCode: assetCode, IssuerAddress: issuer}

	_ = paymentsvc.SyncEscrowOperatorTrustlines(payment.Environment, payment.AllowedAssets)

	quote, err := h.payments.PreviewPaymentQuote(r.Context(), payment, paidAsset, h.cfg.InvoiceQuoteTTLMinutes)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	trustlineErr, err := paymentsvc.GetEscrowDepositTrustlineError(paidAsset, payment.Environment)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	var depositTrustlineError any
	if trustlineErr != "" {
		depositTrustlineError = trustlineErr
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"pricing_amount":          quote.PricingAmount,
		"pricing_currency":        quote.PricingCurrency,
		"paid_asset":              quote.PaidAsset,
		"paid_amount":             quote.PaidAmount,
		"settlement_asset":        quote.SettlementAsset,
		"settlement_amount":       quote.SettlementAmount,
		"rate":                    quote.Rate,
		"settlement_quote_rate":   quote.SettlementQuoteRate,
		"requires_path_payment":   quote.RequiresPathPayment,
		"expires_at":              quote.ExpiresAt.UTC().Format("2006-01-02T15:04:05.000Z"),
		"deposit_trustline_error": depositTrustlineError,
	})
}
