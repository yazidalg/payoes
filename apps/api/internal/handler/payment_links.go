package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	invoicesvc "github.com/payoesteam/payoes/apps/api/internal/service/invoices"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
	paymentlinkssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentlinks"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
)

// PaymentLinksHandler serves dashboard payment-link routes.
type PaymentLinksHandler struct {
	orgs  *orgsvc.Service
	links *paymentlinkssvc.Service
}

func NewPaymentLinksHandler(orgs *orgsvc.Service, links *paymentlinkssvc.Service) *PaymentLinksHandler {
	return &PaymentLinksHandler{orgs: orgs, links: links}
}

func (h *PaymentLinksHandler) requireMember(w http.ResponseWriter, r *http.Request) (*orgsvc.Organization, bool) {
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

// List ports GET /api/organizations/{id}/payment-links
func (h *PaymentLinksHandler) List(w http.ResponseWriter, r *http.Request) {
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
		links, total, err := h.links.ListPaginated(r.Context(), org.ID, org.Environment, paymentlinkssvc.ListQuery{
			Page: page, PageSize: pageSize, Search: q.Get("search"),
			Status: q.Get("status"), SortOrder: q.Get("sortOrder"),
		})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to list payment links")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"payment_links": links, "total": total})
		return
	}

	list, err := h.links.List(r.Context(), org.ID, org.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list payment links")
		return
	}
	serialized := make([]map[string]any, 0, len(list))
	for i := range list {
		serialized = append(serialized, h.links.Serialize(&list[i]))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"payment_links": serialized,
		"total":         len(serialized),
	})
}

// Create ports POST /api/organizations/{id}/payment-links
func (h *PaymentLinksHandler) Create(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	var body struct {
		CurrencyCode       *string                             `json:"currency_code"`
		Items              []invoiceItemBody                   `json:"items"`
		Description        *string                             `json:"description"`
		CustomerCollection *paymentlinkssvc.CustomerCollection `json:"customer_collection"`
		Metadata           map[string]string                   `json:"metadata"`
		SettlementAsset    *paymentmethodssvc.AllowedAsset     `json:"settlement_asset"`
		AllowedAssets      []paymentmethodssvc.AllowedAsset    `json:"allowed_assets"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if len(body.Items) == 0 {
		httpx.Error(w, http.StatusBadRequest, "Add at least one product")
		return
	}

	hasWallet, err := h.orgs.HasSettlementWallet(r.Context(), org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to check settlement wallet")
		return
	}
	if !hasWallet {
		httpx.Error(w, http.StatusBadRequest, orgsvc.SettlementWalletNotConfiguredMessage(org.Environment))
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

	link, err := h.links.Create(r.Context(), paymentlinkssvc.CreateInput{
		OrganizationID: org.ID, Environment: org.Environment, CurrencyCode: currencyCode,
		Items: items, SettlementAsset: body.SettlementAsset, AllowedAssets: body.AllowedAssets,
		Description: body.Description, CustomerCollection: body.CustomerCollection, Metadata: body.Metadata,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	serialized, err := h.links.SerializeWithItems(r.Context(), link)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payment link")
		return
	}
	httpx.JSON(w, http.StatusCreated, serialized)
}

// Get ports GET /api/organizations/{id}/payment-links/{linkId}
func (h *PaymentLinksHandler) Get(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	linkID := chi.URLParam(r, "linkId")
	if strings.TrimSpace(linkID) == "" {
		httpx.Error(w, http.StatusNotFound, "Payment link not found")
		return
	}
	link, err := h.links.GetForOrganization(r.Context(), linkID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment link")
		return
	}
	if link == nil {
		httpx.Error(w, http.StatusNotFound, "Payment link not found")
		return
	}
	serialized, err := h.links.SerializeWithItems(r.Context(), link)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payment link")
		return
	}
	httpx.JSON(w, http.StatusOK, serialized)
}
