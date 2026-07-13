package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	kycsvc "github.com/payoesteam/payoes/apps/api/internal/service/kyc"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

// VerificationHandler serves organization KYC routes.
type VerificationHandler struct {
	kyc  *kycsvc.Service
	orgs *orgsvc.Service
}

func NewVerificationHandler(kyc *kycsvc.Service, orgs *orgsvc.Service) *VerificationHandler {
	return &VerificationHandler{kyc: kyc, orgs: orgs}
}

func writeKycError(w http.ResponseWriter, err error) {
	var kycErr *kycsvc.ServiceError
	if errors.As(err, &kycErr) {
		status := http.StatusBadRequest
		switch kycErr.Code {
		case "forbidden":
			status = http.StatusForbidden
		case "not_found":
			status = http.StatusNotFound
		case "conflict":
			status = http.StatusConflict
		}
		httpx.ErrorCode(w, status, kycErr.Message, kycErr.Code)
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Error(w, http.StatusInternalServerError, "Internal server error")
}

// GetVerification ports GET /api/organizations/{id}/verification
func (h *VerificationHandler) GetVerification(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")
	membership, err := h.orgs.GetMembership(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load verification status")
		return
	}
	if membership == nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return
	}

	summary, err := h.kyc.GetSummary(r.Context(), orgID)
	if err != nil {
		writeKycError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, summary)
}

// StartVerification ports POST /api/organizations/{id}/verification
func (h *VerificationHandler) StartVerification(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")

	var body struct {
		AccountType *string `json:"account_type"`
	}
	_ = decodeBody(r, &body)
	if body.AccountType != nil {
		t := strings.TrimSpace(*body.AccountType)
		if t != "" && t != "personal" && t != "business" {
			httpx.Error(w, http.StatusBadRequest, "Invalid verification request")
			return
		}
		if t == "" {
			body.AccountType = nil
		} else {
			body.AccountType = &t
		}
	}

	application, err := h.kyc.StartVerification(r.Context(), orgID, user.ID, body.AccountType)
	if err != nil {
		writeKycError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"application": application})
}

// VerificationSession ports POST /api/organizations/{id}/verification/session
func (h *VerificationHandler) VerificationSession(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")

	var body struct {
		Action string `json:"action"`
	}
	_ = decodeBody(r, &body)

	if body.Action == "sync" {
		summary, err := h.kyc.SyncFromPersona(r.Context(), orgID)
		if err != nil {
			writeKycError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, summary)
		return
	}

	sessionData, err := h.kyc.GetSession(r.Context(), orgID, user.ID)
	if err != nil {
		writeKycError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, sessionData)
}

// PatchEnvironment ports PATCH /api/organizations/{id}/environment
func (h *OrganizationsHandler) PatchEnvironment(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")

	var body struct {
		Environment string `json:"environment"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if body.Environment != "sandbox" && body.Environment != "production" {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	membership, err := h.orgs.GetMembership(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to update environment")
		return
	}
	if membership == nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return
	}

	if body.Environment == "production" {
		if membership.Role != "owner" && membership.Role != "admin" {
			httpx.Error(w, http.StatusForbidden, "Only owners and admins can enable production")
			return
		}
		if err := h.kyc.AssertProductionReady(r.Context(), orgID); err != nil {
			writeKycError(w, err)
			return
		}
	}

	org, err := h.orgs.UpdateEnvironment(r.Context(), orgID, body.Environment)
	if err != nil || org == nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to update environment")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organization": orgsvc.SerializeOrganization(*org)})
}

// ListMembers ports GET /api/organizations/{id}/members
func (h *OrganizationsHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID := chi.URLParam(r, "id")
	membership, err := h.orgs.GetMembership(r.Context(), orgID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list members")
		return
	}
	if membership == nil {
		httpx.Error(w, http.StatusForbidden, "Forbidden")
		return
	}

	members, err := h.orgs.ListMembers(r.Context(), orgID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list members")
		return
	}

	type memberJSON struct {
		ID       string  `json:"id"`
		UserID   string  `json:"userId"`
		Role     string  `json:"role"`
		JoinedAt any     `json:"joinedAt"`
		Name     string  `json:"name"`
		Email    string  `json:"email"`
		Image    *string `json:"image"`
	}
	out := make([]memberJSON, 0, len(members))
	for _, m := range members {
		out = append(out, memberJSON{
			ID: m.ID, UserID: m.UserID, Role: m.Role, JoinedAt: m.JoinedAt,
			Name: m.Name, Email: m.Email, Image: m.Image,
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"members": out,
		"viewer": map[string]string{
			"userId": user.ID,
			"role":   membership.Role,
		},
	})
}
