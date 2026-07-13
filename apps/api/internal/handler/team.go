package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/email"
	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

// TeamHandler serves organization member and invite management routes.
type TeamHandler struct {
	orgs   *orgsvc.Service
	mailer *email.Sender
	webURL string
}

func NewTeamHandler(orgs *orgsvc.Service, mailer *email.Sender, webURL string) *TeamHandler {
	return &TeamHandler{orgs: orgs, mailer: mailer, webURL: webURL}
}

func (h *TeamHandler) writeMembersError(w http.ResponseWriter, err error) {
	if status, message, code, ok := orgsvc.MembersHTTPStatus(err); ok {
		httpx.ErrorCode(w, status, message, code)
		return
	}
	httpx.Error(w, http.StatusInternalServerError, "Internal server error")
}

func (h *TeamHandler) requireMembership(w http.ResponseWriter, r *http.Request) (*orgsvc.Membership, string, bool) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return nil, "", false
	}
	orgID := chi.URLParam(r, "id")
	membership, err := h.orgs.GetMembership(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load membership")
		return nil, "", false
	}
	if membership == nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return nil, "", false
	}
	return membership, user.ID, true
}

func (h *TeamHandler) deliverInvite(data *orgsvc.InviteEmailData) {
	if data == nil || h.mailer == nil {
		return
	}
	base := strings.TrimRight(h.webURL, "/")
	expiresLabel := data.ExpiresAt.UTC().Format("January 2, 2006")
	html := email.OrganizationInviteHTML(email.OrganizationInviteEmail{
		Email:            data.To,
		OrganizationName: data.OrganizationName,
		Role:             data.Role,
		InviterName:      data.InviterName,
		InviterEmail:     data.InviterEmail,
		InviteURL:        base + "/invite/" + data.Token,
		ExpiresLabel:     expiresLabel,
		WordmarkURL:      email.DefaultWordmarkURL(h.webURL),
	})
	subject := "You've been invited to join " + data.OrganizationName + " on Payoes"
	h.mailer.Send(data.To, subject, html)
}

func (h *TeamHandler) sendInviteEmail(r *http.Request, inviteID string) error {
	data, err := h.orgs.GetInviteEmailData(r.Context(), inviteID)
	if err != nil {
		return err
	}
	h.deliverInvite(data)
	return nil
}

// UpdateMember ports PATCH /api/organizations/{id}/members/{userId}
func (h *TeamHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	membership, _, ok := h.requireMembership(w, r)
	if !ok {
		return
	}
	if membership.Role != "owner" {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return
	}

	var body struct {
		Role string `json:"role"`
	}
	if err := decodeBody(r, &body); err != nil || (body.Role != "admin" && body.Role != "member") {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	member, err := h.orgs.UpdateMemberRole(r.Context(), membership.OrganizationID, chi.URLParam(r, "userId"), body.Role)
	if err != nil {
		h.writeMembersError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"member": orgsvc.SerializeMembership(member)})
}

// DeleteMember ports DELETE /api/organizations/{id}/members/{userId}
func (h *TeamHandler) DeleteMember(w http.ResponseWriter, r *http.Request) {
	membership, actorID, ok := h.requireMembership(w, r)
	if !ok {
		return
	}
	if err := orgsvc.AssertCanManageTeam(membership.Role); err != nil {
		h.writeMembersError(w, err)
		return
	}
	if err := h.orgs.RemoveOrganizationMember(r.Context(), membership.OrganizationID, chi.URLParam(r, "userId"), actorID); err != nil {
		h.writeMembersError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"removed": true})
}

// ListInvites ports GET /api/organizations/{id}/invites
func (h *TeamHandler) ListInvites(w http.ResponseWriter, r *http.Request) {
	membership, _, ok := h.requireMembership(w, r)
	if !ok {
		return
	}
	if err := orgsvc.AssertCanManageTeam(membership.Role); err != nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return
	}
	invites, err := h.orgs.ListPendingInvites(r.Context(), membership.OrganizationID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list invites")
		return
	}
	out := make([]map[string]any, 0, len(invites))
	for _, inv := range invites {
		out = append(out, orgsvc.SerializePendingInvite(inv))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"invites": out})
}

// CreateInvite ports POST /api/organizations/{id}/invites
func (h *TeamHandler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	membership, userID, ok := h.requireMembership(w, r)
	if !ok {
		return
	}
	if err := orgsvc.AssertCanManageTeam(membership.Role); err != nil {
		h.writeMembersError(w, err)
		return
	}

	var body struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if !strings.Contains(body.Email, "@") {
		httpx.Error(w, http.StatusBadRequest, "Email must be valid")
		return
	}
	if body.Role != "admin" && body.Role != "member" {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	invite, err := h.orgs.CreateOrganizationInvite(r.Context(), membership.OrganizationID, body.Email, body.Role, userID)
	if err != nil {
		h.writeMembersError(w, err)
		return
	}
	if err := h.sendInviteEmail(r, invite.ID); err != nil {
		h.writeMembersError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"invite": orgsvc.SerializeInviteRecord(invite)})
}

// ResendInvite ports POST /api/organizations/{id}/invites/{inviteId}
func (h *TeamHandler) ResendInvite(w http.ResponseWriter, r *http.Request) {
	membership, _, ok := h.requireMembership(w, r)
	if !ok {
		return
	}
	if err := orgsvc.AssertCanManageTeam(membership.Role); err != nil {
		h.writeMembersError(w, err)
		return
	}
	invite, err := h.orgs.ResendOrganizationInvite(r.Context(), membership.OrganizationID, chi.URLParam(r, "inviteId"))
	if err != nil {
		h.writeMembersError(w, err)
		return
	}
	if err := h.sendInviteEmail(r, invite.ID); err != nil {
		h.writeMembersError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"invite": orgsvc.SerializeInviteRecord(invite)})
}

// RevokeInvite ports DELETE /api/organizations/{id}/invites/{inviteId}
func (h *TeamHandler) RevokeInvite(w http.ResponseWriter, r *http.Request) {
	membership, _, ok := h.requireMembership(w, r)
	if !ok {
		return
	}
	if err := orgsvc.AssertCanManageTeam(membership.Role); err != nil {
		h.writeMembersError(w, err)
		return
	}
	invite, err := h.orgs.RevokeOrganizationInvite(r.Context(), membership.OrganizationID, chi.URLParam(r, "inviteId"))
	if err != nil {
		h.writeMembersError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"invite": orgsvc.SerializeInviteRecord(invite)})
}
