package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
	webhooksvc "github.com/payoesteam/payoes/apps/api/internal/service/webhooks"
)

// WebhookDetailHandler ports webhook detail/test/rotate/retry routes.
type WebhookDetailHandler struct {
	orgs     *orgsvc.Service
	webhooks *webhooksvc.Service
}

func NewWebhookDetailHandler(orgs *orgsvc.Service, webhooks *webhooksvc.Service) *WebhookDetailHandler {
	return &WebhookDetailHandler{orgs: orgs, webhooks: webhooks}
}

func (h *WebhookDetailHandler) requireMember(w http.ResponseWriter, r *http.Request) (*orgsvc.Organization, bool) {
	orgsH := &OrganizationsHandler{orgs: h.orgs}
	org, _, ok := orgsH.requireMember(w, r)
	return org, ok
}

// Get ports GET /api/organizations/{id}/webhooks/{webhookId}
func (h *WebhookDetailHandler) Get(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	webhookID := chi.URLParam(r, "webhookId")
	endpoint, err := h.webhooks.GetEndpoint(r.Context(), org.ID, webhookID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load webhook")
		return
	}
	if endpoint == nil {
		httpx.Error(w, http.StatusNotFound, "Webhook not found")
		return
	}
	deliveries, err := h.webhooks.ListDeliveriesForEndpoint(r.Context(), org.ID, webhookID, org.Environment, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load deliveries")
		return
	}
	serialized := make([]map[string]any, 0, len(deliveries))
	for i := range deliveries {
		serialized = append(serialized, webhooksvc.SerializeDelivery(&deliveries[i]))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"endpoint":   webhooksvc.SerializeEndpointDashboard(endpoint),
		"deliveries": serialized,
	})
}

// Patch ports PATCH /api/organizations/{id}/webhooks/{webhookId}
func (h *WebhookDetailHandler) Patch(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		URL     *string  `json:"url"`
		Events  []string `json:"events"`
		Enabled *bool    `json:"enabled"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if body.URL != nil && strings.TrimSpace(*body.URL) == "" {
		httpx.Error(w, http.StatusBadRequest, "URL is required")
		return
	}
	if body.Events != nil && len(body.Events) == 0 {
		httpx.Error(w, http.StatusBadRequest, "events must contain at least one event")
		return
	}

	endpoint, err := h.webhooks.UpdateEndpoint(r.Context(), org.ID, chi.URLParam(r, "webhookId"), org.Environment, webhooksvc.UpdateEndpointInput{
		URL: body.URL, Events: body.Events, Enabled: body.Enabled,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to update webhook")
		return
	}
	if endpoint == nil {
		httpx.Error(w, http.StatusNotFound, "Webhook not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"endpoint": webhooksvc.SerializeEndpointDashboard(endpoint),
	})
}

// Delete ports DELETE /api/organizations/{id}/webhooks/{webhookId}
func (h *WebhookDetailHandler) Delete(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	deleted, err := h.webhooks.DeleteEndpoint(r.Context(), org.ID, chi.URLParam(r, "webhookId"), org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to delete webhook")
		return
	}
	if !deleted {
		httpx.Error(w, http.StatusNotFound, "Webhook not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// Test ports POST /api/organizations/{id}/webhooks/{webhookId}/test
func (h *WebhookDetailHandler) Test(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	delivery, err := h.webhooks.SendTest(r.Context(), org.ID, chi.URLParam(r, "webhookId"), org.Environment)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || strings.Contains(err.Error(), "Webhook not found") {
			httpx.Error(w, http.StatusBadRequest, "Webhook not found")
			return
		}
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"delivery": webhooksvc.SerializeDelivery(delivery)})
}

// RotateSecret ports POST /api/organizations/{id}/webhooks/{webhookId}/rotate-secret
func (h *WebhookDetailHandler) RotateSecret(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	secret, err := h.webhooks.RotateSecret(r.Context(), org.ID, chi.URLParam(r, "webhookId"), org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to rotate webhook secret")
		return
	}
	if secret == "" {
		httpx.Error(w, http.StatusNotFound, "Webhook not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"secret": secret})
}

// RetryDelivery ports POST .../webhooks/{webhookId}/deliveries/{deliveryId}/retry
func (h *WebhookDetailHandler) RetryDelivery(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	delivery, result, err := h.webhooks.RetryDelivery(
		r.Context(), org.ID, chi.URLParam(r, "webhookId"), chi.URLParam(r, "deliveryId"), org.Environment,
	)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	var serialized any
	if delivery != nil {
		serialized = webhooksvc.SerializeDelivery(delivery)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"delivery": serialized,
		"result":   result,
	})
}
