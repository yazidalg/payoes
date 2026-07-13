package integrations

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ported from: apps/web/src/lib/integrations/service.ts and catalog.ts

type CatalogItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Href        string `json:"href"`
	DocsPath    string `json:"docsPath"`
}

type Integration struct {
	ID                 string            `json:"id"`
	OrganizationID     string            `json:"organizationId"`
	Environment        string            `json:"environment"`
	Provider           string            `json:"provider"`
	Status             string            `json:"status"`
	StoreIdentifier    string            `json:"storeIdentifier"`
	Credentials        map[string]string `json:"credentials"`
	WebhookSecret      *string           `json:"webhookSecret"`
	ExternalWebhookID  *string           `json:"externalWebhookId"`
	Settings           map[string]string `json:"settings"`
	LastError          *string           `json:"lastError"`
	ConnectedAt        *time.Time        `json:"connectedAt"`
	CreatedAt          time.Time         `json:"createdAt"`
	UpdatedAt          time.Time         `json:"updatedAt"`
}

type ListItem struct {
	CatalogItem
	Integration *Integration `json:"integration"`
}

var catalog = []CatalogItem{
	{
		ID:          "shopify",
		Name:        "Shopify",
		Description: "Create Payoes payments when new Shopify orders are placed.",
		Href:        "/dashboard/integrations/shopify",
		DocsPath:    "/guides/integrations/shopify",
	},
	{
		ID:          "woocommerce",
		Name:        "WooCommerce",
		Description: "Create Payoes payments when new WooCommerce orders are placed.",
		Href:        "/dashboard/integrations/woocommerce",
		DocsPath:    "/guides/integrations/woocommerce",
	},
}

type Config struct {
	APIURL                  string
	WebURL                  string
	ShopifyClientID         string
	ShopifyClientSecret     string
	ShopifyScopes           string
	IntegrationsStateSecret string
	AuthSecret              string
}

type Service struct {
	pool *pgxpool.Pool
	cfg  Config
}

func NewService(pool *pgxpool.Pool, cfg Config) *Service {
	return &Service{pool: pool, cfg: cfg}
}

func Catalog() []CatalogItem {
	return append([]CatalogItem{}, catalog...)
}

func GetCatalogItem(provider string) *CatalogItem {
	for i := range catalog {
		if catalog[i].ID == provider {
			item := catalog[i]
			return &item
		}
	}
	return nil
}

func createWebhookSecret() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "intsec_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func NormalizeShopifyShop(input string) string {
	trimmed := strings.ToLower(strings.TrimSpace(input))
	trimmed = strings.TrimPrefix(trimmed, "https://")
	trimmed = strings.TrimPrefix(trimmed, "http://")
	withoutPath := strings.Split(trimmed, "/")[0]
	if strings.HasSuffix(withoutPath, ".myshopify.com") {
		return withoutPath
	}
	slug := strings.TrimSuffix(withoutPath, ".myshopify.com")
	return slug + ".myshopify.com"
}

func NormalizeWooCommerceStoreURL(input string) (string, error) {
	trimmed := strings.TrimRight(strings.TrimSpace(input), "/")
	withProtocol := trimmed
	if !strings.HasPrefix(trimmed, "http://") && !strings.HasPrefix(trimmed, "https://") {
		withProtocol = "https://" + trimmed
	}
	u, err := url.Parse(withProtocol)
	if err != nil {
		return "", err
	}
	return u.Scheme + "://" + u.Host, nil
}

type scannable interface {
	Scan(dest ...any) error
}

func (s *Service) scanIntegration(row scannable) (*Integration, error) {
	var (
		integ       Integration
		credsRaw    []byte
		settingsRaw []byte
	)
	err := row.Scan(
		&integ.ID, &integ.OrganizationID, &integ.Environment, &integ.Provider, &integ.Status,
		&integ.StoreIdentifier, &credsRaw, &integ.WebhookSecret, &integ.ExternalWebhookID,
		&settingsRaw, &integ.LastError, &integ.ConnectedAt, &integ.CreatedAt, &integ.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(credsRaw) > 0 {
		_ = json.Unmarshal(credsRaw, &integ.Credentials)
	}
	if len(settingsRaw) > 0 {
		_ = json.Unmarshal(settingsRaw, &integ.Settings)
	}
	if integ.Settings == nil {
		integ.Settings = map[string]string{}
	}
	return &integ, nil
}

const integrationSelect = `
	id, organization_id, environment, provider, status, store_identifier,
	credentials, webhook_secret, external_webhook_id, settings, last_error,
	connected_at, created_at, updated_at`

func (s *Service) List(ctx context.Context, organizationID, environment string) ([]ListItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+integrationSelect+`
		FROM organization_integrations
		WHERE organization_id = $1 AND environment = $2`, organizationID, environment)
	if err != nil {
		// Table may be missing in older DBs; return catalog with null integrations.
		return mapCatalog(nil), nil
	}
	defer rows.Close()

	byProvider := map[string]*Integration{}
	for rows.Next() {
		integ, err := s.scanIntegration(rows)
		if err != nil {
			return mapCatalog(nil), nil
		}
		byProvider[integ.Provider] = integ
	}
	return mapCatalog(byProvider), rows.Err()
}

