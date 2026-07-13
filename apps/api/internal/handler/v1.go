package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	checkoutsvc "github.com/payoesteam/payoes/apps/api/internal/service/checkoutsessions"
	customersvc "github.com/payoesteam/payoes/apps/api/internal/service/customers"
	invoicesvc "github.com/payoesteam/payoes/apps/api/internal/service/invoices"
	paymentlinksvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentlinks"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
)

// V1Handler ports apps/web/src/app/api/v1/*
type V1Handler struct {
	customers    *customersvc.Service
	payments     *paymentsvc.Service
	invoices     *invoicesvc.Service
	paymentLinks *paymentlinksvc.Service
	checkouts    *checkoutsvc.Service
	webURL       string
}

// NewV1Handler keeps the existing constructor used by router.go.
// Call SetBillingServices to attach invoices / payment-links / checkout-sessions.
func NewV1Handler(customers *customersvc.Service, payments *paymentsvc.Service, webURL string) *V1Handler {
	return &V1Handler{customers: customers, payments: payments, webURL: webURL}
}

// SetBillingServices wires invoice, payment-link, and checkout-session services.
func (h *V1Handler) SetBillingServices(
	invoices *invoicesvc.Service,
	paymentLinks *paymentlinksvc.Service,
	checkouts *checkoutsvc.Service,
) {
	h.invoices = invoices
	h.paymentLinks = paymentLinks
	h.checkouts = checkouts
}

// ListPayments ports GET /api/v1/payments
func (h *V1Handler) ListPayments(w http.ResponseWriter, r *http.Request) {
	key := middleware.APIKeyFromContext(r.Context())
	list, err := h.payments.List(r.Context(), key.OrganizationID, key.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list payments")
		return
	}
	serialized, err := h.payments.SerializeMany(r.Context(), list, h.webURL)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payments")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"data": serialized, "has_more": false})
}

