package kyc

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/payoesteam/payoes/apps/api/internal/kyc/persona"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
)

const verificationValidityDays = 365

// ServiceError mirrors apps/web/src/lib/kyc/service.ts KycServiceError.
type ServiceError struct {
	Message string
	Code    string
}

func (e *ServiceError) Error() string { return e.Message }

type Service struct {
	pool   *pgxpool.Pool
	orgs   *orgsvc.Service
	persona *persona.Client
}

func NewService(pool *pgxpool.Pool, orgs *orgsvc.Service, personaClient *persona.Client) *Service {
	return &Service{pool: pool, orgs: orgs, persona: personaClient}
}

type Application struct {
	ID                   string    `json:"id"`
	OrganizationID       string    `json:"organizationId"`
	AccountType          string    `json:"accountType"`
	DisplayName          string    `json:"displayName"`
	RegistrationNumber   *string   `json:"registrationNumber"`
	Country              string    `json:"country"`
	BusinessDescription  *string   `json:"businessDescription"`
	Provider             string    `json:"provider"`
	ProviderInquiryID    *string   `json:"providerInquiryId"`
	ProviderStatus       string    `json:"providerStatus"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type Summary struct {
	Organization            orgsvc.OrganizationJSON `json:"organization"`
	Application             *Application            `json:"application"`
	IsExpired               bool                    `json:"isExpired"`
	CanSwitchToProduction   bool                    `json:"canSwitchToProduction"`
}

type SessionData struct {
	InquiryID    string  `json:"inquiryId"`
	SessionToken *string `json:"sessionToken"`
}

func (s *Service) GetSummary(ctx context.Context, organizationID string) (*Summary, error) {
	org, err := s.orgs.GetByID(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if org == nil {
		return nil, &ServiceError{Message: "Business not found", Code: "not_found"}
	}

	app, err := s.getApplication(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	isExpired := org.VerificationExpiresAt != nil && !org.VerificationExpiresAt.After(now)

	return &Summary{
		Organization: orgsvc.SerializeOrganization(*org),
		Application:  app,
		IsExpired:    isExpired,
		CanSwitchToProduction: org.VerificationStatus == "verified" &&
			!isExpired && org.Environment == "sandbox",
	}, nil
}

func (s *Service) StartVerification(ctx context.Context, organizationID, userID string, accountType *string) (*Application, error) {
	membership, err := s.orgs.GetMembership(ctx, organizationID, userID)
	if err != nil {
		return nil, err
	}
	if membership == nil || membership.Role != "owner" {
		return nil, &ServiceError{Message: "Only the business owner can start verification", Code: "forbidden"}
	}

	org, err := s.orgs.GetByID(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if org == nil {
		return nil, &ServiceError{Message: "Business not found", Code: "not_found"}
	}

	existing, err := s.getApplication(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if existing != nil && existing.ProviderStatus == "approved" {
		return nil, &ServiceError{Message: "This business is already verified", Code: "conflict"}
	}
	if existing != nil && existing.ProviderInquiryID != nil {
		switch existing.ProviderStatus {
		case "created", "pending", "needs_review":
			return existing, nil
		}
	}

	acctType := "personal"
	if accountType != nil && *accountType != "" {
		acctType = *accountType
	} else if existing != nil {
		acctType = existing.AccountType
	}

	note := "Personal account | Pending Persona details"
	if acctType == "business" {
		note = "Business account | Pending Persona details"
	}

	inquiry, err := s.persona.CreateInquiry(organizationID, note)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	providerStatus := persona.MapProviderStatus(inquiry.Status)

	var app *Application
	if existing != nil {
		app, err = s.scanApplication(s.pool.QueryRow(ctx, `
			UPDATE organization_verification_applications
			SET account_type = $1, display_name = $2, registration_number = NULL, country = $3,
			    business_description = NULL, provider = 'persona', provider_inquiry_id = $4,
			    provider_status = $5, updated_at = $6
			WHERE id = $7
			RETURNING id, organization_id, account_type, display_name, registration_number, country,
			          business_description, provider, provider_inquiry_id, provider_status, created_at, updated_at`,
			acctType, org.Name, "XX", inquiry.InquiryID, providerStatus, now, existing.ID))
	} else {
		app, err = s.scanApplication(s.pool.QueryRow(ctx, `
			INSERT INTO organization_verification_applications
			(organization_id, account_type, display_name, country, provider, provider_inquiry_id, provider_status, updated_at)
			VALUES ($1, $2, $3, $4, 'persona', $5, $6, $7)
			RETURNING id, organization_id, account_type, display_name, registration_number, country,
			          business_description, provider, provider_inquiry_id, provider_status, created_at, updated_at`,
			organizationID, acctType, org.Name, "XX", inquiry.InquiryID, providerStatus, now))
	}
	if err != nil {
		return nil, err
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE organizations
		SET verification_status = 'pending', verified_at = NULL, verification_expires_at = NULL, updated_at = $1
		WHERE id = $2`, now, organizationID)
	if err != nil {
		return nil, err
	}
	return app, nil
}

