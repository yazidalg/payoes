package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	analyticssvc "github.com/payoesteam/payoes/apps/api/internal/service/analytics"
	apikeyssvc "github.com/payoesteam/payoes/apps/api/internal/service/apikeys"
	apilogssvc "github.com/payoesteam/payoes/apps/api/internal/service/apilogs"
	customersvc "github.com/payoesteam/payoes/apps/api/internal/service/customers"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
	settlementssvc "github.com/payoesteam/payoes/apps/api/internal/service/settlements"
)

const analyticsMaxRange = 366 * 24 * time.Hour

// OrgDashboardHandler serves organization dashboard list/detail endpoints
// that are not on OrganizationsHandler.
type OrgDashboardHandler struct {
	orgs        *orgsvc.Service
	analytics   *analyticssvc.Service
	payments    *paymentsvc.Service
	settlements *settlementssvc.Service
	apiLogs     *apilogssvc.Service
	apiKeys     *apikeyssvc.Service
	customers   *customersvc.Service
	webURL      string
}

func NewOrgDashboardHandler(
	orgs *orgsvc.Service,
	analytics *analyticssvc.Service,
	payments *paymentsvc.Service,
	settlements *settlementssvc.Service,
	apiLogs *apilogssvc.Service,
	apiKeys *apikeyssvc.Service,
	customers *customersvc.Service,
	webURL string,
) *OrgDashboardHandler {
	return &OrgDashboardHandler{
		orgs: orgs, analytics: analytics, payments: payments,
		settlements: settlements, apiLogs: apiLogs, apiKeys: apiKeys,
		customers: customers, webURL: webURL,
	}
}

func (h *OrgDashboardHandler) requireMember(w http.ResponseWriter, r *http.Request) (*orgsvc.Organization, bool) {
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

// GetAnalytics ports GET /api/organizations/{id}/analytics
func (h *OrgDashboardHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")
	from, err := parseRFC3339(fromStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid date range")
		return
	}
	to, err := parseRFC3339(toStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid date range")
		return
	}
	if from.After(to) {
		httpx.Error(w, http.StatusBadRequest, "Start date must be before end date")
		return
	}
	if to.Sub(from) > analyticsMaxRange {
		httpx.Error(w, http.StatusBadRequest, "Date range cannot exceed one year")
		return
	}

	analytics, err := h.analytics.GetOrganizationAnalytics(r.Context(), org.ID, org.Environment, from, to)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load analytics")
		return
	}
	httpx.JSON(w, http.StatusOK, analytics)
}

// GetPaymentCounts ports GET /api/organizations/{id}/payments/counts
func (h *OrgDashboardHandler) GetPaymentCounts(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	counts, err := h.payments.GetHubCounts(r.Context(), org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load payment counts")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"counts": counts})
}

// ListTransactions ports GET /api/organizations/{id}/transactions
func (h *OrgDashboardHandler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()
	pageRaw := q.Get("page")
	pageSizeRaw := q.Get("pageSize")
	sortOrder := q.Get("sortOrder")
	search := q.Get("search")
	customerStatus := q.Get("customerStatus")

	hasListParams := pageRaw != "" || pageSizeRaw != "" || search != "" ||
		customerStatus != "" || sortOrder != ""

	if !hasListParams {
		list, err := h.payments.ListCompleted(r.Context(), org.ID, org.Environment)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to list transactions")
			return
		}
		serialized, err := h.payments.SerializeMany(r.Context(), list, h.webURL)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to serialize transactions")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"transactions": serialized})
		return
	}

	query := paymentsvc.ListTransactionsQuery{
		Search:         search,
		CustomerStatus: customerStatus,
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

	list, total, err := h.payments.ListTransactionsPaginated(r.Context(), org.ID, org.Environment, query)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list transactions")
		return
	}
	serialized, err := h.payments.SerializeMany(r.Context(), list, h.webURL)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to serialize transactions")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"transactions": serialized, "total": total})
}

