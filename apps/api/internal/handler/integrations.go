package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	integrationsvc "github.com/payoesteam/payoes/apps/api/internal/service/integrations"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

// IntegrationsHandler ports dashboard Shopify/WooCommerce integration routes.
type IntegrationsHandler struct {
	orgs         *orgsvc.Service
	integrations *integrationsvc.Service
	webURL       string
}

func NewIntegrationsHandler(orgs *orgsvc.Service, integrations *integrationsvc.Service, webURL string) *IntegrationsHandler {
	return &IntegrationsHandler{orgs: orgs, integrations: integrations, webURL: webURL}
}

func (h *IntegrationsHandler) requireMember(w http.ResponseWriter, r *http.Request) (*orgsvc.Organization, bool) {
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

func normalizeProvider(provider string) string {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "shopify", "woocommerce":
		return strings.ToLower(provider)
	default:
		return ""
	}
}

// List ports GET /api/organizations/{id}/integrations
func (h *IntegrationsHandler) List(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	list, err := h.integrations.List(r.Context(), org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to list integrations")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"integrations": list})
}

// Get ports GET /api/organizations/{id}/integrations/{provider}
func (h *IntegrationsHandler) Get(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	provider := normalizeProvider(chi.URLParam(r, "provider"))
	if provider == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid provider")
		return
	}
	catalogItem := integrationsvc.GetCatalogItem(provider)
	integ, err := h.integrations.Get(r.Context(), org.ID, org.Environment, provider)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load integration")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"catalogItem": catalogItem,
		"integration": integ,
	})
}

// Delete ports DELETE /api/organizations/{id}/integrations/{provider}
func (h *IntegrationsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	provider := normalizeProvider(chi.URLParam(r, "provider"))
	if provider == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid provider")
		return
	}
	integ, err := h.integrations.Get(r.Context(), org.ID, org.Environment, provider)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load integration")
		return
	}
	if integ == nil {
		httpx.Error(w, http.StatusNotFound, "Integration not found")
		return
	}

	if integ.ExternalWebhookID != nil && *integ.ExternalWebhookID != "" {
		switch provider {
		case "shopify":
			if integ.Status == "connected" {
				_ = h.integrations.DeleteShopifyWebhook(r.Context(), integ, *integ.ExternalWebhookID)
			}
		case "woocommerce":
			key, secret, okCreds := h.integrations.WooCredentials(integ)
			if okCreds {
				_ = h.integrations.DeleteWooCommerceWebhook(
					r.Context(), integ.StoreIdentifier, key, secret, *integ.ExternalWebhookID,
				)
			}
		}
	}

	updated, err := h.integrations.Disconnect(r.Context(), integ)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to disconnect integration")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"integration": updated})
}

// ConnectShopify ports POST /api/organizations/{id}/integrations/shopify/connect
func (h *IntegrationsHandler) ConnectShopify(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		Shop string `json:"shop"`
	}
	if err := decodeBody(r, &body); err != nil || strings.TrimSpace(body.Shop) == "" {
		httpx.Error(w, http.StatusBadRequest, "Shop domain is required")
		return
	}
	if _, err := h.integrations.UpsertPendingShopify(r.Context(), org.ID, org.Environment, body.Shop); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	authorizationURL, err := h.integrations.BuildShopifyOAuthURL(org.ID, org.Environment, body.Shop)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"authorizationUrl": authorizationURL})
}

// ConnectWooCommerce ports POST /api/organizations/{id}/integrations/woocommerce/connect
func (h *IntegrationsHandler) ConnectWooCommerce(w http.ResponseWriter, r *http.Request) {
	org, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	var body struct {
		StoreURL       string `json:"storeUrl"`
		ConsumerKey    string `json:"consumerKey"`
		ConsumerSecret string `json:"consumerSecret"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.StoreURL) == "" || strings.TrimSpace(body.ConsumerKey) == "" || strings.TrimSpace(body.ConsumerSecret) == "" {
		httpx.Error(w, http.StatusBadRequest, "Store URL, consumer key, and consumer secret are required")
		return
	}
	if err := h.integrations.ValidateWooCommerceCredentials(r.Context(), body.StoreURL, body.ConsumerKey, body.ConsumerSecret); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	integ, err := h.integrations.UpsertWooCommerce(
		r.Context(), org.ID, org.Environment, body.StoreURL, body.ConsumerKey, body.ConsumerSecret, nil,
	)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	secret := ""
	if integ.WebhookSecret != nil {
		secret = *integ.WebhookSecret
	}
	webhookID, err := h.integrations.RegisterWooCommerceOrderWebhook(
		r.Context(), integ.StoreIdentifier, body.ConsumerKey, body.ConsumerSecret, secret,
	)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.integrations.SetExternalWebhookID(r.Context(), integ.ID, webhookID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to save WooCommerce webhook")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"integration": updated})
}

// ShopifyCallback ports GET /api/integrations/shopify/callback
func (h *IntegrationsHandler) ShopifyCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	shop := r.URL.Query().Get("shop")
	base := strings.TrimRight(h.webURL, "/")

	if code == "" || state == "" || shop == "" {
		http.Redirect(w, r, base+"/dashboard/integrations/shopify?error=missing_params", http.StatusFound)
		return
	}
	if err := h.integrations.CompleteShopifyOAuth(r.Context(), code, state, shop); err != nil {
		http.Redirect(w, r, base+"/dashboard/integrations/shopify?error=connect_failed", http.StatusFound)
		return
	}
	http.Redirect(w, r, base+"/dashboard/integrations/shopify?connected=1", http.StatusFound)
}