func mapCatalog(byProvider map[string]*Integration) []ListItem {
	out := make([]ListItem, 0, len(catalog))
	for _, item := range catalog {
		entry := ListItem{CatalogItem: item}
		if byProvider != nil {
			entry.Integration = byProvider[item.ID]
		}
		out = append(out, entry)
	}
	return out
}

func (s *Service) Get(ctx context.Context, organizationID, environment, provider string) (*Integration, error) {
	return s.scanIntegration(s.pool.QueryRow(ctx, `
		SELECT `+integrationSelect+`
		FROM organization_integrations
		WHERE organization_id = $1 AND environment = $2 AND provider = $3
		LIMIT 1`, organizationID, environment, provider))
}

func (s *Service) UpsertPendingShopify(ctx context.Context, organizationID, environment, shop string) (*Integration, error) {
	storeIdentifier := NormalizeShopifyShop(shop)
	existing, err := s.Get(ctx, organizationID, environment, "shopify")
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return s.scanIntegration(s.pool.QueryRow(ctx, `
			UPDATE organization_integrations
			SET store_identifier = $2, status = 'pending', last_error = NULL, updated_at = NOW()
			WHERE id = $1
			RETURNING `+integrationSelect, existing.ID, storeIdentifier))
	}
	secret, err := createWebhookSecret()
	if err != nil {
		return nil, err
	}
	return s.scanIntegration(s.pool.QueryRow(ctx, `
		INSERT INTO organization_integrations (
			organization_id, environment, provider, status, store_identifier, webhook_secret
		) VALUES ($1, $2, 'shopify', 'pending', $3, $4)
		RETURNING `+integrationSelect, organizationID, environment, storeIdentifier, secret))
}

func (s *Service) MarkShopifyConnected(ctx context.Context, integrationID, accessToken string, externalWebhookID *string) (*Integration, error) {
	creds, err := json.Marshal(map[string]string{"accessToken": accessToken})
	if err != nil {
		return nil, err
	}
	return s.scanIntegration(s.pool.QueryRow(ctx, `
		UPDATE organization_integrations
		SET status = 'connected', credentials = $2::jsonb, external_webhook_id = COALESCE($3, external_webhook_id),
		    connected_at = NOW(), last_error = NULL, updated_at = NOW()
		WHERE id = $1
		RETURNING `+integrationSelect, integrationID, creds, externalWebhookID))
}

func (s *Service) UpsertWooCommerce(ctx context.Context, organizationID, environment, storeURL, consumerKey, consumerSecret string, externalWebhookID *string) (*Integration, error) {
	storeIdentifier, err := NormalizeWooCommerceStoreURL(storeURL)
	if err != nil {
		return nil, fmt.Errorf("Store URL must be valid")
	}
	creds, err := json.Marshal(map[string]string{
		"consumerKey":    consumerKey,
		"consumerSecret": consumerSecret,
	})
	if err != nil {
		return nil, err
	}

	existing, err := s.Get(ctx, organizationID, environment, "woocommerce")
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return s.scanIntegration(s.pool.QueryRow(ctx, `
			UPDATE organization_integrations
			SET store_identifier = $2, credentials = $3::jsonb, status = 'connected',
			    external_webhook_id = COALESCE($4, external_webhook_id),
			    connected_at = NOW(), last_error = NULL, updated_at = NOW()
			WHERE id = $1
			RETURNING `+integrationSelect,
			existing.ID, storeIdentifier, creds, externalWebhookID))
	}

	secret, err := createWebhookSecret()
	if err != nil {
		return nil, err
	}
	return s.scanIntegration(s.pool.QueryRow(ctx, `
		INSERT INTO organization_integrations (
			organization_id, environment, provider, status, store_identifier,
			credentials, webhook_secret, external_webhook_id, connected_at
		) VALUES ($1, $2, 'woocommerce', 'connected', $3, $4::jsonb, $5, $6, NOW())
		RETURNING `+integrationSelect,
		organizationID, environment, storeIdentifier, creds, secret, externalWebhookID))
}

func (s *Service) SetExternalWebhookID(ctx context.Context, integrationID, webhookID string) (*Integration, error) {
	return s.scanIntegration(s.pool.QueryRow(ctx, `
		UPDATE organization_integrations
		SET external_webhook_id = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING `+integrationSelect, integrationID, webhookID))
}

func (s *Service) MarkError(ctx context.Context, integrationID, message string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE organization_integrations
		SET status = 'error', last_error = $2, updated_at = NOW()
		WHERE id = $1`, integrationID, message)
	return err
}

func (s *Service) Disconnect(ctx context.Context, integration *Integration) (*Integration, error) {
	return s.scanIntegration(s.pool.QueryRow(ctx, `
		UPDATE organization_integrations
		SET status = 'disconnected', credentials = NULL, external_webhook_id = NULL,
		    connected_at = NULL, last_error = NULL, updated_at = NOW()
		WHERE id = $1
		RETURNING `+integrationSelect, integration.ID))
}
