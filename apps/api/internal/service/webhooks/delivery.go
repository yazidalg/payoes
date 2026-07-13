package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

// ported from: apps/web/src/lib/webhooks/delivery.ts and signing.ts

const (
	WebhookMaxAttempts = 5
)

var webhookRetryDelays = []time.Duration{
	1 * time.Minute,
	5 * time.Minute,
	30 * time.Minute,
	2 * time.Hour,
	24 * time.Hour,
}

type Delivery struct {
	ID                string
	WebhookEndpointID string
	Event             string
	Payload           map[string]any
	Status            string
	ResponseStatus    *int
	ResponseBody      *string
	Attempts          int
	NextRetryAt       *time.Time
	LastError         *string
	CreatedAt         time.Time
	DeliveredAt       *time.Time
}

type DeliveryResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

func getRetryDelay(attemptNumber int) time.Duration {
	index := attemptNumber - 1
	if index < 0 {
		index = 0
	}
	if index >= len(webhookRetryDelays) {
		index = len(webhookRetryDelays) - 1
	}
	return webhookRetryDelays[index]
}

func buildWebhookBody(event string, payload map[string]any) ([]byte, error) {
	return json.Marshal(map[string]any{
		"event": event,
		"data":  payload,
	})
}

func buildWebhookTimestamp() int64 {
	return time.Now().Unix()
}

func buildWebhookSignature(secret string, timestamp int64, rawBody string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(fmt.Sprintf("%d.%s", timestamp, rawBody)))
	return fmt.Sprintf("t=%d,v1=%s", timestamp, hex.EncodeToString(mac.Sum(nil)))
}

func buildWebhookHeaders(secret, event, deliveryID, rawBody string) map[string]string {
	timestamp := buildWebhookTimestamp()
	return map[string]string{
		"Content-Type":        "application/json",
		"Payoes-Signature":    buildWebhookSignature(secret, timestamp, rawBody),
		"Payoes-Event":        event,
		"Payoes-Timestamp":    fmt.Sprintf("%d", timestamp),
		"Payoes-Delivery-ID":  deliveryID,
	}
}

func BuildTestWebhookPayload() map[string]any {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	return map[string]any{
		"id":               "pay_test_webhook",
		"object":           "payment_intent",
		"amount":           "0.0000001",
		"pricing_currency": "USD",
		"pricing_amount":   "10.00",
		"status":           "pending",
		"description":      "Payoes webhook test event",
		"metadata":         map[string]string{"payoes_test": "true"},
		"checkout_url":     nil,
		"source_type":      "direct",
		"customer_id":      nil,
		"payer_address":    nil,
		"tx_hash":          nil,
		"confirmed_at":     nil,
		"expires_at":       nil,
		"created_at":       now,
	}
}

func SerializeDelivery(d *Delivery) map[string]any {
	return map[string]any{
		"id":              d.ID,
		"event":           d.Event,
		"status":          d.Status,
		"responseStatus":  d.ResponseStatus,
		"responseBody":    d.ResponseBody,
		"payload":         d.Payload,
		"attempts":        d.Attempts,
		"maxAttempts":     WebhookMaxAttempts,
		"nextRetryAt":     d.NextRetryAt,
		"lastError":       d.LastError,
		"createdAt":       d.CreatedAt,
		"deliveredAt":     d.DeliveredAt,
	}
}

func (s *Service) scanDelivery(row scannable) (*Delivery, error) {
	var (
		d           Delivery
		payloadRaw  []byte
		respStatus  *int
		respBody    *string
		nextRetryAt *time.Time
		lastError   *string
		deliveredAt *time.Time
	)
	err := row.Scan(
		&d.ID, &d.WebhookEndpointID, &d.Event, &payloadRaw, &d.Status,
		&respStatus, &respBody, &d.Attempts, &nextRetryAt, &lastError,
		&d.CreatedAt, &deliveredAt,
	)
	if err != nil {
		return nil, err
	}
	d.ResponseStatus = respStatus
	d.ResponseBody = respBody
	d.NextRetryAt = nextRetryAt
	d.LastError = lastError
	d.DeliveredAt = deliveredAt
	if len(payloadRaw) > 0 {
		_ = json.Unmarshal(payloadRaw, &d.Payload)
	}
	if d.Payload == nil {
		d.Payload = map[string]any{}
	}
	return &d, nil
}

type scannable interface {
	Scan(dest ...any) error
}

const deliverySelect = `
	id, webhook_endpoint_id, event, payload, status,
	response_status, response_body, attempts, next_retry_at, last_error,
	created_at, delivered_at`

