package paymentlinks

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	invoicesvc "github.com/payoesteam/payoes/apps/api/internal/service/invoices"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
)

// ported from: apps/web/src/lib/payment-links/service.ts

type CustomerCollection struct {
	CollectCustomerName    bool `json:"collect_customer_name"`
	CollectBusinessName    bool `json:"collect_business_name"`
	CollectCustomerAddress bool `json:"collect_customer_address"`
	RequirePhoneNumber     bool `json:"require_phone_number"`
}

type PaymentLink struct {
	ID                    string
	PublicID              string
	OrganizationID        string
	Environment           string
	Amount                string
	CurrencyCode          *string
	SettlementAsset       string
	SettlementAssetIssuer *string
	AllowedAssets         []paymentmethodssvc.AllowedAsset
	Description           *string
	ProductName           *string
	ProductDescription    *string
	CustomerCollection    CustomerCollection
	Active                bool
	Metadata              map[string]string
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type Item struct {
	ID            string
	PaymentLinkID string
	Description   string
	Quantity      string
	UnitAmount    string
	SortOrder     int
	CreatedAt     time.Time
}

type ListQuery struct {
	Page      int
	PageSize  int
	Search    string
	Status    string
	SortOrder string
}

type CreateInput struct {
	OrganizationID     string
	Environment        string
	CurrencyCode       string
	Items              []invoicesvc.LineItemInput
	SettlementAsset    *paymentmethodssvc.AllowedAsset
	AllowedAssets      []paymentmethodssvc.AllowedAsset
	Description        *string
	CustomerCollection *CustomerCollection
	Metadata           map[string]string
}

type Service struct {
	pool           *pgxpool.Pool
	paymentMethods *paymentmethodssvc.Service
	webURL         string
}

func NewService(pool *pgxpool.Pool, paymentMethods *paymentmethodssvc.Service, webURL string) *Service {
	return &Service{pool: pool, paymentMethods: paymentMethods, webURL: webURL}
}

func createPublicID() (string, error) {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "plink_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func (s *Service) URL(publicID string) string {
	return strings.TrimRight(s.webURL, "/") + "/c/" + publicID
}

func NormalizeCustomerCollection(v *CustomerCollection) CustomerCollection {
	if v == nil {
		return CustomerCollection{}
	}
	return CustomerCollection{
		CollectCustomerName:    v.CollectCustomerName,
		CollectBusinessName:    v.CollectBusinessName,
		CollectCustomerAddress: v.CollectCustomerAddress,
		RequirePhoneNumber:     v.RequirePhoneNumber,
	}
}

func (s *Service) scanLink(row pgx.Row) (*PaymentLink, error) {
	var (
		link          PaymentLink
		allowedRaw    []byte
		collectionRaw []byte
		metaRaw       []byte
		active        int
	)
	err := row.Scan(
		&link.ID, &link.PublicID, &link.OrganizationID, &link.Environment, &link.Amount,
		&link.CurrencyCode, &link.SettlementAsset, &link.SettlementAssetIssuer, &allowedRaw,
		&link.Description, &link.ProductName, &link.ProductDescription, &collectionRaw,
		&active, &metaRaw, &link.CreatedAt, &link.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	link.Active = active == 1
	if len(allowedRaw) > 0 {
		_ = json.Unmarshal(allowedRaw, &link.AllowedAssets)
	}
	if len(collectionRaw) > 0 {
		_ = json.Unmarshal(collectionRaw, &link.CustomerCollection)
	}
	if len(metaRaw) > 0 {
		_ = json.Unmarshal(metaRaw, &link.Metadata)
	}
	return &link, nil
}

const linkSelect = `
	id, public_id, organization_id, environment, amount, currency_code,
	settlement_asset, settlement_asset_issuer, allowed_assets, description,
	product_name, product_description, customer_collection, active, metadata,
	created_at, updated_at`

func (s *Service) GetByPublicID(ctx context.Context, publicID string) (*PaymentLink, error) {
	return s.scanLink(s.pool.QueryRow(ctx, `
		SELECT `+linkSelect+` FROM payment_links WHERE public_id = $1 LIMIT 1`, publicID))
}

func (s *Service) GetForOrganization(ctx context.Context, publicID, organizationID, environment string) (*PaymentLink, error) {
	link, err := s.GetByPublicID(ctx, publicID)
	if err != nil || link == nil {
		return nil, err
	}
	if link.OrganizationID != organizationID || link.Environment != environment {
		return nil, nil
	}
	return link, nil
}

func (s *Service) ListItems(ctx context.Context, paymentLinkID string) ([]Item, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, payment_link_id, description, quantity, unit_amount, sort_order, created_at
		FROM payment_link_items
		WHERE payment_link_id = $1
		ORDER BY sort_order ASC, created_at ASC`, paymentLinkID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Item
	for rows.Next() {
		var item Item
		if err := rows.Scan(&item.ID, &item.PaymentLinkID, &item.Description, &item.Quantity, &item.UnitAmount, &item.SortOrder, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Service) insertItems(ctx context.Context, paymentLinkID string, items []invoicesvc.LineItemInput, currencyCode string) error {
	for i, item := range items {
		unit, err := invoicesvc.ParseFiatAmount(strings.TrimSpace(item.UnitAmount), currencyCode)
		if err != nil {
			return err
		}
		_, err = s.pool.Exec(ctx, `
			INSERT INTO payment_link_items (payment_link_id, description, quantity, unit_amount, sort_order)
			VALUES ($1, $2, $3, $4, $5)`,
			paymentLinkID, strings.TrimSpace(item.Description), strings.TrimSpace(item.Quantity), unit, i,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) List(ctx context.Context, organizationID, environment string, limit int) ([]PaymentLink, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+linkSelect+`
		FROM payment_links
		WHERE organization_id = $1 AND environment = $2
		ORDER BY created_at DESC
		LIMIT $3`, organizationID, environment, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PaymentLink
	for rows.Next() {
		link, err := s.scanLink(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *link)
	}
	return out, rows.Err()
}

func (s *Service) ListPaginated(ctx context.Context, organizationID, environment string, query ListQuery) ([]map[string]any, int, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize
	sortOrder := strings.ToLower(query.SortOrder)
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	where := []string{"organization_id = $1", "environment = $2"}
	args := []any{organizationID, environment}
	argN := 3

	if search := strings.TrimSpace(query.Search); search != "" {
		pattern := "%" + search + "%"
		where = append(where, fmt.Sprintf(
			`(public_id ILIKE $%d OR product_name ILIKE $%d OR description ILIKE $%d)`,
			argN, argN, argN,
		))
		args = append(args, pattern)
		argN++
	}
	switch strings.TrimSpace(query.Status) {
	case "active":
		where = append(where, "active = 1")
	case "inactive":
		where = append(where, "active = 0")
	}

	whereSQL := strings.Join(where, " AND ")
	orderSQL := "created_at DESC"
	if sortOrder == "asc" {
		orderSQL = "created_at ASC"
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM payment_links WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append(append([]any{}, args...), pageSize, offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT `+linkSelect+`
		FROM payment_links
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, whereSQL, orderSQL, argN, argN+1), listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var links []PaymentLink
	for rows.Next() {
		link, err := s.scanLink(rows)
		if err != nil {
			return nil, 0, err
		}
		links = append(links, *link)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	linkIDs := make([]string, 0, len(links))
	for _, link := range links {
		linkIDs = append(linkIDs, link.ID)
	}
	itemCounts := map[string]int{}
	if len(linkIDs) > 0 {
		countRows, err := s.pool.Query(ctx, `
			SELECT payment_link_id, COUNT(*)
			FROM payment_link_items
			WHERE payment_link_id = ANY($1::uuid[])
			GROUP BY payment_link_id`, linkIDs)
		if err != nil {
			return nil, 0, err
		}
		defer countRows.Close()
		for countRows.Next() {
			var id string
			var count int
			if err := countRows.Scan(&id, &count); err != nil {
				return nil, 0, err
			}
			itemCounts[id] = count
		}
		if err := countRows.Err(); err != nil {
			return nil, 0, err
		}
	}

	out := make([]map[string]any, 0, len(links))
	for i := range links {
		serialized := s.Serialize(&links[i])
		serialized["item_count"] = itemCounts[links[i].ID]
		out = append(out, serialized)
	}
	return out, total, nil
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*PaymentLink, error) {
	currencyCode := invoicesvc.ResolveCurrencyCode(input.CurrencyCode)
	amount, err := invoicesvc.CalculateTotal(input.Items, currencyCode)
	if err != nil {
		return nil, err
	}

	assetConfig, err := s.paymentMethods.ResolveAssetConfig(ctx, input.OrganizationID, input.SettlementAsset, input.AllowedAssets)
	if err != nil {
		return nil, err
	}

	publicID, err := createPublicID()
	if err != nil {
		return nil, err
	}

	var productName *string
	if len(input.Items) > 0 {
		name := strings.TrimSpace(input.Items[0].Description)
		if name != "" {
			productName = &name
		}
	}

	collection := NormalizeCustomerCollection(input.CustomerCollection)
	collectionJSON, err := json.Marshal(collection)
	if err != nil {
		return nil, err
	}
	allowedJSON, err := json.Marshal(assetConfig.AllowedAssets)
	if err != nil {
		return nil, err
	}
	var metaJSON []byte
	if input.Metadata != nil {
		metaJSON, err = json.Marshal(input.Metadata)
		if err != nil {
			return nil, err
		}
	}

	var description *string
	if input.Description != nil {
		t := strings.TrimSpace(*input.Description)
		if t != "" {
			description = &t
		}
	}

	link, err := s.scanLink(s.pool.QueryRow(ctx, `
		INSERT INTO payment_links (
			public_id, organization_id, environment, amount, currency_code,
			settlement_asset, settlement_asset_issuer, allowed_assets,
			product_name, product_description, description, customer_collection,
			metadata, active
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8::jsonb,
			$9, NULL, $10, $11::jsonb,
			$12, 1
		)
		RETURNING `+linkSelect,
		publicID, input.OrganizationID, input.Environment, amount, currencyCode,
		assetConfig.SettlementAsset.AssetCode, assetConfig.SettlementAsset.IssuerAddress, allowedJSON,
		productName, description, collectionJSON, metaJSON,
	))
	if err != nil {
		return nil, err
	}
	if err := s.insertItems(ctx, link.ID, input.Items, currencyCode); err != nil {
		return nil, err
	}
	return link, nil
}

func (s *Service) Serialize(link *PaymentLink) map[string]any {
	return map[string]any{
		"id":            link.PublicID,
		"object":        "payment_link",
		"amount":        link.Amount,
		"currency_code": link.CurrencyCode,
		"settlement_asset": map[string]any{
			"asset_code":     link.SettlementAsset,
			"issuer_address": link.SettlementAssetIssuer,
		},
		"allowed_assets":      link.AllowedAssets,
		"product_name":        link.ProductName,
		"product_description": link.ProductDescription,
		"description":         link.Description,
		"customer_collection": NormalizeCustomerCollection(&link.CustomerCollection),
		"active":              link.Active,
		"metadata":            link.Metadata,
		"url":                 s.URL(link.PublicID),
		"environment":         link.Environment,
		"created_at":          link.CreatedAt,
		"updated_at":          link.UpdatedAt,
	}
}

// SerializeWithItems loads line items using the provided context.
func (s *Service) SerializeWithItems(ctx context.Context, link *PaymentLink) (map[string]any, error) {
	dbItems, err := s.ListItems(ctx, link.ID)
	if err != nil {
		return nil, err
	}
	currencyCode := ""
	if link.CurrencyCode != nil {
		currencyCode = *link.CurrencyCode
	}
	serializedItems := make([]map[string]any, 0, len(dbItems))
	for _, item := range dbItems {
		lineAmount := item.UnitAmount
		if currencyCode != "" {
			if line, err := invoicesvc.LineItemAmount(invoicesvc.LineItemInput{
				Description: item.Description,
				Quantity:    item.Quantity,
				UnitAmount:  item.UnitAmount,
			}, currencyCode); err == nil {
				lineAmount = line
			}
		}
		serializedItems = append(serializedItems, map[string]any{
			"description": item.Description,
			"quantity":    item.Quantity,
			"unit_amount": item.UnitAmount,
			"line_amount": lineAmount,
		})
	}
	out := s.Serialize(link)
	out["items"] = serializedItems
	return out, nil
}
