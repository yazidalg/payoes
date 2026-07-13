package organizations

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const InviteTTLDays = 7

// MembersError ports MembersServiceError from apps/web/src/lib/organizations/members.ts.
type MembersError struct {
	Message string
	Code    string
}

func (e *MembersError) Error() string { return e.Message }

func AssertCanManageTeam(role string) error {
	if role != "owner" && role != "admin" {
		return &MembersError{Message: "You do not have permission to manage team members", Code: "forbidden"}
	}
	return nil
}

type InviteRecord struct {
	ID             string
	OrganizationID string
	Email          string
	Role           string
	Token          string
	InvitedBy      string
	ExpiresAt      time.Time
	AcceptedAt     *time.Time
	RevokedAt      *time.Time
	CreatedAt      time.Time
}

type InvitePreview struct {
	Email            string    `json:"email"`
	Role             string    `json:"role"`
	OrganizationName string    `json:"organizationName"`
	OrganizationSlug string    `json:"organizationSlug"`
	ExpiresAt        time.Time `json:"expiresAt"`
	Status           string    `json:"status"`
}

type AcceptInviteResult struct {
	OrganizationID string `json:"organizationId"`
	AlreadyMember  bool   `json:"alreadyMember"`
}

type InviteEmailData struct {
	To               string
	OrganizationName string
	Role             string
	InviterName      string
	InviterEmail     string
	Token            string
	ExpiresAt        time.Time
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func createInviteToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func inviteExpiresAt() time.Time {
	return time.Now().UTC().Add(InviteTTLDays * 24 * time.Hour)
}

func isInvitePending(inv *InviteRecord) bool {
	if inv == nil || inv.AcceptedAt != nil || inv.RevokedAt != nil {
		return false
	}
	return inv.ExpiresAt.After(time.Now().UTC())
}

func (s *Service) scanInvite(row pgx.Row) (*InviteRecord, error) {
	var inv InviteRecord
	err := row.Scan(
		&inv.ID, &inv.OrganizationID, &inv.Email, &inv.Role, &inv.Token, &inv.InvitedBy,
		&inv.ExpiresAt, &inv.AcceptedAt, &inv.RevokedAt, &inv.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

const inviteSelect = `
	id, organization_id, email, role, token, invited_by, expires_at, accepted_at, revoked_at, created_at`

func (s *Service) assertNotExistingMember(ctx context.Context, organizationID, email string) error {
	var id string
	err := s.pool.QueryRow(ctx, `
		SELECT m.id
		FROM organization_members m
		INNER JOIN users u ON u.id = m.user_id
		WHERE m.organization_id = $1 AND u.email = $2
		LIMIT 1`, organizationID, email).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	return &MembersError{Message: "This user is already a team member", Code: "conflict"}
}

func (s *Service) getPendingInviteByEmail(ctx context.Context, organizationID, email string) (*InviteRecord, error) {
	return s.scanInvite(s.pool.QueryRow(ctx, `
		SELECT `+inviteSelect+`
		FROM organization_invites
		WHERE organization_id = $1 AND email = $2
		  AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
		LIMIT 1`, organizationID, email))
}

func (s *Service) getInviteByEmail(ctx context.Context, organizationID, email string) (*InviteRecord, error) {
	return s.scanInvite(s.pool.QueryRow(ctx, `
		SELECT `+inviteSelect+`
		FROM organization_invites
		WHERE organization_id = $1 AND email = $2
		LIMIT 1`, organizationID, email))
}

func (s *Service) GetInviteEmailData(ctx context.Context, inviteID string) (*InviteEmailData, error) {
	var data InviteEmailData
	var role string
	var acceptedAt, revokedAt *time.Time
	var expiresAt time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT i.email, o.name, i.role, u.name, u.email, i.token, i.expires_at, i.accepted_at, i.revoked_at
		FROM organization_invites i
		INNER JOIN organizations o ON o.id = i.organization_id
		INNER JOIN users u ON u.id = i.invited_by
		WHERE i.id = $1
		LIMIT 1`, inviteID).Scan(
		&data.To, &data.OrganizationName, &role, &data.InviterName, &data.InviterEmail,
		&data.Token, &expiresAt, &acceptedAt, &revokedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, &MembersError{Message: "Invite is no longer valid", Code: "not_found"}
	}
	if err != nil {
		return nil, err
	}
	if acceptedAt != nil || revokedAt != nil || !expiresAt.After(time.Now().UTC()) {
		return nil, &MembersError{Message: "Invite is no longer valid", Code: "not_found"}
	}
	if role != "admin" && role != "member" {
		return nil, &MembersError{Message: "Invalid invite role", Code: "invalid"}
	}
	data.Role = role
	data.ExpiresAt = expiresAt
	return &data, nil
}

func (s *Service) CreateOrganizationInvite(ctx context.Context, organizationID, email, role, invitedByUserID string) (*InviteRecord, error) {
	email = normalizeEmail(email)
	if err := s.assertNotExistingMember(ctx, organizationID, email); err != nil {
		return nil, err
	}

	if pending, err := s.getPendingInviteByEmail(ctx, organizationID, email); err != nil {
		return nil, err
	} else if pending != nil {
		return pending, nil
	}

	if existing, err := s.getInviteByEmail(ctx, organizationID, email); err != nil {
		return nil, err
	} else if existing != nil {
		token, err := createInviteToken()
		if err != nil {
			return nil, err
		}
		return s.scanInvite(s.pool.QueryRow(ctx, `
			UPDATE organization_invites
			SET role = $1, token = $2, invited_by = $3, expires_at = $4, accepted_at = NULL, revoked_at = NULL
			WHERE id = $5
			RETURNING `+inviteSelect,
			role, token, invitedByUserID, inviteExpiresAt(), existing.ID,
		))
	}

	token, err := createInviteToken()
	if err != nil {
		return nil, err
	}
	return s.scanInvite(s.pool.QueryRow(ctx, `
		INSERT INTO organization_invites (organization_id, email, role, token, invited_by, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+inviteSelect,
		organizationID, email, role, token, invitedByUserID, inviteExpiresAt(),
	))
}

func (s *Service) ResendOrganizationInvite(ctx context.Context, organizationID, inviteID string) (*InviteRecord, error) {
	inv, err := s.scanInvite(s.pool.QueryRow(ctx, `
		SELECT `+inviteSelect+`
		FROM organization_invites
		WHERE id = $1 AND organization_id = $2
		LIMIT 1`, inviteID, organizationID))
	if err != nil {
		return nil, err
	}
	if !isInvitePending(inv) {
		return nil, &MembersError{Message: "Invite not found", Code: "not_found"}
	}
	return s.scanInvite(s.pool.QueryRow(ctx, `
		UPDATE organization_invites SET expires_at = $1 WHERE id = $2
		RETURNING `+inviteSelect, inviteExpiresAt(), inv.ID))
}

func (s *Service) RevokeOrganizationInvite(ctx context.Context, organizationID, inviteID string) (*InviteRecord, error) {
	inv, err := s.scanInvite(s.pool.QueryRow(ctx, `
		SELECT `+inviteSelect+`
		FROM organization_invites
		WHERE id = $1 AND organization_id = $2
		LIMIT 1`, inviteID, organizationID))
	if err != nil {
		return nil, err
	}
	if inv == nil || inv.AcceptedAt != nil || inv.RevokedAt != nil {
		return nil, &MembersError{Message: "Invite not found", Code: "not_found"}
	}
	return s.scanInvite(s.pool.QueryRow(ctx, `
		UPDATE organization_invites SET revoked_at = NOW() WHERE id = $1
		RETURNING `+inviteSelect, inv.ID))
}

func (s *Service) GetInvitePreview(ctx context.Context, token string) (*InvitePreview, error) {
	var email, role, orgName, orgSlug string
	var expiresAt time.Time
	var acceptedAt, revokedAt *time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT i.email, i.role, o.name, o.slug, i.expires_at, i.accepted_at, i.revoked_at
		FROM organization_invites i
		INNER JOIN organizations o ON o.id = i.organization_id
		WHERE i.token = $1
		LIMIT 1`, token).Scan(&email, &role, &orgName, &orgSlug, &expiresAt, &acceptedAt, &revokedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	status := "pending"
	switch {
	case acceptedAt != nil:
		status = "accepted"
	case revokedAt != nil:
		status = "revoked"
	case !expiresAt.After(time.Now().UTC()):
		status = "expired"
	}

	return &InvitePreview{
		Email: email, Role: role, OrganizationName: orgName, OrganizationSlug: orgSlug,
		ExpiresAt: expiresAt, Status: status,
	}, nil
}

func (s *Service) AcceptOrganizationInvite(ctx context.Context, token, userID, userEmail string) (*AcceptInviteResult, error) {
	var inviteID, organizationID, inviteEmail, role string
	var expiresAt time.Time
	var acceptedAt, revokedAt *time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT i.id, o.id, i.email, i.role, i.expires_at, i.accepted_at, i.revoked_at
		FROM organization_invites i
		INNER JOIN organizations o ON o.id = i.organization_id
		WHERE i.token = $1
		LIMIT 1`, token).Scan(&inviteID, &organizationID, &inviteEmail, &role, &expiresAt, &acceptedAt, &revokedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, &MembersError{Message: "Invitation not found", Code: "not_found"}
	}
	if err != nil {
		return nil, err
	}
	if acceptedAt != nil {
		return nil, &MembersError{Message: "This invitation has already been accepted", Code: "conflict"}
	}
	if revokedAt != nil {
		return nil, &MembersError{Message: "This invitation has been revoked", Code: "invalid"}
	}
	if !expiresAt.After(time.Now().UTC()) {
		return nil, &MembersError{Message: "This invitation has expired", Code: "expired"}
	}
	if normalizeEmail(userEmail) != normalizeEmail(inviteEmail) {
		return nil, &MembersError{
			Message: "Sign in with the email address that received this invitation",
			Code:    "email_mismatch",
		}
	}

	existing, err := s.GetMembership(ctx, organizationID, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		_, err := s.pool.Exec(ctx, `UPDATE organization_invites SET accepted_at = NOW() WHERE id = $1`, inviteID)
		if err != nil {
			return nil, err
		}
		return &AcceptInviteResult{OrganizationID: organizationID, AlreadyMember: true}, nil
	}
	if role != "admin" && role != "member" {
		return nil, &MembersError{Message: "Invalid invite role", Code: "invalid"}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO organization_members (organization_id, user_id, role)
		VALUES ($1, $2, $3)`, organizationID, userID, role); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE organization_invites SET accepted_at = NOW() WHERE id = $1`, inviteID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &AcceptInviteResult{OrganizationID: organizationID, AlreadyMember: false}, nil
}

func (s *Service) UpdateMemberRole(ctx context.Context, organizationID, targetUserID, role string) (*Membership, error) {
	target, err := s.GetMembership(ctx, organizationID, targetUserID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, &MembersError{Message: "Member not found", Code: "not_found"}
	}
	if target.Role == "owner" {
		return nil, &MembersError{Message: "Cannot change the owner role", Code: "forbidden"}
	}
	var m Membership
	err = s.pool.QueryRow(ctx, `
		UPDATE organization_members SET role = $1 WHERE id = $2
		RETURNING id, organization_id, user_id, role, created_at`,
		role, target.ID,
	).Scan(&m.ID, &m.OrganizationID, &m.UserID, &m.Role, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *Service) RemoveOrganizationMember(ctx context.Context, organizationID, targetUserID, actorUserID string) error {
	target, err := s.GetMembership(ctx, organizationID, targetUserID)
	if err != nil {
		return err
	}
	if target == nil {
		return &MembersError{Message: "Member not found", Code: "not_found"}
	}
	if target.Role == "owner" {
		return &MembersError{Message: "Cannot remove the business owner", Code: "forbidden"}
	}
	if target.UserID == actorUserID {
		return &MembersError{Message: "You cannot remove yourself", Code: "forbidden"}
	}
	_, err = s.pool.Exec(ctx, `DELETE FROM organization_members WHERE id = $1`, target.ID)
	return err
}

func SerializeInviteRecord(inv *InviteRecord) map[string]any {
	if inv == nil {
		return nil
	}
	return map[string]any{
		"id":             inv.ID,
		"organizationId": inv.OrganizationID,
		"email":          inv.Email,
		"role":           inv.Role,
		"token":          inv.Token,
		"invitedBy":      inv.InvitedBy,
		"expiresAt":      inv.ExpiresAt,
		"acceptedAt":     inv.AcceptedAt,
		"revokedAt":      inv.RevokedAt,
		"createdAt":      inv.CreatedAt,
	}
}

func SerializePendingInvite(inv InviteRow) map[string]any {
	return map[string]any{
		"id":           inv.ID,
		"email":        inv.Email,
		"role":         inv.Role,
		"expiresAt":    inv.ExpiresAt,
		"createdAt":    inv.CreatedAt,
		"inviterName":  inv.InviterName,
		"inviterEmail": inv.InviterEmail,
	}
}

func SerializeMembership(m *Membership) map[string]any {
	if m == nil {
		return nil
	}
	return map[string]any{
		"id":             m.ID,
		"organizationId": m.OrganizationID,
		"userId":         m.UserID,
		"role":           m.Role,
		"createdAt":      m.CreatedAt,
	}
}

func MembersHTTPStatus(err error) (int, string, string, bool) {
	var me *MembersError
	if !errors.As(err, &me) {
		return 0, "", "", false
	}
	status := 400
	switch me.Code {
	case "forbidden", "email_mismatch":
		status = 403
	case "not_found":
		status = 404
	case "conflict":
		status = 409
	case "expired":
		status = 410
	case "invalid":
		status = 400
	}
	return status, me.Message, me.Code, true
}