// ListSettlements ports GET /api/organizations/{id}/settlements
func (h *OrgDashboardHandler) ListSettlements(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()
	pageRaw := q.Get("page")
	pageSizeRaw := q.Get("pageSize")
	sortOrder := q.Get("sortOrder")
	search := q.Get("search")
	conversionType := q.Get("conversionType")

	hasListParams := pageRaw != "" || pageSizeRaw != "" || search != "" ||
		conversionType != "" || sortOrder != ""

	if !hasListParams {
		list, err := h.settlements.List(r.Context(), org.ID, org.Environment, 100)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to list settlements")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"settlements": list})
		return
	}

	query := settlementssvc.ListQuery{
		Search:         search,
		ConversionType: conversionType,
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
	if conversionType != "" && conversionType != "path" && conversionType != "direct" {
		httpx.Error(w, http.StatusBadRequest, "Invalid query")
		return
	}

	list, total, err := h.settlements.ListPaginated(r.Context(), org.ID, org.Environment, query)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list settlements")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"settlements": list, "total": total})
}

// ListAPILogs ports GET /api/organizations/{id}/api-logs
func (h *OrgDashboardHandler) ListAPILogs(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	logs, total, err := h.apiLogs.ListPaginated(r.Context(), org.ID, org.Environment, apilogssvc.ListQuery{
		Page:        page,
		PageSize:    pageSize,
		Search:      q.Get("search"),
		Method:      q.Get("method"),
		StatusGroup: q.Get("statusGroup"),
		APIKeyID:    q.Get("apiKeyId"),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list API logs")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"logs": logs, "total": total})
}

// GetAPIKey ports GET /api/organizations/{id}/api-keys/{keyId}
func (h *OrgDashboardHandler) GetAPIKey(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	keyID := chi.URLParam(r, "keyId")
	key, err := h.apiKeys.Get(r.Context(), org.ID, keyID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load API key")
		return
	}
	if key == nil {
		httpx.Error(w, http.StatusNotFound, "API key not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"apiKey": apikeyssvc.ToDashboardAPIKey(key)})
}

// UpdateCustomer ports PATCH /api/organizations/{id}/customers/{customerId}
func (h *OrgDashboardHandler) UpdateCustomer(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
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

	var raw map[string]json.RawMessage
	if err := decodeBody(r, &raw); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	input := customersvc.UpdateInput{}
	if v, ok := raw["email"]; ok {
		input.SetEmail = true
		if string(v) != "null" {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				httpx.Error(w, http.StatusBadRequest, "Invalid request")
				return
			}
			input.Email = &s
		}
	}
	if v, ok := raw["name"]; ok {
		input.SetName = true
		if string(v) != "null" {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				httpx.Error(w, http.StatusBadRequest, "Invalid request")
				return
			}
			if len(s) > 200 {
				httpx.Error(w, http.StatusBadRequest, "Invalid request")
				return
			}
			input.Name = &s
		}
	}
	if v, ok := raw["primary_stellar_address"]; ok {
		input.SetWallet = true
		if string(v) != "null" {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				httpx.Error(w, http.StatusBadRequest, "Invalid request")
				return
			}
			input.PrimaryStellarAddress = &s
		}
	}
	if v, ok := raw["notes"]; ok {
		input.SetNotes = true
		if string(v) != "null" {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				httpx.Error(w, http.StatusBadRequest, "Invalid request")
				return
			}
			if len(s) > 2000 {
				httpx.Error(w, http.StatusBadRequest, "Invalid request")
				return
			}
			input.Notes = &s
		}
	}
	if v, ok := raw["metadata"]; ok {
		input.SetMetadata = true
		if string(v) != "null" {
			var meta map[string]string
			if err := json.Unmarshal(v, &meta); err != nil {
				httpx.Error(w, http.StatusBadRequest, "Invalid request")
				return
			}
			input.Metadata = meta
		}
	}

	updated, err := h.customers.Update(r.Context(), customer, input)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, customersvc.Serialize(updated))
}

func parseRFC3339(value string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339Nano, value); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, value)
}
