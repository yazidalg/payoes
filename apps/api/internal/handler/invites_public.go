package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

// InvitesPublicHandler serves public invite preview and accept routes.
type InvitesPublicHandler struct {
	orgs   *orgsvc.Service
	webURL string
}

func NewInvitesPublicHandler(orgs *orgsvc.Service, webURL string) *InvitesPublicHandler {
	return &InvitesPublicHandler{orgs: orgs, webURL: webURL}
}

func (h *InvitesPublicHandler) writeMembersError(w http.ResponseWriter, err error) {
	if status, message, code, ok := orgsvc.MembersHTTPStatus(err); ok {
		httpx.ErrorCode(w, status, message, code)
		return
	}
	httpx.Error(w, http.StatusInternalServerError, "Internal server error")
}

// GetInvite ports GET /api/invites/{token}
func (h *InvitesPublicHandler) GetInvite(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	invite, err := h.orgs.GetInvitePreview(r.Context(), token)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load invitation")
		return
	}
	if invite == nil {
		httpx.Error(w, http.StatusNotFound, "Invitation not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"invite": invite})
}

// AcceptInvite ports POST /api/invites/{token}/accept
func (h *InvitesPublicHandler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil || strings.TrimSpace(user.Email) == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	token := chi.URLParam(r, "token")
	result, err := h.orgs.AcceptOrganizationInvite(r.Context(), token, user.ID, user.Email)
	if err != nil {
		h.writeMembersError(w, err)
		return
	}

	setActiveOrgCookie(w, result.OrganizationID, strings.HasPrefix(h.webURL, "https://"))
	httpx.JSON(w, http.StatusOK, result)
}
