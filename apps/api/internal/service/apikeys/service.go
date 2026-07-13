package apikeys

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ported from: apps/web/src/lib/api-keys/service.ts

type APIKey struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	Name           string     `json:"name"`
	KeyPrefix      string     `json:"key_prefix"`
	KeyHash        string     `json:"-"`
	Environment    string     `json:"environment"`
	Scopes         []string   `json:"scopes"`
	LastUsedAt     *time.Time `json:"last_used_at"`
	RevokedAt      *time.Time `json:"revoked_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type PublicAPIKey struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"key_prefix"`
	Environment string    `json:"environment"`
	Scopes     []string   `json:"scopes"`
	LastUsedAt *time.Time `json:"last_used_at"`
	RevokedAt  *time.Time `json:"revoked_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func hashAPIKey(rawKey string) string {
	sum := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(sum[:])
}

func buildRawAPIKey(environment string) (string, error) {
	prefix := "pk_test_"
	if environment == "production" {
		prefix = "pk_live_"
	}
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return prefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

func scanScopes(raw []byte) []string {
	if len(raw) == 0 {
		return []string{"apis.all"}
	}
	var scopes []string
	if err := json.Unmarshal(raw, &scopes); err != nil {
		return []string{"apis.all"}
	}
	return scopes
}

func (s *Service) Authenticate(ctx context.Context, rawKey string) (*APIKey, error) {
	if !strings.HasPrefix(rawKey, "pk_test_") && !strings.HasPrefix(rawKey, "pk_live_") {
		return nil, nil
	}

	keyHash := hashAPIKey(rawKey)
	var (
		key      APIKey
		scopesRaw []byte
	)
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, name, key_prefix, key_hash, environment, scopes,
		       last_used_at, revoked_at, created_at
		FROM api_keys
		WHERE key_hash = $1 AND revoked_at IS NULL
		LIMIT 1`, keyHash).Scan(
		&key.ID, &key.OrganizationID, &key.Name, &key.KeyPrefix, &key.KeyHash,
		&key.Environment, &scopesRaw, &key.LastUsedAt, &key.RevokedAt, &key.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	key.Scopes = scanScopes(scopesRaw)

	_, _ = s.pool.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, key.ID)
	now := time.Now()
	key.LastUsedAt = &now
	return &key, nil
}

// DashboardAPIKey matches Next.js camelCase JSON for dashboard consumers.
type DashboardAPIKey struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	KeyPrefix   string     `json:"keyPrefix"`
	Environment string     `json:"environment"`
	Scopes      []string   `json:"scopes"`
	LastUsedAt  *time.Time `json:"lastUsedAt"`
	RevokedAt   *time.Time `json:"revokedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
}

func ToDashboardAPIKey(k *PublicAPIKey) *DashboardAPIKey {
	if k == nil {
		return nil
	}
	return &DashboardAPIKey{
		ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, Environment: k.Environment,
		Scopes: k.Scopes, LastUsedAt: k.LastUsedAt, RevokedAt: k.RevokedAt, CreatedAt: k.CreatedAt,
	}
}

func (s *Service) Get(ctx context.Context, organizationID, keyID, environment string) (*PublicAPIKey, error) {
	var (
		k         PublicAPIKey
		scopesRaw []byte
	)
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, key_prefix, environment, scopes, last_used_at, revoked_at, created_at
		FROM api_keys
		WHERE id = $1 AND organization_id = $2 AND environment = $3
		LIMIT 1`, keyID, organizationID, environment,
	).Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.Environment, &scopesRaw, &k.LastUsedAt, &k.RevokedAt, &k.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	k.Scopes = scanScopes(scopesRaw)
	return &k, nil
}