func (s *Service) SyncFromPersona(ctx context.Context, organizationID string) (*Summary, error) {
	app, err := s.getApplication(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if app == nil || app.ProviderInquiryID == nil {
		return nil, &ServiceError{Message: "Verification has not been started yet", Code: "not_found"}
	}

	inquiry, err := s.persona.GetInquiry(*app.ProviderInquiryID)
	if err != nil {
		return nil, err
	}
	if err := s.applyInquiryProfile(ctx, app.ID, inquiry); err != nil {
		return nil, err
	}
	if err := s.applyInquiryStatus(ctx, organizationID, inquiry.InquiryID, inquiry.Status); err != nil {
		return nil, err
	}
	return s.GetSummary(ctx, organizationID)
}

func (s *Service) GetSession(ctx context.Context, organizationID, userID string) (*SessionData, error) {
	membership, err := s.orgs.GetMembership(ctx, organizationID, userID)
	if err != nil {
		return nil, err
	}
	if membership == nil {
		return nil, &ServiceError{Message: "Forbidden", Code: "forbidden"}
	}

	app, err := s.getApplication(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if app == nil || app.ProviderInquiryID == nil {
		return nil, &ServiceError{Message: "Start verification before opening the Persona flow", Code: "invalid"}
	}

	inquiry, err := s.syncInquiryState(ctx, organizationID, app)
	if err != nil {
		return nil, err
	}

	app, err = s.getApplication(ctx, organizationID)
	if err != nil || app == nil || app.ProviderInquiryID == nil {
		return nil, &ServiceError{Message: "Verification has not been started yet", Code: "not_found"}
	}

	if persona.MustBeReplaced(inquiry.Status) {
		app, err = s.replaceInquiry(ctx, organizationID, app, "Replacement inquiry after Persona declined or failed")
		if err != nil {
			return nil, err
		}
		if app.ProviderInquiryID == nil {
			return nil, &ServiceError{Message: "Verification has not been started yet", Code: "not_found"}
		}
		inquiry, err = s.persona.GetInquiry(*app.ProviderInquiryID)
		if err != nil {
			return nil, err
		}
	}

	inquiryID := *app.ProviderInquiryID
	var sessionToken *string
	if persona.NeedsSessionToken(inquiry.Status) {
		token, err := s.resumeWithFallback(ctx, organizationID, app, inquiryID, inquiry.Status)
		if err != nil {
			return nil, err
		}
		inquiryID = token.inquiryID
		sessionToken = &token.sessionToken
	}

	return &SessionData{InquiryID: inquiryID, SessionToken: sessionToken}, nil
}

func (s *Service) AssertProductionReady(ctx context.Context, organizationID string) error {
	org, err := s.orgs.GetByID(ctx, organizationID)
	if err != nil {
		return err
	}
	if org == nil {
		return &ServiceError{Message: "Business not found", Code: "not_found"}
	}
	if org.VerificationStatus != "verified" {
		return &ServiceError{Message: "Complete identity verification before enabling production", Code: "forbidden"}
	}
	if org.VerificationExpiresAt != nil && !org.VerificationExpiresAt.After(time.Now()) {
		return &ServiceError{Message: "Identity verification has expired", Code: "forbidden"}
	}
	return nil
}

type resumeResult struct {
	inquiryID    string
	sessionToken string
}

func (s *Service) resumeWithFallback(ctx context.Context, organizationID string, app *Application, inquiryID string, status persona.InquiryStatus) (resumeResult, error) {
	token, err := s.persona.ResumeInquiry(inquiryID)
	if err == nil {
		return resumeResult{inquiryID: inquiryID, sessionToken: token}, nil
	}
	if status == persona.StatusCreated || persona.MustBeReplaced(status) {
		return resumeResult{}, err
	}
	replaced, err := s.replaceInquiry(ctx, organizationID, app, "Replacement inquiry after Persona session resume failed")
	if err != nil {
		return resumeResult{}, err
	}
	if replaced.ProviderInquiryID == nil {
		return resumeResult{}, errors.New("verification has not been started yet")
	}
	token, err = s.persona.ResumeInquiry(*replaced.ProviderInquiryID)
	if err != nil {
		return resumeResult{}, err
	}
	return resumeResult{inquiryID: *replaced.ProviderInquiryID, sessionToken: token}, nil
}

func (s *Service) syncInquiryState(ctx context.Context, organizationID string, app *Application) (*persona.Inquiry, error) {
	if app.ProviderInquiryID == nil {
		return nil, &ServiceError{Message: "Verification has not been started yet", Code: "not_found"}
	}
	inquiry, err := s.persona.GetInquiry(*app.ProviderInquiryID)
	if err != nil {
		return nil, err
	}
	if err := s.applyInquiryProfile(ctx, app.ID, inquiry); err != nil {
		return nil, err
	}
	if err := s.applyInquiryStatus(ctx, organizationID, inquiry.InquiryID, inquiry.Status); err != nil {
		return nil, err
	}
	return inquiry, nil
}

func (s *Service) replaceInquiry(ctx context.Context, organizationID string, app *Application, note string) (*Application, error) {
	if note == "" {
		if app.AccountType == "business" {
			note = "Business account | New Persona inquiry"
		} else {
			note = "Personal account | New Persona inquiry"
		}
	}
	inquiry, err := s.persona.CreateInquiry(organizationID, note)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	replaced, err := s.scanApplication(s.pool.QueryRow(ctx, `
		UPDATE organization_verification_applications
		SET provider_inquiry_id = $1, provider_status = $2, updated_at = $3
		WHERE id = $4
		RETURNING id, organization_id, account_type, display_name, registration_number, country,
		          business_description, provider, provider_inquiry_id, provider_status, created_at, updated_at`,
		inquiry.InquiryID, persona.MapProviderStatus(inquiry.Status), now, app.ID))
	if err != nil {
		return nil, err
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE organizations
		SET verification_status = 'pending', verified_at = NULL, verification_expires_at = NULL, updated_at = $1
		WHERE id = $2`, now, organizationID)
	return replaced, err
}

func (s *Service) applyInquiryProfile(ctx context.Context, applicationID string, inquiry *persona.Inquiry) error {
	displayName, country := persona.ExtractProfile(inquiry.Fields)
	if displayName == nil && country == nil {
		return nil
	}
	if country != nil {
		normalized := normalizeCountryCode(*country)
		country = &normalized
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE organization_verification_applications
		SET display_name = COALESCE($1, display_name),
		    country = COALESCE($2, country),
		    updated_at = NOW()
		WHERE id = $3`, displayName, country, applicationID)
	return err
}

func (s *Service) applyInquiryStatus(ctx context.Context, organizationID, inquiryID string, status persona.InquiryStatus) error {
	app, err := s.getApplication(ctx, organizationID)
	if err != nil || app == nil || app.ProviderInquiryID == nil || *app.ProviderInquiryID != inquiryID {
		return err
	}

	providerStatus := persona.MapProviderStatus(status)
	verificationStatus := persona.MapVerificationStatus(status)
	now := time.Now()

	_, err = s.pool.Exec(ctx, `
		UPDATE organization_verification_applications
		SET provider_status = $1, updated_at = $2
		WHERE id = $3`, providerStatus, now, app.ID)
	if err != nil {
		return err
	}

	switch verificationStatus {
	case "verified":
		expires := now.AddDate(0, 0, verificationValidityDays)
		_, err = s.pool.Exec(ctx, `
			UPDATE organizations
			SET verification_status = 'verified', verified_at = $1, verification_expires_at = $2, updated_at = $1
			WHERE id = $3`, now, expires, organizationID)
	case "rejected":
		_, err = s.pool.Exec(ctx, `
			UPDATE organizations
			SET verification_status = 'rejected', verified_at = NULL, verification_expires_at = NULL, updated_at = $1
			WHERE id = $2`, now, organizationID)
	default:
		_, err = s.pool.Exec(ctx, `
			UPDATE organizations SET verification_status = 'pending', updated_at = $1 WHERE id = $2`, now, organizationID)
	}
	return err
}

func (s *Service) getApplication(ctx context.Context, organizationID string) (*Application, error) {
	return s.scanApplication(s.pool.QueryRow(ctx, `
		SELECT id, organization_id, account_type, display_name, registration_number, country,
		       business_description, provider, provider_inquiry_id, provider_status, created_at, updated_at
		FROM organization_verification_applications
		WHERE organization_id = $1 LIMIT 1`, organizationID))
}

func (s *Service) scanApplication(row pgx.Row) (*Application, error) {
	var a Application
	err := row.Scan(
		&a.ID, &a.OrganizationID, &a.AccountType, &a.DisplayName, &a.RegistrationNumber, &a.Country,
		&a.BusinessDescription, &a.Provider, &a.ProviderInquiryID, &a.ProviderStatus, &a.CreatedAt, &a.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func normalizeCountryCode(country string) string {
	trimmed := strings.TrimSpace(country)
	if len(trimmed) == 2 {
		return strings.ToUpper(trimmed)
	}
	if len(trimmed) >= 2 {
		return strings.ToUpper(trimmed[:2])
	}
	return strings.ToUpper(trimmed)
}
