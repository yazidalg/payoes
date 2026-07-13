package handler

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	invoicesvc "github.com/payoesteam/payoes/apps/api/internal/service/invoices"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

// InvoicesHandler serves dashboard invoice routes under /api/organizations/{id}/invoices.
type InvoicesHandler struct {
	orgs     *orgsvc.Service
	invoices *invoicesvc.Service
}

func NewInvoicesHandler(orgs *orgsvc.Service, invoices *invoicesvc.Service) *InvoicesHandler {
	return &InvoicesHandler{orgs: orgs, invoices: invoices}
}

func (h *InvoicesHandler) requireMember(w http.ResponseWriter, r *http.Request) (*orgsvc.Organization, bool) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return nil, false
	}
	orgID := chi.URLParam(r, "id")
	org, err := h.orgs.GetOrganizationForMember(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load organization")
		return nil, false
	}
	if org == nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return nil, false
	}
	return org, true
}

var quantityPattern = regexp.MustCompile(`^\d+(\.\d{1,4})?$`)

type invoiceItemBody struct {
	Description string `json:"description"`
	Quantity    string `json:"quantity"`
	UnitAmount  string `json:"unit_amount"`
}

func parseInvoiceItems(items []invoiceItemBody, currencyCode string) ([]invoicesvc.LineItemInput, string) {
	out := make([]invoicesvc.LineItemInput, 0, len(items))
	for i, item := range items {
		if strings.TrimSpace(item.Description) == "" {
			return nil, "Item description is required"
		}
		if !quantityPattern.MatchString(strings.TrimSpace(item.Quantity)) {
			return nil, "Quantity must be a valid number"
		}
		if _, err := invoicesvc.ParseFiatAmount(item.UnitAmount, currencyCode); err != nil {
			return nil, "Unit amount must be a valid " + currencyCode + " amount"
		}
		_ = i
		out = append(out, invoicesvc.LineItemInput{
			Description: item.Description,
			Quantity:    item.Quantity,
			UnitAmount:  item.UnitAmount,
		})
	}
	return out, ""
}

// List ports GET /api/organizations/{id}/invoices
func (h *InvoicesHandler) List(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()
	hasListParams := q.Get("page") != "" || q.Get("pageSize") != "" || q.Get("search") != "" ||
		q.Get("status") != "" || q.Get("sortOrder") != ""

	if hasListParams {
		page, _ := strconv.Atoi(q.Get("page"))
		pageSize, _ := strconv.Atoi(q.Get("pageSize"))
		invoices, total, err := h.invoices.ListPaginated(r.Context(), org.ID, org.Environment, invoicesvc.ListQuery{
			Page: page, PageSize: pageSize, Search: q.Get("search"),
			Status: q.Get("status"), SortOrder: q.Get("sortOrder"),
		})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to list invoices")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"invoices": invoices, "total": total})
		return
	}

	rows, err := h.invoices.List(r.Context(), org.ID, org.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list invoices")
		return
	}
	serialized, err := h.invoices.SerializeMany(r.Context(), rows)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize invoices")
		return
	}
	if serialized == nil {
		serialized = []map[string]any{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"invoices": serialized, "total": len(serialized)})
}

