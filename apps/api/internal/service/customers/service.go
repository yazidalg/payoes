package customers

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

	"github.com/payoesteam/payoes/apps/api/internal/stellar"
)

// ported from: apps/web/src/lib/customers/service.ts

type Customer struct {
	ID                     string            `json:"-"`
	PublicID               string            `json:"id"`
	OrganizationID         string            `json:"-"`
	Environment            string            `json:"environment"`
	Email                  *string           `json:"email"`
	Name                   *string           `json:"name"`
	PrimaryStellarAddress  *string           `json:"primary_stellar_address"`
	Notes                  *string           `json:"notes"`
	Metadata               map[string]string `json:"metadata"`
	CreatedAt              time.Time         `json:"created_at"`
	UpdatedAt              time.Time         `json:"updated_at"`
}

type CreateInput struct {
	OrganizationID        string
	Environment           string
	Email                 *string
	Name                  *string
	PrimaryStellarAddress *string
	Notes                 *string
	Metadata              map[string]string
}

type UpdateInput struct {
	Email                 *string
	Name                  *string
	PrimaryStellarAddress *string
	Notes                 *string
	Metadata              map[string]string
	SetEmail              bool
	SetName               bool
	SetWallet             bool
	SetNotes              bool
	SetMetadata           bool
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func createPublicID() (string, error) {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "cus_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func trimPtr(v *string) *string {
	if v == nil {
		return nil
	}
	t := strings.TrimSpace(*v)
	if t == "" {
		return nil
	}
	return &t
}

func (s *Service) scanCustomer(row pgx.Row) (*Customer, error) {
	var (
		c          Customer
		metaRaw    []byte
	)
	err := row.Scan(
		&c.ID, &c.PublicID, &c.OrganizationID, &c.Environment,
		&c.Email, &c.Name, &c.PrimaryStellarAddress, &c.Notes, &metaRaw,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(metaRaw) > 0 {
		_ = json.Unmarshal(metaRaw, &c.Metadata)
	}
	return &c, nil
}

const customerSelect = `
	id, public_id, organization_id, environment, email, name,
	primary_stellar_address, notes, metadata, created_at, updated_at`

func (s *Service) List(ctx context.Context, organizationID, environment string, limit int) ([]Customer, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+customerSelect+`
		FROM customers
		WHERE organization_id = $1 AND environment = $2
		ORDER BY created_at DESC
		LIMIT $3`, organizationID, environment, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Customer
	for rows.Next() {
		var (
			c       Customer
			metaRaw []byte
		)
		if err := rows.Scan(
			&c.ID, &c.PublicID, &c.OrganizationID, &c.Environment,
			&c.Email, &c.Name, &c.PrimaryStellarAddress, &c.Notes, &metaRaw,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if len(metaRaw) > 0 {
			_ = json.Unmarshal(metaRaw, &c.Metadata)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Service) GetByPublicID(ctx context.Context, publicID string) (*Customer, error) {
	return s.scanCustomer(s.pool.QueryRow(ctx, `
		SELECT `+customerSelect+` FROM customers WHERE public_id = $1 LIMIT 1`, publicID))
}

func (s *Service) GetForOrganization(ctx context.Context, publicID, organizationID, environment string) (*Customer, error) {
	c, err := s.GetByPublicID(ctx, publicID)
	if err != nil || c == nil {
		return nil, err
	}
	if c.OrganizationID != organizationID || c.Environment != environment {
		return nil, nil
	}
	return c, nil
}

func (s *Service) GetByWallet(ctx context.Context, organizationID, environment, stellarAddress string) (*Customer, error) {
	return s.scanCustomer(s.pool.QueryRow(ctx, `
		SELECT `+customerSelect+`
		FROM customers
		WHERE organization_id = $1 AND environment = $2 AND primary_stellar_address = $3
		LIMIT 1`, organizationID, environment, stellarAddress))
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Customer, error) {
	wallet := trimPtr(input.PrimaryStellarAddress)
	if wallet != nil {
		existing, err := s.GetByWallet(ctx, input.OrganizationID, input.Environment, *wallet)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("A customer with this wallet address already exists")
		}
	}

	publicID, err := createPublicID()
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

	return s.scanCustomer(s.pool.QueryRow(ctx, `
		INSERT INTO customers (
			public_id, organization_id, environment, email, name,
			primary_stellar_address, notes, metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+customerSelect,
		publicID, input.OrganizationID, input.Environment,
		trimPtr(input.Email), trimPtr(input.Name), wallet, trimPtr(input.Notes), metaJSON,
	))
}

func (s *Service) Update(ctx context.Context, customer *Customer, input UpdateInput) (*Customer, error) {
	email := customer.Email
	name := customer.Name
	wallet := customer.PrimaryStellarAddress
	notes := customer.Notes
	meta := customer.Metadata

	if input.SetEmail {
		email = trimPtr(input.Email)
	}
	if input.SetName {
		name = trimPtr(input.Name)
	}
	if input.SetWallet {
		wallet = trimPtr(input.PrimaryStellarAddress)
		if wallet != nil && !stellar.IsValidEd25519PublicKey(*wallet) {
			return nil, errors.New("Invalid Stellar wallet address")
		}
		if wallet != nil && (customer.PrimaryStellarAddress == nil || *wallet != *customer.PrimaryStellarAddress) {
			existing, err := s.GetByWallet(ctx, customer.OrganizationID, customer.Environment, *wallet)
			if err != nil {
				return nil, err
			}
			if existing != nil && existing.ID != customer.ID {
				return nil, errors.New("A customer with this wallet address already exists")
			}
		}
	}
	if input.SetNotes {
		notes = trimPtr(input.Notes)
	}
	if input.SetMetadata {
		meta = input.Metadata
	}

	var metaJSON []byte
	var err error
	if meta != nil {
		metaJSON, err = json.Marshal(meta)
		if err != nil {
			return nil, err
		}
	}

	return s.scanCustomer(s.pool.QueryRow(ctx, `
		UPDATE customers
		SET email = $1, name = $2, primary_stellar_address = $3, notes = $4,
		    metadata = $5, updated_at = NOW()
		WHERE id = $6
		RETURNING `+customerSelect,
		email, name, wallet, notes, metaJSON, customer.ID,
	))
}

func Serialize(c *Customer) map[string]any {
	return map[string]any{
		"id":                      c.PublicID,
		"email":                   c.Email,
		"name":                    c.Name,
		"primary_stellar_address": c.PrimaryStellarAddress,
		"notes":                   c.Notes,
		"metadata":                c.Metadata,
		"environment":             c.Environment,
		"created_at":              c.CreatedAt,
		"updated_at":              c.UpdatedAt,
	}
}
