package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	checkoutsessions "github.com/payoesteam/payoes/apps/api/internal/service/checkoutsessions"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

// CheckoutSessionsHandler serves dashboard checkout-session routes.
type CheckoutSessionsHandler struct {
	orgs     *orgsvc.Service
	sessions *checkoutsessions.Service
}

func NewCheckoutSessionsHandler(orgs *orgsvc.Service, sessions *checkoutsessions.Service) *CheckoutSessionsHandler {
	return &CheckoutSessionsHandler{orgs: orgs, sessions: sessions}
}

func (h *CheckoutSessionsHandler) requireMember(w http.ResponseWriter, r *http.Request) (*orgsvc.Organization, bool) {
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

// List ports GET /api/organizations/{id}/checkout-sessions
func (h *CheckoutSessionsHandler) List(w http.ResponseWriter, r *http.Request) {
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
		sessions, total, err := h.sessions.ListPaginated(r.Context(), org.ID, org.Environment, checkoutsessions.ListQuery{
			Page: page, PageSize: pageSize, Search: q.Get("search"),
			Status: q.Get("status"), SortOrder: q.Get("sortOrder"),
		})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Unable to list checkout sessions")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"checkout_sessions": sessions, "total": total})
		return
	}

	rows, err := h.sessions.List(r.Context(), org.ID, org.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list checkout sessions")
		return
	}
	serialized := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		serialized = append(serialized, checkoutsessions.Serialize(
			row, h.sessions.CheckoutURL(row.PaymentPublicID), nil, row.PaymentPublicID, nil,
		))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"checkout_sessions": serialized})
}

// Get ports GET /api/organizations/{id}/checkout-sessions/{sessionId}
func (h *CheckoutSessionsHandler) Get(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	sessionID := chi.URLParam(r, "sessionId")
	detail, err := h.sessions.GetDetail(r.Context(), sessionID, org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load checkout session")
		return
	}
	if detail == nil {
		httpx.Error(w, http.StatusNotFound, "Checkout session not found")
		return
	}
	httpx.JSON(w, http.StatusOK, checkoutsessions.SerializeSession(
		detail.Session,
		h.sessions.CheckoutURL(detail.Payment.PublicID),
		detail.CustomerPublicID,
		detail.Payment,
	))
}