func (s *Service) List(ctx context.Context, organizationID, environment string) ([]PublicAPIKey, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, key_prefix, environment, scopes, last_used_at, revoked_at, created_at
		FROM api_keys
		WHERE organization_id = $1 AND environment = $2
		ORDER BY created_at DESC`, organizationID, environment)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []PublicAPIKey
	for rows.Next() {
		var (
			k         PublicAPIKey
			scopesRaw []byte
		)
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.Environment, &scopesRaw, &k.LastUsedAt, &k.RevokedAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		k.Scopes = scanScopes(scopesRaw)
		out = append(out, k)
	}
	return out, rows.Err()
}

func (s *Service) Create(ctx context.Context, organizationID, name, environment string, scopes []string) (*PublicAPIKey, string, error) {
	if len(scopes) == 0 {
		scopes = []string{"apis.all"}
	}
	rawKey, err := buildRawAPIKey(environment)
	if err != nil {
		return nil, "", err
	}
	keyPrefix := rawKey
	if len(keyPrefix) > 12 {
		keyPrefix = rawKey[:12] + "..."
	}
	scopesJSON, err := json.Marshal(scopes)
	if err != nil {
		return nil, "", err
	}

	var (
		k         PublicAPIKey
		scopesRaw []byte
	)
	err = s.pool.QueryRow(ctx, `
		INSERT INTO api_keys (organization_id, name, key_prefix, key_hash, environment, scopes)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb)
		RETURNING id, name, key_prefix, environment, scopes, last_used_at, revoked_at, created_at`,
		organizationID, strings.TrimSpace(name), keyPrefix, hashAPIKey(rawKey), environment, scopesJSON,
	).Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.Environment, &scopesRaw, &k.LastUsedAt, &k.RevokedAt, &k.CreatedAt)
	if err != nil {
		return nil, "", err
	}
	k.Scopes = scanScopes(scopesRaw)
	return &k, rawKey, nil
}

func (s *Service) Update(ctx context.Context, organizationID, keyID, environment, name string, scopes []string) (*PublicAPIKey, error) {
	scopesJSON, err := json.Marshal(scopes)
	if err != nil {
		return nil, err
	}
	var (
		k         PublicAPIKey
		scopesRaw []byte
	)
	err = s.pool.QueryRow(ctx, `
		UPDATE api_keys
		SET name = $1, scopes = $2::jsonb
		WHERE id = $3 AND organization_id = $4 AND environment = $5 AND revoked_at IS NULL
		RETURNING id, name, key_prefix, environment, scopes, last_used_at, revoked_at, created_at`,
		strings.TrimSpace(name), scopesJSON, keyID, organizationID, environment,
	).Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.Environment, &scopesRaw, &k.LastUsedAt, &k.RevokedAt, &k.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	k.Scopes = scanScopes(scopesRaw)
	return &k, nil
}

func (s *Service) Revoke(ctx context.Context, organizationID, keyID, environment string) (*time.Time, error) {
	var revokedAt time.Time
	err := s.pool.QueryRow(ctx, `
		UPDATE api_keys
		SET revoked_at = NOW()
		WHERE id = $1 AND organization_id = $2 AND environment = $3 AND revoked_at IS NULL
		RETURNING revoked_at`, keyID, organizationID, environment).Scan(&revokedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &revokedAt, nil
}

type LogRequestInput struct {
	OrganizationID string
	Environment    string
	APIKeyID       string
	Method         string
	Path           string
	StatusCode     int
	DurationMs     int
}

func (s *Service) LogRequest(ctx context.Context, input LogRequestInput) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO api_logs (organization_id, environment, api_key_id, method, path, status_code, duration_ms)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		input.OrganizationID, input.Environment, input.APIKeyID, input.Method, input.Path, input.StatusCode, input.DurationMs,
	)
	return err
}

// HasScope mirrors apiKeyHasScope in apps/web/src/lib/api-keys/scopes.ts
func HasScope(scopes []string, resource, action string) bool {
	if len(scopes) == 0 {
		scopes = []string{"apis.all"}
	}
	for _, scope := range scopes {
		if scope == "apis.all" {
			return true
		}
		if action == "read" && scope == "apis.read" {
			return true
		}
		if scope == resource+".write" {
			return true
		}
		if action == "read" && scope == resource+".read" {
			return true
		}
	}
	return false
}
