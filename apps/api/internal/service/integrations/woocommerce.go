package integrations

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ported from: apps/web/src/lib/integrations/woocommerce/orders.ts

func (s *Service) wooCommerceWebhookURL() string {
	return strings.TrimRight(s.cfg.APIURL, "/") + "/api/webhooks/woocommerce"
}

func (s *Service) wooCommerceFetch(ctx context.Context, storeURL, consumerKey, consumerSecret, path, method string, body any) (*http.Response, error) {
	origin, err := NormalizeWooCommerceStoreURL(storeURL)
	if err != nil {
		return nil, err
	}
	u, err := url.Parse(origin + "/wp-json/wc/v3" + path)
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("consumer_key", consumerKey)
	q.Set("consumer_secret", consumerSecret)
	u.RawQuery = q.Encode()

	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), reader)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	client := &http.Client{Timeout: 20 * time.Second}
	return client.Do(req)
}

func (s *Service) ValidateWooCommerceCredentials(ctx context.Context, storeURL, consumerKey, consumerSecret string) error {
	resp, err := s.wooCommerceFetch(ctx, storeURL, consumerKey, consumerSecret, "/system_status", http.MethodGet, nil)
	if err != nil {
		return fmt.Errorf("Unable to connect to WooCommerce with the provided keys")
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("Unable to connect to WooCommerce with the provided keys")
	}
	return nil
}

func (s *Service) RegisterWooCommerceOrderWebhook(ctx context.Context, storeURL, consumerKey, consumerSecret, secret string) (string, error) {
	resp, err := s.wooCommerceFetch(ctx, storeURL, consumerKey, consumerSecret, "/webhooks", http.MethodPost, map[string]any{
		"name":         "Payoes order created",
		"topic":        "order.created",
		"delivery_url": s.wooCommerceWebhookURL(),
		"secret":       secret,
		"status":       "active",
	})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var payload struct {
		ID      json.Number `json:"id"`
		Message string      `json:"message"`
	}
	_ = json.Unmarshal(raw, &payload)
	if resp.StatusCode >= 300 || payload.ID == "" {
		if payload.Message != "" {
			return "", fmt.Errorf("%s", payload.Message)
		}
		return "", fmt.Errorf("Unable to register WooCommerce webhook")
	}
	return payload.ID.String(), nil
}

func (s *Service) DeleteWooCommerceWebhook(ctx context.Context, storeURL, consumerKey, consumerSecret, webhookID string) error {
	resp, err := s.wooCommerceFetch(ctx, storeURL, consumerKey, consumerSecret,
		"/webhooks/"+webhookID+"?force=true", http.MethodDelete, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func (s *Service) WooCredentials(integ *Integration) (consumerKey, consumerSecret string, ok bool) {
	if integ.Credentials == nil {
		return "", "", false
	}
	key := integ.Credentials["consumerKey"]
	if key == "" {
		key = integ.Credentials["consumer_key"]
	}
	secret := integ.Credentials["consumerSecret"]
	if secret == "" {
		secret = integ.Credentials["consumer_secret"]
	}
	if key == "" || secret == "" {
		return "", "", false
	}
	return key, secret, true
}
