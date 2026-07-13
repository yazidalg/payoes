package handler

import (
	"net/http"
	"strings"

	"github.com/payoesteam/payoes/apps/api/internal/config"
	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

// SessionHandler serves session helper routes.
type SessionHandler struct {
	orgs *orgsvc.Service
	cfg  config.Config
}

func NewSessionHandler(orgs *orgsvc.Service, cfg config.Config) *SessionHandler {
	return &SessionHandler{orgs: orgs, cfg: cfg}
}

// SetActiveOrganization ports POST /api/session/active-organization
func (h *SessionHandler) SetActiveOrganization(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		OrganizationID string `json:"organizationId"`
	}
	if err := decodeBody(r, &body); err != nil || body.OrganizationID == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	membership, err := h.orgs.GetMembership(r.Context(), body.OrganizationID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to set active organization")
		return
	}
	if membership == nil {
		httpx.Error(w, http.StatusForbidden, "You are not a member of this business")
		return
	}

	org, err := h.orgs.GetByID(r.Context(), body.OrganizationID)
	if err != nil || org == nil {
		httpx.Error(w, http.StatusNotFound, "Business not found")
		return
	}

	setActiveOrgCookie(w, org.ID, strings.HasPrefix(h.cfg.WebURL, "https://"))
	httpx.JSON(w, http.StatusOK, map[string]any{"organization": org})
}