// Create ports POST /api/organizations/{id}/invoices
func (h *InvoicesHandler) Create(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	var body struct {
		Amount       *string           `json:"amount"`
		CustomerID   string            `json:"customer_id"`
		CurrencyCode *string           `json:"currency_code"`
		Description  *string           `json:"description"`
		Metadata     map[string]string `json:"metadata"`
		DueAt        *string           `json:"due_at"`
		DueInDays    *int              `json:"due_in_days"`
		Items        []invoiceItemBody `json:"items"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.CustomerID) == "" {
		httpx.Error(w, http.StatusBadRequest, "customer_id is required")
		return
	}
	if (body.Amount == nil || strings.TrimSpace(*body.Amount) == "") && len(body.Items) == 0 {
		httpx.Error(w, http.StatusBadRequest, "Amount or at least one item is required")
		return
	}

	currencyCode := invoicesvc.ResolveCurrencyCode("")
	if body.CurrencyCode != nil {
		currencyCode = invoicesvc.ResolveCurrencyCode(*body.CurrencyCode)
	}

	var items []invoicesvc.LineItemInput
	if len(body.Items) > 0 {
		var errMsg string
		items, errMsg = parseInvoiceItems(body.Items, currencyCode)
		if errMsg != "" {
			httpx.Error(w, http.StatusBadRequest, errMsg)
			return
		}
	} else if body.Amount != nil {
		if _, err := invoicesvc.ParseFiatAmount(*body.Amount, currencyCode); err != nil {
			httpx.Error(w, http.StatusBadRequest, "Amount must be a valid "+currencyCode+" amount")
			return
		}
	}

	var dueAt *time.Time
	if body.DueAt != nil && strings.TrimSpace(*body.DueAt) != "" {
		t, err := time.Parse(time.RFC3339, *body.DueAt)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "due_at must be a valid datetime")
			return
		}
		dueAt = &t
	}

	invoice, err := h.invoices.Create(r.Context(), invoicesvc.CreateInput{
		OrganizationID: org.ID, Environment: org.Environment, CustomerID: body.CustomerID,
		Amount: body.Amount, CurrencyCode: currencyCode, Description: body.Description,
		Metadata: body.Metadata, DueAt: dueAt, DueInDays: body.DueInDays, Items: items,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	detail, err := h.invoices.GetDetail(r.Context(), invoice.PublicID, org.ID, org.Environment)
	if err != nil || detail == nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load created invoice")
		return
	}
	httpx.JSON(w, http.StatusCreated, h.invoices.SerializeDetail(detail, false))
}

// Get ports GET /api/organizations/{id}/invoices/{invoiceId}
func (h *InvoicesHandler) Get(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	invoiceID := chi.URLParam(r, "invoiceId")
	detail, err := h.invoices.GetDetail(r.Context(), invoiceID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load invoice")
		return
	}
	if detail == nil {
		httpx.Error(w, http.StatusNotFound, "Invoice not found")
		return
	}
	httpx.JSON(w, http.StatusOK, h.invoices.SerializeDetail(detail, true))
}

// Update ports PATCH /api/organizations/{id}/invoices/{invoiceId}
func (h *InvoicesHandler) Update(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	invoiceID := chi.URLParam(r, "invoiceId")

	var body struct {
		Description *string           `json:"description"`
		DueAt       *string           `json:"due_at"`
		Metadata    map[string]string `json:"metadata"`
		CustomerID  *string           `json:"customer_id"`
		Items       []invoiceItemBody `json:"items"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if body.CustomerID != nil && strings.TrimSpace(*body.CustomerID) != "" {
		if _, err := h.invoices.ChangeCustomer(r.Context(), invoiceID, org.ID, org.Environment, *body.CustomerID); err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	needsUpdate := body.Description != nil || body.DueAt != nil || body.Metadata != nil || body.Items != nil
	if needsUpdate {
		input := invoicesvc.UpdateInput{}
		if body.Description != nil {
			input.SetDescription = true
			input.Description = body.Description
		}
		if body.DueAt != nil {
			t, err := time.Parse(time.RFC3339, *body.DueAt)
			if err != nil {
				httpx.Error(w, http.StatusBadRequest, "due_at must be a valid datetime")
				return
			}
			input.DueAt = &t
		}
		if body.Metadata != nil {
			input.SetMetadata = true
			input.Metadata = body.Metadata
		}
		if body.Items != nil {
			currencyCode := invoicesvc.ResolveCurrencyCode("USD")
			existing, _ := h.invoices.GetForOrganization(r.Context(), invoiceID, org.ID, org.Environment)
			if existing != nil {
				currencyCode = invoicesvc.ResolveCurrencyCode(existing.CurrencyCode)
			}
			items, errMsg := parseInvoiceItems(body.Items, currencyCode)
			if errMsg != "" {
				httpx.Error(w, http.StatusBadRequest, errMsg)
				return
			}
			input.SetItems = true
			input.Items = items
		}
		if _, err := h.invoices.Update(r.Context(), invoiceID, org.ID, org.Environment, input); err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	detail, err := h.invoices.GetDetail(r.Context(), invoiceID, org.ID, org.Environment)
	if err != nil || detail == nil {
		httpx.Error(w, http.StatusNotFound, "Invoice not found")
		return
	}
	httpx.JSON(w, http.StatusOK, h.invoices.SerializeDetail(detail, true))
}

// Delete ports DELETE /api/organizations/{id}/invoices/{invoiceId}
func (h *InvoicesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	invoiceID := chi.URLParam(r, "invoiceId")
	if err := h.invoices.Delete(r.Context(), invoiceID, org.ID, org.Environment); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// Finalize ports POST /api/organizations/{id}/invoices/{invoiceId}/finalize
func (h *InvoicesHandler) Finalize(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	invoiceID := chi.URLParam(r, "invoiceId")
	inv, sess, checkoutURL, err := h.invoices.Finalize(r.Context(), invoiceID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"invoice": invoicesvc.Serialize(inv, nil, invoicesvc.SerializeOpts{
			CheckoutURL:             &checkoutURL,
			CheckoutSessionPublicID: &sess.PublicID,
		}),
		"checkout_url": checkoutURL,
	})
}

// Send ports POST /api/organizations/{id}/invoices/{invoiceId}/send
func (h *InvoicesHandler) Send(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	invoiceID := chi.URLParam(r, "invoiceId")
	_, checkoutURL, delivered, logged, err := h.invoices.Send(r.Context(), invoiceID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	detail, err := h.invoices.GetDetail(r.Context(), invoiceID, org.ID, org.Environment)
	if err != nil || detail == nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load sent invoice")
		return
	}
	out := h.invoices.SerializeDetail(detail, false)
	out["checkout_url"] = checkoutURL
	out["email_delivered"] = delivered
	out["email_logged"] = logged
	httpx.JSON(w, http.StatusOK, out)
}

// Void ports POST /api/organizations/{id}/invoices/{invoiceId}/void
func (h *InvoicesHandler) Void(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	invoiceID := chi.URLParam(r, "invoiceId")
	inv, err := h.invoices.Void(r.Context(), invoiceID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, invoicesvc.Serialize(inv, nil, invoicesvc.SerializeOpts{}))
}

// MarkPaid ports POST /api/organizations/{id}/invoices/{invoiceId}/mark-paid
func (h *InvoicesHandler) MarkPaid(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	invoiceID := chi.URLParam(r, "invoiceId")
	if _, err := h.invoices.MarkPaid(r.Context(), invoiceID, org.ID, org.Environment); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	detail, err := h.invoices.GetDetail(r.Context(), invoiceID, org.ID, org.Environment)
	if err != nil || detail == nil {
		httpx.Error(w, http.StatusNotFound, "Invoice not found")
		return
	}
	httpx.JSON(w, http.StatusOK, h.invoices.SerializeDetail(detail, true))
}

// PreviewEmail ports POST /api/organizations/{id}/invoices/preview-email
func (h *InvoicesHandler) PreviewEmail(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")
	org, err := h.orgs.GetOrganizationForMember(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load organization")
		return
	}
	if org == nil {
		httpx.Error(w, http.StatusNotFound, "Business not found")
		return
	}

	var body struct {
		Presentation map[string]any `json:"presentation"`
	}
	if err := decodeBody(r, &body); err != nil || body.Presentation == nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid preview payload")
		return
	}
	if _, ok := body.Presentation["invoiceNumber"].(string); !ok {
		httpx.Error(w, http.StatusBadRequest, "Invalid preview payload")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"html": h.invoices.PreviewEmailHTML(body.Presentation)})
}

// CreateAndSend ports POST /api/organizations/{id}/invoices/send
func (h *InvoicesHandler) CreateAndSend(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	var body struct {
		CustomerID   string            `json:"customer_id"`
		Description  *string           `json:"description"`
		CurrencyCode *string           `json:"currency_code"`
		DueAt        *string           `json:"due_at"`
		DueInDays    *int              `json:"due_in_days"`
		Items        []invoiceItemBody `json:"items"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.CustomerID) == "" {
		httpx.Error(w, http.StatusBadRequest, "customer_id is required")
		return
	}
	if len(body.Items) == 0 {
		httpx.Error(w, http.StatusBadRequest, "At least one item is required")
		return
	}

	currencyCode := invoicesvc.ResolveCurrencyCode("")
	if body.CurrencyCode != nil {
		currencyCode = invoicesvc.ResolveCurrencyCode(*body.CurrencyCode)
	}
	items, errMsg := parseInvoiceItems(body.Items, currencyCode)
	if errMsg != "" {
		httpx.Error(w, http.StatusBadRequest, errMsg)
		return
	}

	var dueAt *time.Time
	if body.DueAt != nil && strings.TrimSpace(*body.DueAt) != "" {
		t, err := time.Parse(time.RFC3339, *body.DueAt)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "due_at must be a valid datetime")
			return
		}
		dueAt = &t
	}

	invoice, err := h.invoices.Create(r.Context(), invoicesvc.CreateInput{
		OrganizationID: org.ID, Environment: org.Environment, CustomerID: body.CustomerID,
		CurrencyCode: currencyCode, Description: body.Description,
		DueAt: dueAt, DueInDays: body.DueInDays, Items: items,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	_, checkoutURL, delivered, logged, err := h.invoices.Send(r.Context(), invoice.PublicID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	detail, err := h.invoices.GetDetail(r.Context(), invoice.PublicID, org.ID, org.Environment)
	if err != nil || detail == nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load sent invoice")
		return
	}

	assets, _ := h.invoices.GetPaymentAssets(r.Context(), detail.Invoice)
	opts := invoicesvc.SerializeOpts{
		CheckoutURL:             &checkoutURL,
		CheckoutSessionPublicID: detail.CheckoutSessionPublicID,
		CustomerName:            detail.CustomerName,
		CustomerEmail:           detail.CustomerEmail,
	}
	if assets != nil {
		code := assets.SettlementAsset.AssetCode
		opts.SettlementAsset = &code
		for _, a := range assets.AllowedAssets {
			opts.AllowedAssets = append(opts.AllowedAssets, a.AssetCode)
		}
	}
	out := invoicesvc.Serialize(detail.Invoice, detail.CustomerPublicID, opts)
	out["email_delivered"] = delivered
	out["email_logged"] = logged
	itemOut := make([]map[string]any, 0, len(detail.Items))
	for _, item := range detail.Items {
		itemOut = append(itemOut, map[string]any{
			"description": item.Description,
			"quantity":    item.Quantity,
			"unit_amount": item.UnitAmount,
		})
	}
	out["items"] = itemOut
	httpx.JSON(w, http.StatusOK, out)
}