func (s *Service) ListDeliveriesForEndpoint(ctx context.Context, organizationID, webhookID, environment string, limit int) ([]Delivery, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT d.id, d.webhook_endpoint_id, d.event, d.payload, d.status,
			d.response_status, d.response_body, d.attempts, d.next_retry_at, d.last_error,
			d.created_at, d.delivered_at
		FROM webhook_deliveries d
		INNER JOIN webhook_endpoints e ON e.id = d.webhook_endpoint_id
		WHERE e.organization_id = $1 AND e.environment = $2 AND d.webhook_endpoint_id = $3
		ORDER BY d.created_at DESC
		LIMIT $4`, organizationID, environment, webhookID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Delivery
	for rows.Next() {
		d, err := s.scanDelivery(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *d)
	}
	return out, rows.Err()
}

func (s *Service) getEndpointWithSecret(ctx context.Context, organizationID, webhookID, environment string) (*Endpoint, error) {
	var (
		e         Endpoint
		eventsRaw []byte
		enabled   int
	)
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, environment, url, events, enabled, secret, created_at
		FROM webhook_endpoints
		WHERE id = $1 AND organization_id = $2 AND environment = $3
		LIMIT 1`, webhookID, organizationID, environment,
	).Scan(&e.ID, &e.OrganizationID, &e.Environment, &e.URL, &eventsRaw, &enabled, &e.Secret, &e.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	e.Events = scanEvents(eventsRaw)
	e.Enabled = enabled == 1
	return &e, nil
}

