package integrations

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ported from: apps/web/src/lib/integrations/shopify/oauth.ts, orders.ts, state.ts

type oauthState struct {
	OrganizationID string `json:"organizationId"`
	Environment    string `json:"environment"`
	Provider       string `json:"provider"`
	Shop           string `json:"shop"`
	Nonce          string `json:"nonce"`
}

func (s *Service) stateSecret() string {
	if s.cfg.IntegrationsStateSecret != "" {
		return s.cfg.IntegrationsStateSecret
	}
	if s.cfg.AuthSecret != "" {
		return s.cfg.AuthSecret
	}
	return "payoes-integrations-dev-secret"
}

func (s *Service) CreateOAuthState(organizationID, environment, shop string) (string, error) {
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	payload := oauthState{
		OrganizationID: organizationID,
		Environment:    environment,
		Provider:       "shopify",
		Shop:           NormalizeShopifyShop(shop),
		Nonce:          base64.RawURLEncoding.EncodeToString(nonce),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	encoded := base64.RawURLEncoding.EncodeToString(raw)
	mac := hmac.New(sha256.New, []byte(s.stateSecret()))
	_, _ = mac.Write([]byte(encoded))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return encoded + "." + signature, nil
}

func (s *Service) ParseOAuthState(state string) (*oauthState, error) {
	parts := strings.Split(state, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("invalid state")
	}
	mac := hmac.New(sha256.New, []byte(s.stateSecret()))
	_, _ = mac.Write([]byte(parts[0]))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return nil, fmt.Errorf("invalid state")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid state")
	}
	var payload oauthState
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, fmt.Errorf("invalid state")
	}
	return &payload, nil
}

func (s *Service) ShopifyRedirectURI() string {
	base := strings.TrimRight(s.cfg.APIURL, "/")
	if base == "" {
		base = "http://localhost:8080"
	}
	return base + "/api/integrations/shopify/callback"
}

func (s *Service) BuildShopifyOAuthURL(organizationID, environment, shop string) (string, error) {
	if s.cfg.ShopifyClientID == "" {
		return "", fmt.Errorf("SHOPIFY_CLIENT_ID is not configured")
	}
	normalized := NormalizeShopifyShop(shop)
	state, err := s.CreateOAuthState(organizationID, environment, normalized)
	if err != nil {
		return "", err
	}
	scopes := s.cfg.ShopifyScopes
	if scopes == "" {
		scopes = "read_orders,write_orders"
	}
	params := url.Values{}
	params.Set("client_id", s.cfg.ShopifyClientID)
	params.Set("scope", scopes)
	params.Set("redirect_uri", s.ShopifyRedirectURI())
	params.Set("state", state)
	return fmt.Sprintf("https://%s/admin/oauth/authorize?%s", normalized, params.Encode()), nil
}

