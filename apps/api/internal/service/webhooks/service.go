package webhooks

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ported from: apps/web/src/lib/webhooks/service.ts and delivery.ts

type Endpoint struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"-"`
	Environment    string    `json:"environment"`
	URL            string    `json:"url"`
	Events         []string  `json:"events"`
	Enabled        bool      `json:"enabled"`
	Secret         string    `json:"secret,omitempty"`
	SecretPreview  string    `json:"secret_preview,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// SerializeEndpointDashboard matches Next.js dashboard webhook JSON (camelCase + enabled as 0/1).
func SerializeEndpointDashboard(e *Endpoint) map[string]any {
	if e == nil {
		return nil
	}
	enabled := 0
	if e.Enabled {
		enabled = 1
	}
	out := map[string]any{
		"id":        e.ID,
		"url":       e.URL,
		"events":    e.Events,
		"enabled":   enabled,
		"createdAt": e.CreatedAt,
	}
	if e.SecretPreview != "" {
		out["secretPreview"] = e.SecretPreview
	}
	if e.Secret != "" {
		out["secret"] = e.Secret
	}
	return out
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func maskWebhookSecret(secret string) string {
	if len(secret) <= 8 {
		return "••••••••"
	}
	return secret[:4] + "••••••••" + secret[len(secret)-4:]
}

func createWebhookSecret() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "whsec_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func scanEvents(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var events []string
	_ = json.Unmarshal(raw, &events)
	return events
}

func (s *Service) ListEndpoints(ctx context.Context, organizationID, environment string) ([]Endpoint, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, environment, url, events, enabled, secret, created_at
		FROM webhook_endpoints
		WHERE organization_id = $1 AND environment = $2
		ORDER BY created_at DESC`, organizationID, environment)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Endpoint
	for rows.Next() {
		var (
			e         Endpoint
			eventsRaw []byte
			enabled   int
			secret    string
		)
		if err := rows.Scan(&e.ID, &e.OrganizationID, &e.Environment, &e.URL, &eventsRaw, &enabled, &secret, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.Events = scanEvents(eventsRaw)
		e.Enabled = enabled == 1
		e.SecretPreview = maskWebhookSecret(secret)
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Service) CreateEndpoint(ctx context.Context, organizationID, environment, url string, events []string) (*Endpoint, error) {
	secret, err := createWebhookSecret()
	if err != nil {
		return nil, err
	}
	if events == nil {
		events = []string{}
	}
	eventsJSON, err := json.Marshal(events)
	if err != nil {
		return nil, err
	}

	var (
		e         Endpoint
		eventsRaw []byte
		enabled   int
	)
	err = s.pool.QueryRow(ctx, `
		INSERT INTO webhook_endpoints (organization_id, environment, url, events, secret)
		VALUES ($1, $2, $3, $4::jsonb, $5)
		RETURNING id, organization_id, environment, url, events, enabled, secret, created_at`,
		organizationID, environment, strings.TrimSpace(url), eventsJSON, secret,
	).Scan(&e.ID, &e.OrganizationID, &e.Environment, &e.URL, &eventsRaw, &enabled, &e.Secret, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	e.Events = scanEvents(eventsRaw)
	e.Enabled = enabled == 1
	return &e, nil
}

func (s *Service) GetEndpoint(ctx context.Context, organizationID, webhookID, environment string) (*Endpoint, error) {
	var (
		e         Endpoint
		eventsRaw []byte
		enabled   int
		secret    string
	)
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, environment, url, events, enabled, secret, created_at
		FROM webhook_endpoints
		WHERE id = $1 AND organization_id = $2 AND environment = $3
		LIMIT 1`, webhookID, organizationID, environment,
	).Scan(&e.ID, &e.OrganizationID, &e.Environment, &e.URL, &eventsRaw, &enabled, &secret, &e.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	e.Events = scanEvents(eventsRaw)
	e.Enabled = enabled == 1
	e.SecretPreview = maskWebhookSecret(secret)
	return &e, nil
}

type UpdateEndpointInput struct {
	URL     *string
	Events  []string
	Enabled *bool
}

func (s *Service) UpdateEndpoint(ctx context.Context, organizationID, webhookID, environment string, input UpdateEndpointInput) (*Endpoint, error) {
	existing, err := s.getEndpointWithSecret(ctx, organizationID, webhookID, environment)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}

	url := existing.URL
	if input.URL != nil {
		url = strings.TrimSpace(*input.URL)
	}
	events := existing.Events
	if input.Events != nil {
		events = input.Events
	}
	enabled := 0
	if existing.Enabled {
		enabled = 1
	}
	if input.Enabled != nil {
		if *input.Enabled {
			enabled = 1
		} else {
			enabled = 0
		}
	}
	eventsJSON, err := json.Marshal(events)
	if err != nil {
		return nil, err
	}

	var (
		e         Endpoint
		eventsRaw []byte
		enabledOut int
		secret    string
	)
	err = s.pool.QueryRow(ctx, `
		UPDATE webhook_endpoints
		SET url = $2, events = $3::jsonb, enabled = $4, updated_at = NOW()
		WHERE id = $1
		RETURNING id, organization_id, environment, url, events, enabled, secret, created_at`,
		existing.ID, url, eventsJSON, enabled,
	).Scan(&e.ID, &e.OrganizationID, &e.Environment, &e.URL, &eventsRaw, &enabledOut, &secret, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	e.Events = scanEvents(eventsRaw)
	e.Enabled = enabledOut == 1
	e.SecretPreview = maskWebhookSecret(secret)
	return &e, nil
}

func (s *Service) RotateSecret(ctx context.Context, organizationID, webhookID, environment string) (string, error) {
	existing, err := s.getEndpointWithSecret(ctx, organizationID, webhookID, environment)
	if err != nil {
		return "", err
	}
	if existing == nil {
		return "", nil
	}
	secret, err := createWebhookSecret()
	if err != nil {
		return "", err
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE webhook_endpoints SET secret = $2, updated_at = NOW() WHERE id = $1`,
		existing.ID, secret)
	if err != nil {
		return "", err
	}
	return secret, nil
}

func (s *Service) DeleteEndpoint(ctx context.Context, organizationID, webhookID, environment string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM webhook_endpoints
		WHERE id = $1 AND organization_id = $2 AND environment = $3`,
		webhookID, organizationID, environment)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
