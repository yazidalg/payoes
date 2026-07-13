package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	apikeyssvc "github.com/payoesteam/payoes/apps/api/internal/service/apikeys"
	customersvc "github.com/payoesteam/payoes/apps/api/internal/service/customers"
	kycsvc "github.com/payoesteam/payoes/apps/api/internal/service/kyc"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
	webhooksvc "github.com/payoesteam/payoes/apps/api/internal/service/webhooks"
)

// OrganizationsHandler serves dashboard organization routes.
type OrganizationsHandler struct {
	orgs            *orgsvc.Service
	customers       *customersvc.Service
	payments        *paymentsvc.Service
	apiKeys         *apikeyssvc.Service
	webhooks        *webhooksvc.Service
	kyc             *kycsvc.Service
	paymentMethods  *paymentmethodssvc.Service
	webURL          string
}

func NewOrganizationsHandler(
	orgs *orgsvc.Service,
	customers *customersvc.Service,
	payments *paymentsvc.Service,
	apiKeys *apikeyssvc.Service,
	webhooks *webhooksvc.Service,
	kyc *kycsvc.Service,
	paymentMethods *paymentmethodssvc.Service,
	webURL string,
) *OrganizationsHandler {
	return &OrganizationsHandler{
		orgs: orgs, customers: customers, payments: payments,
		apiKeys: apiKeys, webhooks: webhooks, kyc: kyc,
		paymentMethods: paymentMethods, webURL: webURL,
	}
}

func decodeBody(r *http.Request, dst any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}

func (h *OrganizationsHandler) requireMember(w http.ResponseWriter, r *http.Request) (*orgsvc.Organization, string, bool) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return nil, "", false
	}
	orgID := chi.URLParam(r, "id")
	org, err := h.orgs.GetOrganizationForMember(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load organization")
		return nil, "", false
	}
	if org == nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return nil, "", false
	}
	return org, user.ID, true
}

// ListOrganizations ports GET /api/organizations
func (h *OrganizationsHandler) ListOrganizations(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	list, err := h.orgs.ListForUser(r.Context(), user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list organizations")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organizations": list})
}

// CreateOrganization ports POST /api/organizations
func (h *OrganizationsHandler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Name        string  `json:"name"`
		Email       string  `json:"email"`
		Website     *string `json:"website"`
		Description *string `json:"description"`
		LogoURL     *string `json:"logo_url"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "Business name is required")
		return
	}
	if !strings.Contains(body.Email, "@") {
		httpx.Error(w, http.StatusBadRequest, "Business email must be valid")
		return
	}

	org, err := h.orgs.CreateForUser(r.Context(), user.ID, orgsvc.CreateInput{
		Name: body.Name, Email: body.Email, Website: body.Website,
		Description: body.Description, LogoURL: body.LogoURL,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to create business")
		return
	}
	setActiveOrgCookie(w, org.ID, strings.HasPrefix(h.webURL, "https://"))
	httpx.JSON(w, http.StatusCreated, map[string]any{"organization": org})
}

// GetOrganization ports GET /api/organizations/{id}
func (h *OrganizationsHandler) GetOrganization(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")
	membership, err := h.orgs.GetMembership(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load organization")
		return
	}
	if membership == nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return
	}
	org, err := h.orgs.GetByID(r.Context(), orgID)
	if err != nil || org == nil {
		httpx.Error(w, http.StatusNotFound, "Not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organization": org, "viewerRole": membership.Role})
}

// UpdateOrganization ports PATCH /api/organizations/{id}
func (h *OrganizationsHandler) UpdateOrganization(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")
	membership, err := h.orgs.GetMembership(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to update organization")
		return
	}
	if membership == nil || (membership.Role != "owner" && membership.Role != "admin") {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return
	}

	existing, err := h.orgs.GetByID(r.Context(), orgID)
	if err != nil || existing == nil {
		httpx.Error(w, http.StatusNotFound, "Not found")
		return
	}

	var body struct {
		Name        *string `json:"name"`
		Email       *string `json:"email"`
		Website     *string `json:"website"`
		Description *string `json:"description"`
		LogoURL     *string `json:"logo_url"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	name := existing.Name
	email := existing.Email
	website := existing.Website
	description := existing.Description
	logoURL := existing.LogoURL
	if body.Name != nil {
		name = *body.Name
	}
	if body.Email != nil {
		email = *body.Email
	}
	if body.Website != nil {
		website = body.Website
	}
	if body.Description != nil {
		description = body.Description
	}
	if body.LogoURL != nil {
		logoURL = body.LogoURL
	}

	org, err := h.orgs.Update(r.Context(), orgID, orgsvc.UpdateInput{
		Name: name, Email: email, Website: website, Description: description, LogoURL: logoURL,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to update business")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organization": org})
}