func (s *Service) ExchangeShopifyAccessToken(ctx context.Context, shop, code string) (string, error) {
	if s.cfg.ShopifyClientID == "" || s.cfg.ShopifyClientSecret == "" {
		return "", fmt.Errorf("Shopify OAuth is not configured")
	}
	normalized := NormalizeShopifyShop(shop)
	body, _ := json.Marshal(map[string]string{
		"client_id":     s.cfg.ShopifyClientID,
		"client_secret": s.cfg.ShopifyClientSecret,
		"code":          code,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("https://%s/admin/oauth/access_token", normalized),
		bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var payload struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	_ = json.Unmarshal(raw, &payload)
	if resp.StatusCode >= 300 || payload.AccessToken == "" {
		if payload.Error != "" {
			return "", fmt.Errorf("%s", payload.Error)
		}
		return "", fmt.Errorf("Unable to exchange Shopify access token")
	}
	return payload.AccessToken, nil
}

func (s *Service) shopifyWebhookURL() string {
	base := strings.TrimRight(s.cfg.APIURL, "/")
	return base + "/api/webhooks/shopify"
}

func (s *Service) shopifyAccessToken(integ *Integration) string {
	if integ.Credentials == nil {
		return ""
	}
	if v := integ.Credentials["accessToken"]; v != "" {
		return v
	}
	return integ.Credentials["access_token"]
}

func (s *Service) shopifyAdminFetch(ctx context.Context, integ *Integration, path, method string, body any) (*http.Response, error) {
	token := s.shopifyAccessToken(integ)
	if token == "" {
		return nil, fmt.Errorf("Shopify access token is missing")
	}
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method,
		fmt.Sprintf("https://%s/admin/api/2024-10%s", integ.StoreIdentifier, path), reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Shopify-Access-Token", token)
	client := &http.Client{Timeout: 20 * time.Second}
	return client.Do(req)
}

func formatShopifyConnectError(rawMessage string) string {
	lower := strings.ToLower(rawMessage)
	if strings.Contains(lower, "invalid topic") ||
		strings.Contains(lower, "missing access scope") ||
		strings.Contains(lower, "protected customer data") ||
		strings.Contains(lower, "topics allowed") {
		return rawMessage +
			" Your Shopify Partner app needs Admin API scopes read_orders and write_orders, " +
			"plus Protected customer data access (Partners Dashboard → App → API access requests). " +
			"Save those settings, then disconnect and reconnect the store. " +
			"See Payoes docs: Shopify integration → Partner app setup."
	}
	return rawMessage
}

func (s *Service) RegisterShopifyOrderWebhook(ctx context.Context, integ *Integration) (string, error) {
	resp, err := s.shopifyAdminFetch(ctx, integ, "/webhooks.json", http.MethodPost, map[string]any{
		"webhook": map[string]any{
			"topic":   "orders/create",
			"address": s.shopifyWebhookURL(),
			"format":  "json",
		},
	})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var payload struct {
		Webhook *struct {
			ID json.Number `json:"id"`
		} `json:"webhook"`
		Errors any `json:"errors"`
	}
	_ = json.Unmarshal(raw, &payload)
	if resp.StatusCode >= 300 || payload.Webhook == nil || payload.Webhook.ID == "" {
		message := "Unable to register Shopify webhook"
		switch errPayload := payload.Errors.(type) {
		case string:
			message = errPayload
		case map[string]any:
			parts := []string{}
			for field, messages := range errPayload {
				switch m := messages.(type) {
				case []any:
					for _, entry := range m {
						parts = append(parts, fmt.Sprintf("%s: %v", field, entry))
					}
				default:
					parts = append(parts, fmt.Sprintf("%s: %v", field, m))
				}
			}
			if len(parts) > 0 {
				message = strings.Join(parts, "; ")
			}
		}
		return "", fmt.Errorf("%s", formatShopifyConnectError(message))
	}
	return payload.Webhook.ID.String(), nil
}

func (s *Service) DeleteShopifyWebhook(ctx context.Context, integ *Integration, webhookID string) error {
	resp, err := s.shopifyAdminFetch(ctx, integ, "/webhooks/"+webhookID+".json", http.MethodDelete, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func (s *Service) CompleteShopifyOAuth(ctx context.Context, code, state, shop string) error {
	parsed, err := s.ParseOAuthState(state)
	if err != nil || parsed.Provider != "shopify" {
		return fmt.Errorf("invalid_state")
	}

	integ, err := s.Get(ctx, parsed.OrganizationID, parsed.Environment, "shopify")
	if err != nil {
		return err
	}
	if integ == nil {
		integ, err = s.UpsertPendingShopify(ctx, parsed.OrganizationID, parsed.Environment, shop)
		if err != nil {
			return err
		}
	}

	accessToken, err := s.ExchangeShopifyAccessToken(ctx, shop, code)
	if err != nil {
		_ = s.MarkError(ctx, integ.ID, err.Error())
		return fmt.Errorf("connect_failed")
	}

	connected, err := s.MarkShopifyConnected(ctx, integ.ID, accessToken, nil)
	if err != nil || connected == nil {
		_ = s.MarkError(ctx, integ.ID, "Unable to save Shopify connection")
		return fmt.Errorf("connect_failed")
	}

	webhookID, err := s.RegisterShopifyOrderWebhook(ctx, connected)
	if err != nil {
		_ = s.MarkError(ctx, integ.ID, err.Error())
		return fmt.Errorf("connect_failed")
	}
	_, err = s.SetExternalWebhookID(ctx, connected.ID, webhookID)
	if err != nil {
		_ = s.MarkError(ctx, integ.ID, err.Error())
		return fmt.Errorf("connect_failed")
	}
	return nil
}
