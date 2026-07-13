package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"io"
	"net/http"
	"strings"

	"github.com/payoesteam/payoes/apps/api/internal/config"
	"github.com/payoesteam/payoes/apps/api/internal/httpx"
)

// InboundWebhooksHandler handles third-party inbound webhooks.
type InboundWebhooksHandler struct {
	cfg config.Config
}

func NewInboundWebhooksHandler(cfg config.Config) *InboundWebhooksHandler {
	return &InboundWebhooksHandler{cfg: cfg}
}

// Persona ports POST /api/webhooks/persona
func (h *InboundWebhooksHandler) Persona(w http.ResponseWriter, r *http.Request) {
	if h.cfg.PersonaWebhookSecret == "" {
		httpx.Error(w, http.StatusUnauthorized, "Invalid webhook signature")
		return
	}
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}
	if !verifyPersonaSignature(rawBody, r.Header.Get("persona-signature"), h.cfg.PersonaWebhookSecret) {
		httpx.Error(w, http.StatusUnauthorized, "Invalid webhook signature")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"received": true})
}

// Shopify ports POST /api/webhooks/shopify
func (h *InboundWebhooksHandler) Shopify(w http.ResponseWriter, r *http.Request) {
	secret := h.cfg.ShopifyClientSecret
	if secret == "" {
		httpx.Error(w, http.StatusUnauthorized, "Invalid webhook signature")
		return
	}
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}
	if !verifyShopifyHMAC(rawBody, r.Header.Get("x-shopify-hmac-sha256"), secret) {
		httpx.Error(w, http.StatusUnauthorized, "Invalid webhook signature")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"received": true})
}

// WooCommerce ports POST /api/webhooks/woocommerce
func (h *InboundWebhooksHandler) WooCommerce(w http.ResponseWriter, r *http.Request) {
	secret := h.cfg.IntegrationsStateSecret
	if secret == "" {
		httpx.Error(w, http.StatusUnauthorized, "Invalid webhook signature")
		return
	}
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}
	signature := r.Header.Get("x-wc-webhook-signature")
	if signature == "" {
		signature = r.Header.Get("X-WC-Webhook-Signature")
	}
	if !verifyWooCommerceSignature(rawBody, signature, secret) {
		httpx.Error(w, http.StatusUnauthorized, "Invalid webhook signature")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"received": true})
}

func verifyPersonaSignature(rawBody []byte, signatureHeader, secret string) bool {
	if signatureHeader == "" {
		return false
	}
	parts := map[string]string{}
	for _, part := range strings.Split(signatureHeader, ",") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) == 2 {
			parts[kv[0]] = kv[1]
		}
	}
	timestamp := parts["t"]
	signature := parts["v1"]
	if timestamp == "" || signature == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(timestamp + "." + string(rawBody)))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func verifyShopifyHMAC(rawBody []byte, signatureHeader, secret string) bool {
	if signatureHeader == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(rawBody)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signatureHeader))
}

func verifyWooCommerceSignature(rawBody []byte, signatureHeader, secret string) bool {
	if signatureHeader == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(rawBody)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signatureHeader))
}