// DeleteOrganization ports DELETE /api/organizations/{id}
func (h *OrganizationsHandler) DeleteOrganization(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")
	membership, err := h.orgs.GetMembership(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to delete organization")
		return
	}
	if membership == nil || membership.Role != "owner" {
		httpx.Error(w, http.StatusForbidden, "Only the business owner can delete this business")
		return
	}

	existing, err := h.orgs.GetByID(r.Context(), orgID)
	if err != nil || existing == nil {
		httpx.Error(w, http.StatusNotFound, "Not found")
		return
	}

	var body struct {
		ConfirmName string `json:"confirmName"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.ConfirmName) != existing.Name {
		httpx.Error(w, http.StatusBadRequest, "Business name does not match")
		return
	}

	if _, err := h.orgs.Delete(r.Context(), orgID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to delete business")
		return
	}
	remaining, _ := h.orgs.ListForUser(r.Context(), user.ID)
	var next any
	if len(remaining) > 0 {
		next = remaining[0]
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"deleted": true, "nextOrganization": next})
}

// ListCustomers ports GET /api/organizations/{id}/customers
func (h *OrganizationsHandler) ListCustomers(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()
	hasListParams := q.Get("page") != "" || q.Get("pageSize") != "" || q.Get("search") != "" ||
		q.Get("sortBy") != "" || q.Get("sortOrder") != "" ||
		q.Get("walletStatus") != "" || q.Get("emailStatus") != "" || q.Get("paymentStatus") != ""

	if !hasListParams {
		list, err := h.customers.List(r.Context(), org.ID, org.Environment, 50)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to list customers")
			return
		}
		serialized := make([]map[string]any, 0, len(list))
		for i := range list {
			serialized = append(serialized, customersvc.Serialize(&list[i]))
		}
		httpx.JSON(w, http.StatusOK, map[string]any{
			"customers": serialized,
			"total":     len(serialized),
		})
		return
	}

	query := customersvc.ListCustomersQuery{
		Search:        q.Get("search"),
		SortBy:        q.Get("sortBy"),
		SortOrder:     q.Get("sortOrder"),
		WalletStatus:  q.Get("walletStatus"),
		EmailStatus:   q.Get("emailStatus"),
		PaymentStatus: q.Get("paymentStatus"),
	}
	if pageRaw := q.Get("page"); pageRaw != "" {
		page, err := strconv.Atoi(pageRaw)
		if err != nil || page < 1 {
			httpx.Error(w, http.StatusBadRequest, "Invalid query")
			return
		}
		query.Page = page
	}
	if pageSizeRaw := q.Get("pageSize"); pageSizeRaw != "" {
		pageSize, err := strconv.Atoi(pageSizeRaw)
		if err != nil || pageSize < 1 || pageSize > 100 {
			httpx.Error(w, http.StatusBadRequest, "Invalid query")
			return
		}
		query.PageSize = pageSize
	}

	list, total, err := h.customers.ListPaginated(r.Context(), org.ID, org.Environment, query)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list customers")
		return
	}
	serialized := make([]map[string]any, 0, len(list))
	for i := range list {
		serialized = append(serialized, customersvc.Serialize(&list[i]))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"customers": serialized, "total": total})
}

// CreateCustomer ports POST /api/organizations/{id}/customers
func (h *OrganizationsHandler) CreateCustomer(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
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
		OrganizationID: org.ID, Environment: org.Environment,
		Email: body.Email, Name: body.Name, PrimaryStellarAddress: body.PrimaryStellarAddress,
		Notes: body.Notes, Metadata: body.Metadata,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, customersvc.Serialize(customer))
}

// GetCustomer ports GET /api/organizations/{id}/customers/{customerId}
func (h *OrganizationsHandler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	customerID := chi.URLParam(r, "customerId")
	customer, err := h.customers.GetForOrganization(r.Context(), customerID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load customer")
		return
	}
	if customer == nil {
		httpx.Error(w, http.StatusNotFound, "Customer not found")
		return
	}
	paymentList, err := h.payments.ListForCustomer(r.Context(), customer.ID, org.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load customer payments")
		return
	}
	customerPublicID := customer.PublicID
	paymentsOut := make([]map[string]any, 0, len(paymentList))
	for i := range paymentList {
		paymentsOut = append(paymentsOut, paymentsvc.SerializePayment(&paymentList[i], &customerPublicID, h.webURL))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"customer": customersvc.Serialize(customer),
		"payments": paymentsOut,
	})
}

// ListPayments ports GET /api/organizations/{id}/payments
func (h *OrganizationsHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()
	pageRaw := q.Get("page")
	pageSizeRaw := q.Get("pageSize")
	sortOrder := q.Get("sortOrder")
	search := q.Get("search")
	customerStatus := q.Get("customerStatus")
	status := q.Get("status")

	hasListParams := pageRaw != "" || pageSizeRaw != "" || search != "" ||
		customerStatus != "" || status != "" || sortOrder != ""

	if !hasListParams {
		list, err := h.payments.List(r.Context(), org.ID, org.Environment, 50)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to list payments")
			return
		}
		serialized, err := h.payments.SerializeMany(r.Context(), list, h.webURL)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payments")
			return
		}
		if serialized == nil {
			serialized = []map[string]any{}
		}
		httpx.JSON(w, http.StatusOK, map[string]any{
			"payments": serialized,
			"total":    len(serialized),
		})
		return
	}

	query := paymentsvc.ListPaymentsQuery{
		Search:         search,
		CustomerStatus: customerStatus,
		Status:         status,
		SortOrder:      sortOrder,
	}
	if pageRaw != "" {
		page, err := strconv.Atoi(pageRaw)
		if err != nil || page < 1 {
			httpx.Error(w, http.StatusBadRequest, "Invalid query")
			return
		}
		query.Page = page
	}
	if pageSizeRaw != "" {
		pageSize, err := strconv.Atoi(pageSizeRaw)
		if err != nil || pageSize < 1 || pageSize > 100 {
			httpx.Error(w, http.StatusBadRequest, "Invalid query")
			return
		}
		query.PageSize = pageSize
	}
	if sortOrder != "" && sortOrder != "asc" && sortOrder != "desc" {
		httpx.Error(w, http.StatusBadRequest, "Invalid query")
		return
	}
	if customerStatus != "" && customerStatus != "has_customer" && customerStatus != "no_customer" {
		httpx.Error(w, http.StatusBadRequest, "Invalid query")
		return
	}
	switch status {
	case "", "pending", "completed", "failed", "expired":
	default:
		httpx.Error(w, http.StatusBadRequest, "Invalid query")
		return
	}

	list, total, err := h.payments.ListPaginated(r.Context(), org.ID, org.Environment, query)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list payments")
		return
	}
	serialized, err := h.payments.SerializeMany(r.Context(), list, h.webURL)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize payments")
		return
	}
	if serialized == nil {
		serialized = []map[string]any{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"payments": serialized, "total": total})
}

// CreatePayment ports POST /api/organizations/{id}/payments
func (h *OrganizationsHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		Amount           string                    `json:"amount"`
		PricingCurrency  *string                   `json:"pricing_currency"`
		PricingAmount    *string                   `json:"pricing_amount"`
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
	amount := body.Amount
	if body.PricingAmount != nil && *body.PricingAmount != "" {
		amount = *body.PricingAmount
	}
	if strings.TrimSpace(amount) == "" {
		httpx.Error(w, http.StatusBadRequest, "amount is required")
		return
	}

	payment, err := h.payments.Create(r.Context(), paymentsvc.CreateInput{
		OrganizationID: org.ID, Environment: org.Environment, Amount: amount,
		SettlementAsset: body.SettlementAsset, AllowedAssets: body.AllowedAssets,
		Description: body.Description, Metadata: body.Metadata,
		ExpiresInMinutes: body.ExpiresInMinutes, CustomerID: body.CustomerID,
		PricingCurrency: body.PricingCurrency, PricingAmount: body.PricingAmount,
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

// GetPayment ports GET /api/organizations/{id}/payments/{paymentId}
func (h *OrganizationsHandler) GetPayment(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	paymentID := chi.URLParam(r, "paymentId")
	payment, err := h.payments.GetForOrganization(r.Context(), paymentID, org.ID, org.Environment)
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

// ListAPIKeys ports GET /api/organizations/{id}/api-keys
func (h *OrganizationsHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	list, err := h.apiKeys.List(r.Context(), org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list API keys")
		return
	}
	out := make([]*apikeyssvc.DashboardAPIKey, 0, len(list))
	for i := range list {
		out = append(out, apikeyssvc.ToDashboardAPIKey(&list[i]))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"apiKeys": out})
}

// CreateAPIKey ports POST /api/organizations/{id}/api-keys
func (h *OrganizationsHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		Name   string   `json:"name"`
		Scopes []string `json:"scopes"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "Name is required")
		return
	}
	key, raw, err := h.apiKeys.Create(r.Context(), org.ID, body.Name, org.Environment, body.Scopes)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to create API key")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{
		"apiKey": apikeyssvc.ToDashboardAPIKey(key),
		"secret": raw,
	})
}

