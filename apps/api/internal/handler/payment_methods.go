package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
)

// CreatePaymentMethod ports POST /api/organizations/{id}/payment-methods
func (h *OrganizationsHandler) CreatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	var body struct {
		Type          string `json:"type"`
		AssetCode     string `json:"asset_code"`
		IssuerAddress string `json:"issuer_address"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.AssetCode) == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	var method *paymentmethodssvc.Method
	var err error
	switch body.Type {
	case "official":
		if !paymentmethodssvc.IsOfficialAssetCode(body.AssetCode) {
			httpx.Error(w, http.StatusBadRequest, "Unknown official asset")
			return
		}
		method, err = h.paymentMethods.AddOfficial(r.Context(), org.ID, body.AssetCode, org.Environment)
	case "custom":
		if strings.TrimSpace(body.IssuerAddress) == "" {
			httpx.Error(w, http.StatusBadRequest, "Invalid request")
			return
		}
		method, err = h.paymentMethods.AddCustom(r.Context(), org.ID, body.AssetCode, body.IssuerAddress, org.Environment)
	default:
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{
		"payment_method": paymentmethodssvc.Serialize(*method),
	})
}

// UpdatePaymentMethod ports PATCH /api/organizations/{id}/payment-methods/{methodId}
func (h *OrganizationsHandler) UpdatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	methodID := chi.URLParam(r, "methodId")
	var body struct {
		IsEnabled *bool `json:"is_enabled"`
	}
	if err := decodeBody(r, &body); err != nil || body.IsEnabled == nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	method, err := h.paymentMethods.Update(r.Context(), org.ID, methodID, *body.IsEnabled)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"payment_method": paymentmethodssvc.Serialize(*method),
	})
}

// DeletePaymentMethod ports DELETE /api/organizations/{id}/payment-methods/{methodId}
func (h *OrganizationsHandler) DeletePaymentMethod(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	methodID := chi.URLParam(r, "methodId")
	if err := h.paymentMethods.Remove(r.Context(), org.ID, methodID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// PatchPaymentMethodSettlement ports PATCH /api/organizations/{id}/payment-methods/settlement
func (h *OrganizationsHandler) PatchPaymentMethodSettlement(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		MethodID string `json:"method_id"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if _, err := uuid.Parse(body.MethodID); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	method, err := h.paymentMethods.SetDefaultSettlement(r.Context(), org.ID, body.MethodID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"payment_method": paymentmethodssvc.Serialize(*method),
	})
}

// ValidatePaymentMethod ports POST /api/organizations/{id}/payment-methods/validate
func (h *OrganizationsHandler) ValidatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		AssetCode     string `json:"asset_code"`
		IssuerAddress string `json:"issuer_address"`
	}
	if err := decodeBody(r, &body); err != nil ||
		strings.TrimSpace(body.AssetCode) == "" ||
		strings.TrimSpace(body.IssuerAddress) == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	result := h.paymentMethods.ValidateCustom(body.AssetCode, body.IssuerAddress, org.Environment)
	if !result.Valid {
		httpx.Error(w, http.StatusBadRequest, result.Error)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"valid":      true,
		"asset_name": result.AssetName,
		"issuer":     result.Issuer,
		"network":    result.Network,
	})
}
