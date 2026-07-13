package organizations

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ported from: apps/web/src/lib/organizations/service.ts
// and apps/web/src/lib/organizations/members.ts / settlement-wallet.ts

type Organization struct {
	ID                    string     `json:"id"`
	Name                  string     `json:"name"`
	Email                 string     `json:"email"`
	Website               *string    `json:"website"`
	Description           *string    `json:"description"`
	LogoURL               *string    `json:"logo_url"`
	LogoInitials          string     `json:"logo_initials"`
	Slug                  string     `json:"slug"`
	Environment           string     `json:"environment"`
	VerificationStatus    string     `json:"verification_status"`
	VerifiedAt            *time.Time `json:"verified_at"`
	VerificationExpiresAt *time.Time `json:"verification_expires_at"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

type Membership struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	UserID         string    `json:"user_id"`
	Role           string    `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
}

type MemberRow struct {
	ID       string    `json:"id"`
	UserID   string    `json:"user_id"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Image    *string   `json:"image"`
}

type InviteRow struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	InviterName  string    `json:"inviter_name"`
	InviterEmail string    `json:"inviter_email"`
}

type CreateInput struct {
	Name        string
	Email       string
	Website     *string
	Description *string
	LogoURL     *string
}

type UpdateInput struct {
	Name        string
	Email       string
	Website     *string
	Description *string
	LogoURL     *string
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

var nonSlug = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(value string) string {
	s := strings.ToLower(strings.TrimSpace(value))
	s = nonSlug.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 48 {
		s = s[:48]
	}
	return s
}

func getInitials(name string) string {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) == 0 {
		return ""
	}
	max := 2
	if len(parts) < max {
		max = len(parts)
	}
	out := make([]byte, 0, max)
	for i := 0; i < max; i++ {
		if parts[i] == "" {
			continue
		}
		out = append(out, strings.ToUpper(parts[i][:1])[0])
	}
	return string(out)
}

func (s *Service) createUniqueSlug(ctx context.Context, name string) (string, error) {
	base := slugify(name)
	if base == "" {
		base = "workspace"
	}
	candidate := base
	suffix := 1
	for {
		var id string
		err := s.pool.QueryRow(ctx, `SELECT id FROM organizations WHERE slug = $1 LIMIT 1`, candidate).Scan(&id)
		if errors.Is(err, pgx.ErrNoRows) {
			return candidate, nil
		}
		if err != nil {
			return "", err
		}
		suffix++
		candidate = base + "-" + itoa(suffix)
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func (s *Service) scanOrg(row pgx.Row) (*Organization, error) {
	var o Organization
	err := row.Scan(
		&o.ID, &o.Name, &o.Email, &o.Website, &o.Description, &o.LogoURL, &o.LogoInitials,
		&o.Slug, &o.Environment, &o.VerificationStatus, &o.VerifiedAt, &o.VerificationExpiresAt,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

const orgSelect = `
	id, name, email, website, description, logo_url, logo_initials, slug, environment,
	verification_status, verified_at, verification_expires_at, created_at, updated_at`

func (s *Service) ListForUser(ctx context.Context, userID string) ([]Organization, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.name, o.email, o.website, o.description, o.logo_url, o.logo_initials, o.slug,
		       o.environment, o.verification_status, o.verified_at, o.verification_expires_at,
		       o.created_at, o.updated_at
		FROM organization_members m
		INNER JOIN organizations o ON o.id = m.organization_id
		WHERE m.user_id = $1
		ORDER BY m.created_at ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Organization
	for rows.Next() {
		var o Organization
		if err := rows.Scan(
			&o.ID, &o.Name, &o.Email, &o.Website, &o.Description, &o.LogoURL, &o.LogoInitials,
			&o.Slug, &o.Environment, &o.VerificationStatus, &o.VerifiedAt, &o.VerificationExpiresAt,
			&o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Service) CreateForUser(ctx context.Context, userID string, input CreateInput) (*Organization, error) {
	slug, err := s.createUniqueSlug(ctx, input.Name)
	if err != nil {
		return nil, err
	}
	logoInitials := getInitials(input.Name)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	org, err := s.scanOrg(tx.QueryRow(ctx, `
		INSERT INTO organizations (name, email, website, description, logo_url, logo_initials, slug)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+orgSelect,
		strings.TrimSpace(input.Name),
		strings.ToLower(strings.TrimSpace(input.Email)),
		nullIfEmptyPtr(input.Website),
		nullIfEmptyPtr(input.Description),
		input.LogoURL,
		logoInitials,
		slug,
	))
	if err != nil || org == nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO organization_members (organization_id, user_id, role)
		VALUES ($1, $2, 'owner')`, org.ID, userID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return org, nil
}

func nullIfEmptyPtr(v *string) *string {
	if v == nil {
		return nil
	}
	t := strings.TrimSpace(*v)
	if t == "" {
		return nil
	}
	return &t
}

func (s *Service) GetByID(ctx context.Context, organizationID string) (*Organization, error) {
	return s.scanOrg(s.pool.QueryRow(ctx, `SELECT `+orgSelect+` FROM organizations WHERE id = $1`, organizationID))
}

func (s *Service) GetMembership(ctx context.Context, organizationID, userID string) (*Membership, error) {
	var m Membership
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, user_id, role, created_at
		FROM organization_members
		WHERE organization_id = $1 AND user_id = $2
		LIMIT 1`, organizationID, userID).Scan(&m.ID, &m.OrganizationID, &m.UserID, &m.Role, &m.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// GetOrganizationForMember returns the org if the user is a member.
func (s *Service) GetOrganizationForMember(ctx context.Context, organizationID, userID string) (*Organization, error) {
	membership, err := s.GetMembership(ctx, organizationID, userID)
	if err != nil || membership == nil {
		return nil, err
	}
	return s.GetByID(ctx, organizationID)
}

func (s *Service) Update(ctx context.Context, organizationID string, input UpdateInput) (*Organization, error) {
	logoInitials := getInitials(input.Name)
	return s.scanOrg(s.pool.QueryRow(ctx, `
		UPDATE organizations
		SET name = $1, email = $2, website = $3, description = $4,
		    logo_url = COALESCE($5, logo_url), logo_initials = $6, updated_at = NOW()
		WHERE id = $7
		RETURNING `+orgSelect,
		strings.TrimSpace(input.Name),
		strings.ToLower(strings.TrimSpace(input.Email)),
		nullIfEmptyPtr(input.Website),
		nullIfEmptyPtr(input.Description),
		input.LogoURL,
		logoInitials,
		organizationID,
	))
}

func (s *Service) Delete(ctx context.Context, organizationID string) (*Organization, error) {
	return s.scanOrg(s.pool.QueryRow(ctx, `
		DELETE FROM organizations WHERE id = $1 RETURNING `+orgSelect, organizationID))
}

func (s *Service) ListMembers(ctx context.Context, organizationID string) ([]MemberRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT m.id, m.user_id, m.role, m.created_at, u.name, u.email, u.image
		FROM organization_members m
		INNER JOIN users u ON u.id = m.user_id
		WHERE m.organization_id = $1
		ORDER BY m.created_at ASC`, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MemberRow
	for rows.Next() {
		var m MemberRow
		if err := rows.Scan(&m.ID, &m.UserID, &m.Role, &m.JoinedAt, &m.Name, &m.Email, &m.Image); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Service) ListPendingInvites(ctx context.Context, organizationID string) ([]InviteRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT i.id, i.email, i.role, i.expires_at, i.created_at, u.name, u.email
		FROM organization_invites i
		INNER JOIN users u ON u.id = i.invited_by
		WHERE i.organization_id = $1
		  AND i.accepted_at IS NULL
		  AND i.revoked_at IS NULL
		  AND i.expires_at > NOW()
		ORDER BY i.created_at ASC`, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []InviteRow
	for rows.Next() {
		var inv InviteRow
		if err := rows.Scan(&inv.ID, &inv.Email, &inv.Role, &inv.ExpiresAt, &inv.CreatedAt, &inv.InviterName, &inv.InviterEmail); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

func (s *Service) GetSettlementWalletAddress(ctx context.Context, organizationID, environment string) (string, error) {
	var addr string
	err := s.pool.QueryRow(ctx, `
		SELECT stellar_address FROM organization_receiving_wallets
		WHERE organization_id = $1 AND environment = $2
		LIMIT 1`, organizationID, environment).Scan(&addr)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errors.New("settlement wallet is not configured for this environment")
	}
	return addr, err
}

func (s *Service) HasSettlementWallet(ctx context.Context, organizationID, environment string) (bool, error) {
	var id string
	err := s.pool.QueryRow(ctx, `
		SELECT id FROM organization_receiving_wallets
		WHERE organization_id = $1 AND environment = $2
		LIMIT 1`, organizationID, environment).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func SettlementWalletNotConfiguredMessage(environment string) string {
	if environment == "production" {
		return "Production settlement wallet is not configured. Open Settings → Settlement Wallet and connect your Mainnet wallet."
	}
	return "Sandbox settlement wallet is not configured. Open Settings → Settlement Wallet and connect your Testnet wallet."
}