// CreatePayment ports POST /api/v1/payments
func (h *V1Handler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	key := middleware.APIKeyFromContext(r.Context())
	var body struct {
		PricingCurrency  string                    `json:"pricing_currency"`
		PricingAmount    string                    `json:"pricing_amount"`
		Amount           string                    `json:"amount"`
		SettlementAsset  *paymentsvc.AllowedAsset  `json:"settlement_asset"`
		AllowedAssets    []paymentsvc.AllowedAsset `json:"allowed_assets"`
		Description      *string                   `json:"description"`
		Metadata         map[string]string         `json:"metadata"`
		ExpiresInMinutes *int                      `json:"expires_in_minutes"`
		CustomerID       *string                   `json:"customer_id"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.PricingCurrency) == "" || strings.TrimSpace(body.PricingAmount) == "" {
		httpx.Error(w, http.StatusBadRequest, "pricing_currency and pricing_amount are required")
		return
	}
	currency := strings.ToUpper(strings.TrimSpace(body.PricingCurrency))
	amount := body.PricingAmount
	if body.Amount != "" {
		amount = body.Amount
	}

	payment, err := h.payments.Create(r.Context(), paymentsvc.CreateInput{
		OrganizationID: key.OrganizationID, Environment: key.Environment, Amount: amount,
		SettlementAsset: body.SettlementAsset, AllowedAssets: body.AllowedAssets,
		Description: body.Description, Metadata: body.Metadata,
		ExpiresInMinutes: body.ExpiresInMinutes, CustomerID: body.CustomerID,
		PricingCurrency: &currency, PricingAmount: &body.PricingAmount,
		CheckoutBaseURL: h.webURL,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	serialized, err := h.payments.Serialize(r.Context(), payment, h.webURL)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payment")
		return
	}
	httpx.JSON(w, http.StatusCreated, serialized)
}

// GetPayment ports GET /api/v1/payments/{id}
func (h *V1Handler) GetPayment(w http.ResponseWriter, r *http.Request) {
	key := middleware.APIKeyFromContext(r.Context())
	id := chi.URLParam(r, "id")
	payment, err := h.payments.GetForOrganization(r.Context(), id, key.OrganizationID, key.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment")
		return
	}
	if payment == nil {
		httpx.Error(w, http.StatusNotFound, "Payment not found")
		return
	}
	serialized, err := h.payments.Serialize(r.Context(), payment, h.webURL)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payment")
		return
	}
	httpx.JSON(w, http.StatusOK, serialized)
}

// ListCustomers ports GET /api/v1/customers
func (h *V1Handler) ListCustomers(w http.ResponseWriter, r *http.Request) {
	key := middleware.APIKeyFromContext(r.Context())
	list, err := h.customers.List(r.Context(), key.OrganizationID, key.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list customers")
		return
	}
	serialized := make([]map[string]any, 0, len(list))
	for i := range list {
		serialized = append(serialized, customersvc.Serialize(&list[i]))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"data": serialized, "has_more": false})
}

// CreateCustomer ports POST /api/v1/customers
func (h *V1Handler) CreateCustomer(w http.ResponseWriter, r *http.Request) {
	key := middleware.APIKeyFromContext(r.Context())
	var body struct {
		Email                 *string           `json:"email"`
		Name                  *string           `json:"name"`
		PrimaryStellarAddress *string           `json:"primary_stellar_address"`
		Notes                 *string           `json:"notes"`
		Metadata              map[string]string `json:"metadata"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	customer, err := h.customers.Create(r.Context(), customersvc.CreateInput{
		OrganizationID: key.OrganizationID, Environment: key.Environment,
		Email: body.Email, Name: body.Name, PrimaryStellarAddress: body.PrimaryStellarAddress,
		Notes: body.Notes, Metadata: body.Metadata,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, customersvc.Serialize(customer))
}

// GetCustomer ports GET /api/v1/customers/{id}
func (h *V1Handler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	key := middleware.APIKeyFromContext(r.Context())
	id := chi.URLParam(r, "id")
	customer, err := h.customers.GetForOrganization(r.Context(), id, key.OrganizationID, key.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load customer")
		return
	}
	if customer == nil {
		httpx.Error(w, http.StatusNotFound, "Customer not found")
		return
	}
	httpx.JSON(w, http.StatusOK, customersvc.Serialize(customer))
}

func (h *V1Handler) requireBilling(w http.ResponseWriter) bool {
	if h.invoices == nil || h.paymentLinks == nil || h.checkouts == nil {
		httpx.Error(w, http.StatusNotImplemented, "Billing APIs are not wired in the router yet")
		return false
	}
	return true
}

// ListInvoices ports GET /api/v1/invoices
func (h *V1Handler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	list, err := h.invoices.List(r.Context(), key.OrganizationID, key.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list invoices")
		return
	}
	serialized, err := h.invoices.SerializeMany(r.Context(), list)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize invoices")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"invoices": serialized})
}

// CreateInvoice ports POST /api/v1/invoices
func (h *V1Handler) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	var body struct {
		Amount       string            `json:"amount"`
		CustomerID   string            `json:"customer_id"`
		CurrencyCode string            `json:"currency_code"`
		Description  *string           `json:"description"`
		Metadata     map[string]string `json:"metadata"`
		DueAt        *string           `json:"due_at"`
		DueInDays    *int              `json:"due_in_days"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.Amount) == "" || strings.TrimSpace(body.CustomerID) == "" {
		httpx.Error(w, http.StatusBadRequest, "amount and customer_id are required")
		return
	}

	var dueAt *time.Time
	if body.DueAt != nil && strings.TrimSpace(*body.DueAt) != "" {
		t, err := time.Parse(time.RFC3339, strings.TrimSpace(*body.DueAt))
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "due_at must be an ISO datetime")
			return
		}
		dueAt = &t
	}

	amount := body.Amount
	invoice, err := h.invoices.Create(r.Context(), invoicesvc.CreateInput{
		OrganizationID: key.OrganizationID,
		Environment:    key.Environment,
		CustomerID:     body.CustomerID,
		Amount:         &amount,
		CurrencyCode:   body.CurrencyCode,
		Description:    body.Description,
		Metadata:       body.Metadata,
		DueAt:          dueAt,
		DueInDays:      body.DueInDays,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	detail, err := h.invoices.GetDetail(r.Context(), invoice.PublicID, key.OrganizationID, key.Environment)
	if err != nil || detail == nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load created invoice")
		return
	}
	httpx.JSON(w, http.StatusCreated, h.invoices.SerializeDetail(detail, false))
}

// GetInvoice ports GET /api/v1/invoices/{id}
func (h *V1Handler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	detail, err := h.invoices.GetDetail(r.Context(), chi.URLParam(r, "id"), key.OrganizationID, key.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load invoice")
		return
	}
	if detail == nil {
		httpx.Error(w, http.StatusNotFound, "Invoice not found")
		return
	}
	httpx.JSON(w, http.StatusOK, h.invoices.SerializeDetail(detail, false))
}

// FinalizeInvoice ports POST /api/v1/invoices/{id}/finalize
func (h *V1Handler) FinalizeInvoice(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	invoice, session, checkoutURL, err := h.invoices.Finalize(
		r.Context(), chi.URLParam(r, "id"), key.OrganizationID, key.Environment,
	)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	sessionID := session.PublicID
	httpx.JSON(w, http.StatusOK, map[string]any{
		"invoice": invoicesvc.Serialize(invoice, nil, invoicesvc.SerializeOpts{
			CheckoutURL:             &checkoutURL,
			CheckoutSessionPublicID: &sessionID,
		}),
		"checkout_url": checkoutURL,
	})
}

// ListPaymentLinks ports GET /api/v1/payment-links
func (h *V1Handler) ListPaymentLinks(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	list, err := h.paymentLinks.List(r.Context(), key.OrganizationID, key.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list payment links")
		return
	}
	serialized := make([]map[string]any, 0, len(list))
	for i := range list {
		serialized = append(serialized, h.paymentLinks.Serialize(&list[i]))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"payment_links": serialized})
}

// CreatePaymentLink ports POST /api/v1/payment-links
func (h *V1Handler) CreatePaymentLink(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	var raw struct {
		CurrencyCode       string                             `json:"currency_code"`
		Items              []map[string]string                `json:"items"`
		Description        *string                            `json:"description"`
		CustomerCollection *paymentlinksvc.CustomerCollection `json:"customer_collection"`
		Metadata           map[string]string                  `json:"metadata"`
		SettlementAsset    *paymentsvc.AllowedAsset           `json:"settlement_asset"`
		AllowedAssets      []paymentsvc.AllowedAsset          `json:"allowed_assets"`
	}
	if err := decodeBody(r, &raw); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if len(raw.Items) == 0 {
		httpx.Error(w, http.StatusBadRequest, "Add at least one product")
		return
	}
	items := make([]invoicesvc.LineItemInput, 0, len(raw.Items))
	for _, item := range raw.Items {
		desc := item["description"]
		qty := item["quantity"]
		unit := item["unit_amount"]
		if desc == "" || unit == "" {
			httpx.Error(w, http.StatusBadRequest, "Each item requires description and unit_amount")
			return
		}
		if qty == "" {
			qty = "1"
		}
		items = append(items, invoicesvc.LineItemInput{
			Description: desc, Quantity: qty, UnitAmount: unit,
		})
	}

	var settlement *paymentmethodssvc.AllowedAsset
	if raw.SettlementAsset != nil {
		settlement = &paymentmethodssvc.AllowedAsset{
			AssetCode: raw.SettlementAsset.AssetCode, IssuerAddress: raw.SettlementAsset.IssuerAddress,
		}
	}
	allowed := make([]paymentmethodssvc.AllowedAsset, 0, len(raw.AllowedAssets))
	for _, a := range raw.AllowedAssets {
		allowed = append(allowed, paymentmethodssvc.AllowedAsset{AssetCode: a.AssetCode, IssuerAddress: a.IssuerAddress})
	}

	link, err := h.paymentLinks.Create(r.Context(), paymentlinksvc.CreateInput{
		OrganizationID:     key.OrganizationID,
		Environment:        key.Environment,
		CurrencyCode:       raw.CurrencyCode,
		Items:              items,
		SettlementAsset:    settlement,
		AllowedAssets:      allowed,
		Description:        raw.Description,
		CustomerCollection: raw.CustomerCollection,
		Metadata:           raw.Metadata,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	serialized, err := h.paymentLinks.SerializeWithItems(r.Context(), link)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payment link")
		return
	}
	httpx.JSON(w, http.StatusCreated, serialized)
}

// GetPaymentLink ports GET /api/v1/payment-links/{id}
func (h *V1Handler) GetPaymentLink(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	link, err := h.paymentLinks.GetForOrganization(r.Context(), chi.URLParam(r, "id"), key.OrganizationID, key.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment link")
		return
	}
	if link == nil {
		httpx.Error(w, http.StatusNotFound, "Payment link not found")
		return
	}
	serialized, err := h.paymentLinks.SerializeWithItems(r.Context(), link)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payment link")
		return
	}
	httpx.JSON(w, http.StatusOK, serialized)
}

// ListCheckoutSessions ports GET /api/v1/checkout-sessions
func (h *V1Handler) ListCheckoutSessions(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	list, err := h.checkouts.List(r.Context(), key.OrganizationID, key.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list checkout sessions")
		return
	}
	serialized := make([]map[string]any, 0, len(list))
	for i := range list {
		serialized = append(serialized, checkoutsvc.Serialize(
			list[i], h.checkouts.CheckoutURL(list[i].PaymentPublicID), list[i].CustomerPublicID, list[i].PaymentPublicID, nil,
		))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"checkout_sessions": serialized})
}

// GetCheckoutSession ports GET /api/v1/checkout-sessions/{id}
func (h *V1Handler) GetCheckoutSession(w http.ResponseWriter, r *http.Request) {
	if !h.requireBilling(w) {
		return
	}
	key := middleware.APIKeyFromContext(r.Context())
	detail, err := h.checkouts.GetDetail(r.Context(), chi.URLParam(r, "id"), key.OrganizationID, key.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load checkout session")
		return
	}
	if detail == nil {
		httpx.Error(w, http.StatusNotFound, "Checkout session not found")
		return
	}
	httpx.JSON(w, http.StatusOK, checkoutsvc.SerializeSession(
		detail.Session, h.checkouts.CheckoutURL(detail.Payment.PublicID), detail.CustomerPublicID, detail.Payment,
	))
}