// UpdateAPIKey ports PATCH /api/organizations/{id}/api-keys/{keyId}
func (h *OrganizationsHandler) UpdateAPIKey(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	keyID := chi.URLParam(r, "keyId")
	var body struct {
		Name   string   `json:"name"`
		Scopes []string `json:"scopes"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	key, err := h.apiKeys.Update(r.Context(), org.ID, keyID, org.Environment, body.Name, body.Scopes)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to update API key")
		return
	}
	if key == nil {
		httpx.Error(w, http.StatusNotFound, "API key not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"apiKey": apikeyssvc.ToDashboardAPIKey(key)})
}

// DeleteAPIKey ports DELETE /api/organizations/{id}/api-keys/{keyId}
func (h *OrganizationsHandler) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	keyID := chi.URLParam(r, "keyId")
	revokedAt, err := h.apiKeys.Revoke(r.Context(), org.ID, keyID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to revoke API key")
		return
	}
	if revokedAt == nil {
		httpx.Error(w, http.StatusNotFound, "API key not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"id": keyID, "revokedAt": revokedAt})
}

// ListWebhooks ports GET /api/organizations/{id}/webhooks
func (h *OrganizationsHandler) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	list, err := h.webhooks.ListEndpoints(r.Context(), org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list webhooks")
		return
	}
	out := make([]map[string]any, 0, len(list))
	for i := range list {
		out = append(out, webhooksvc.SerializeEndpointDashboard(&list[i]))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"endpoints": out})
}

// ListPaymentMethods ports GET /api/organizations/{id}/payment-methods
func (h *OrganizationsHandler) ListPaymentMethods(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	enabledOnly := r.URL.Query().Get("enabled") == "true"
	result, err := h.paymentMethods.List(r.Context(), org.ID, org.Environment, enabledOnly)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment methods")
		return
	}
	httpx.JSON(w, http.StatusOK, result)
}

// CreateWebhook ports POST /api/organizations/{id}/webhooks
func (h *OrganizationsHandler) CreateWebhook(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		URL    string   `json:"url"`
		Events []string `json:"events"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.URL) == "" {
		httpx.Error(w, http.StatusBadRequest, "URL is required")
		return
	}
	endpoint, err := h.webhooks.CreateEndpoint(r.Context(), org.ID, org.Environment, body.URL, body.Events)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to create webhook")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{
		"endpoint": webhooksvc.SerializeEndpointDashboard(endpoint),
	})
}

func setActiveOrgCookie(w http.ResponseWriter, organizationID string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     "payoes_active_org",
		Value:    organizationID,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 24 * 365,
	})
}