// ProcessDueRetries ports processDueWebhookRetries from delivery.ts
func (s *Service) ProcessDueRetries(ctx context.Context, limit int) (int, error) {
	if limit <= 0 {
		limit = 25
	}
	rows, err := s.pool.Query(ctx, `
		SELECT d.id, d.webhook_endpoint_id, d.event, d.payload, d.status,
			d.response_status, d.response_body, d.attempts, d.next_retry_at, d.last_error,
			d.created_at, d.delivered_at,
			e.url, e.secret, e.enabled
		FROM webhook_deliveries d
		INNER JOIN webhook_endpoints e ON e.id = d.webhook_endpoint_id
		WHERE d.status = 'pending'
		  AND d.next_retry_at IS NOT NULL
		  AND d.next_retry_at <= NOW()
		LIMIT $1`, limit)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type dueRow struct {
		delivery Delivery
		url      string
		secret   string
		enabled  int
	}
	var due []dueRow
	for rows.Next() {
		var (
			d           Delivery
			payloadRaw  []byte
			respStatus  *int
			respBody    *string
			nextRetryAt *time.Time
			lastError   *string
			deliveredAt *time.Time
			url         string
			secret      string
			enabled     int
		)
		if err := rows.Scan(
			&d.ID, &d.WebhookEndpointID, &d.Event, &payloadRaw, &d.Status,
			&respStatus, &respBody, &d.Attempts, &nextRetryAt, &lastError,
			&d.CreatedAt, &deliveredAt, &url, &secret, &enabled,
		); err != nil {
			return 0, err
		}
		d.ResponseStatus = respStatus
		d.ResponseBody = respBody
		d.NextRetryAt = nextRetryAt
		d.LastError = lastError
		d.DeliveredAt = deliveredAt
		if len(payloadRaw) > 0 {
			_ = json.Unmarshal(payloadRaw, &d.Payload)
		}
		if d.Payload == nil {
			d.Payload = map[string]any{}
		}
		due = append(due, dueRow{delivery: d, url: url, secret: secret, enabled: enabled})
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	for _, row := range due {
		if row.enabled != 1 {
			_, _ = s.pool.Exec(ctx, `
				UPDATE webhook_deliveries
				SET status = 'failed', last_error = $2, next_retry_at = NULL
				WHERE id = $1`, row.delivery.ID, "Webhook endpoint is disabled")
			continue
		}
		d := row.delivery
		_, _ = s.AttemptDelivery(ctx, &d, row.url, row.secret)
	}
	return len(due), nil
}

func (s *Service) EnqueueDelivery(ctx context.Context, endpointID, url, secret, event string, payload map[string]any) (*Delivery, error) {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	d, err := s.scanDelivery(s.pool.QueryRow(ctx, `
		INSERT INTO webhook_deliveries (webhook_endpoint_id, event, payload, status, attempts)
		VALUES ($1, $2, $3::jsonb, 'pending', 0)
		RETURNING `+deliverySelect, endpointID, event, payloadJSON))
	if err != nil {
		return nil, err
	}
	_, _ = s.AttemptDelivery(ctx, d, url, secret)
	return d, nil
}

func (s *Service) AttemptDelivery(ctx context.Context, delivery *Delivery, url, secret string) (DeliveryResult, error) {
	body, err := buildWebhookBody(delivery.Event, delivery.Payload)
	if err != nil {
		return DeliveryResult{}, err
	}
	headers := buildWebhookHeaders(secret, delivery.Event, delivery.ID, string(body))
	nextAttempt := delivery.Attempts + 1

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		_ = s.scheduleRetryOrFail(ctx, delivery.ID, nextAttempt, nil, err.Error(), err.Error())
		return DeliveryResult{Success: false, Error: err.Error()}, nil
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		msg := err.Error()
		_ = s.scheduleRetryOrFail(ctx, delivery.ID, nextAttempt, nil, msg, msg)
		return DeliveryResult{Success: false, Error: msg}, nil
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 4000))
	respBody := string(respBytes)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		status := resp.StatusCode
		truncated := respBody
		if len(truncated) > 4000 {
			truncated = truncated[:4000]
		}
		_, err = s.pool.Exec(ctx, `
			UPDATE webhook_deliveries
			SET status = 'delivered', attempts = $2, response_status = $3,
			    response_body = $4, delivered_at = NOW(), next_retry_at = NULL, last_error = NULL
			WHERE id = $1`, delivery.ID, nextAttempt, status, truncated)
		if err != nil {
			return DeliveryResult{}, err
		}
		return DeliveryResult{Success: true}, nil
	}

	errMsg := fmt.Sprintf("HTTP %d: %s", resp.StatusCode, truncate(respBody, 500))
	status := resp.StatusCode
	_ = s.scheduleRetryOrFail(ctx, delivery.ID, nextAttempt, &status, truncate(respBody, 4000), errMsg)
	return DeliveryResult{Success: false, Error: errMsg}, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func (s *Service) scheduleRetryOrFail(ctx context.Context, deliveryID string, attempts int, responseStatus *int, responseBody, lastError string) error {
	hasRetriesLeft := attempts < WebhookMaxAttempts
	status := "failed"
	var nextRetry *time.Time
	if hasRetriesLeft {
		status = "pending"
		t := time.Now().Add(getRetryDelay(attempts))
		nextRetry = &t
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE webhook_deliveries
		SET status = $2, attempts = $3, response_status = $4, response_body = $5,
		    last_error = $6, next_retry_at = $7, delivered_at = NULL
		WHERE id = $1`,
		deliveryID, status, attempts, responseStatus, responseBody, lastError, nextRetry,
	)
	return err
}

func (s *Service) SendTest(ctx context.Context, organizationID, webhookID, environment string) (*Delivery, error) {
	endpoint, err := s.getEndpointWithSecret(ctx, organizationID, webhookID, environment)
	if err != nil {
		return nil, err
	}
	if endpoint == nil {
		return nil, fmt.Errorf("Webhook not found")
	}
	delivery, err := s.EnqueueDelivery(ctx, endpoint.ID, endpoint.URL, endpoint.Secret, "webhook.test", BuildTestWebhookPayload())
	if err != nil {
		return nil, err
	}
	latest, err := s.scanDelivery(s.pool.QueryRow(ctx, `
		SELECT `+deliverySelect+` FROM webhook_deliveries WHERE id = $1 LIMIT 1`, delivery.ID))
	if err != nil {
		return nil, err
	}
	return latest, nil
}

func (s *Service) RetryDelivery(ctx context.Context, organizationID, webhookID, deliveryID, environment string) (*Delivery, DeliveryResult, error) {
	endpoint, err := s.getEndpointWithSecret(ctx, organizationID, webhookID, environment)
	if err != nil {
		return nil, DeliveryResult{}, err
	}
	if endpoint == nil {
		return nil, DeliveryResult{}, fmt.Errorf("Webhook not found")
	}

	delivery, err := s.scanDelivery(s.pool.QueryRow(ctx, `
		SELECT `+deliverySelect+`
		FROM webhook_deliveries
		WHERE id = $1 AND webhook_endpoint_id = $2
		LIMIT 1`, deliveryID, endpoint.ID))
	if err != nil {
		return nil, DeliveryResult{}, fmt.Errorf("Delivery not found")
	}
	if delivery.Status == "delivered" {
		return nil, DeliveryResult{}, fmt.Errorf("Delivery already succeeded")
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE webhook_deliveries
		SET status = 'pending', next_retry_at = NULL, last_error = NULL
		WHERE id = $1`, delivery.ID)
	if err != nil {
		return nil, DeliveryResult{}, err
	}

	fresh, err := s.scanDelivery(s.pool.QueryRow(ctx, `
		SELECT `+deliverySelect+` FROM webhook_deliveries WHERE id = $1 LIMIT 1`, delivery.ID))
	if err != nil {
		return nil, DeliveryResult{}, fmt.Errorf("Delivery not found")
	}

	result, err := s.AttemptDelivery(ctx, fresh, endpoint.URL, endpoint.Secret)
	if err != nil {
		return nil, DeliveryResult{}, err
	}

	latest, err := s.scanDelivery(s.pool.QueryRow(ctx, `
		SELECT `+deliverySelect+` FROM webhook_deliveries WHERE id = $1 LIMIT 1`, delivery.ID))
	if err != nil {
		return nil, result, err
	}
	return latest, result, nil
}
