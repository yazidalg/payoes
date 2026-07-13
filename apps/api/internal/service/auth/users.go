package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	apiauth "github.com/payoesteam/payoes/apps/api/internal/auth"
	"github.com/payoesteam/payoes/apps/api/internal/config"
	"github.com/payoesteam/payoes/apps/api/internal/email"
)

var (
	ErrEmailExists         = errors.New("EMAIL_EXISTS")
	ErrGoogleAccountExists = errors.New("GOOGLE_ACCOUNT_EXISTS")
	ErrCredentialsExists   = errors.New("CREDENTIALS_ACCOUNT_EXISTS")
	ErrUserNotFound        = errors.New("USER_NOT_FOUND")
	ErrAlreadyVerified     = errors.New("ALREADY_VERIFIED")
	ErrGoogleAccount       = errors.New("GOOGLE_ACCOUNT")
	ErrResendCooldown      = errors.New("RESEND_COOLDOWN")
	ErrEmailDeliveryFailed = errors.New("EMAIL_DELIVERY_FAILED")
	ErrTokenExpired        = errors.New("TOKEN_EXPIRED")
	ErrInvalidToken        = errors.New("INVALID_TOKEN")
)

type User struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	Name            string     `json:"name"`
	Image           *string    `json:"image"`
	PasswordHash    *string    `json:"-"`
	AuthProvider    string     `json:"auth_provider"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
}

type Service struct {
	pool   *pgxpool.Pool
	cfg    config.Config
	mailer *email.Sender
}

func NewService(pool *pgxpool.Pool, cfg config.Config, mailer *email.Sender) *Service {
	return &Service{pool: pool, cfg: cfg, mailer: mailer}
}

func (s *Service) FindByEmail(ctx context.Context, emailAddr string) (*User, error) {
	return s.scanUser(ctx, `
		SELECT id, email, name, image, password_hash, auth_provider, email_verified_at
		FROM users WHERE email = $1 LIMIT 1`, strings.ToLower(emailAddr))
}

func (s *Service) FindByID(ctx context.Context, id string) (*User, error) {
	return s.scanUser(ctx, `
		SELECT id, email, name, image, password_hash, auth_provider, email_verified_at
		FROM users WHERE id = $1 LIMIT 1`, id)
}

func (s *Service) scanUser(ctx context.Context, query string, args ...any) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&u.ID, &u.Email, &u.Name, &u.Image, &u.PasswordHash, &u.AuthProvider, &u.EmailVerifiedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func IsGoogleOnly(u *User) bool {
	return u.AuthProvider == "google" || u.PasswordHash == nil || *u.PasswordHash == ""
}

func IsCredentials(u *User) bool {
	return u.AuthProvider == "credentials" && u.PasswordHash != nil && *u.PasswordHash != ""
}

func (s *Service) CreateUser(ctx context.Context, name, emailAddr, password, callbackURL string) (*User, error) {
	existing, err := s.FindByEmail(ctx, emailAddr)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if IsGoogleOnly(existing) {
			return nil, ErrGoogleAccountExists
		}
		return nil, ErrEmailExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return nil, err
	}
	hashStr := string(hash)

	var u User
	err = s.pool.QueryRow(ctx, `
		INSERT INTO users (id, email, name, password_hash, auth_provider, email_verified_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'credentials', NULL, NOW(), NOW())
		RETURNING id, email, name`,
		uuid.NewString(), strings.ToLower(emailAddr), strings.TrimSpace(name), hashStr,
	).Scan(&u.ID, &u.Email, &u.Name)
	if err != nil {
		return nil, err
	}

	token, err := s.createEmailVerificationLink(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	_ = s.sendVerification(u.Email, u.Name, token, callbackURL)
	return &u, nil
}

func (s *Service) MarkEmailVerified(ctx context.Context, userID string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx, `
		UPDATE users SET email_verified_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, name`, userID).Scan(&u.ID, &u.Email, &u.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &u, err
}

func (s *Service) ResendEmailVerification(ctx context.Context, userID, callbackURL string) (string, error) {
	user, err := s.FindByID(ctx, userID)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", ErrUserNotFound
	}
	if user.EmailVerifiedAt != nil {
		return "", ErrAlreadyVerified
	}
	if IsGoogleOnly(user) {
		return "", ErrGoogleAccount
	}

	token, err := s.createEmailVerificationLink(ctx, userID)
	if err != nil {
		return "", err
	}
	if !s.sendVerification(user.Email, user.Name, token, callbackURL).Delivered {
		return "", ErrEmailDeliveryFailed
	}
	return user.Email, nil
}

func (s *Service) ValidateCredentialLogin(ctx context.Context, emailAddr, password string) (*apiauth.SessionUser, string, error) {
	user, err := s.FindByEmail(ctx, emailAddr)
	if err != nil {
		return nil, "", err
	}
	if user == nil {
		return nil, apiauth.CodeInvalidCredentials, nil
	}
	if IsGoogleOnly(user) {
		return nil, apiauth.CodeGoogleAccount, nil
	}
	if user.EmailVerifiedAt == nil {
		return nil, apiauth.CodeEmailNotVerified, nil
	}
	if user.PasswordHash == nil {
		return nil, apiauth.CodeGoogleAccount, nil
	}
	if bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)) != nil {
		return nil, apiauth.CodeInvalidCredentials, nil
	}
	return &apiauth.SessionUser{
		ID:    user.ID,
		Email: user.Email,
		Name:  user.Name,
		Image: user.Image,
	}, "", nil
}

func (s *Service) UpsertOAuthUser(ctx context.Context, emailAddr string, name, image *string) (*User, error) {
	emailLower := strings.ToLower(emailAddr)
	existing, err := s.FindByEmail(ctx, emailLower)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		if IsCredentials(existing) {
			return nil, ErrCredentialsExists
		}
		displayName := existing.Name
		if name != nil && strings.TrimSpace(*name) != "" {
			displayName = strings.TrimSpace(*name)
		}
		img := existing.Image
		if image != nil {
			img = image
		}
		var u User
		err = s.pool.QueryRow(ctx, `
			UPDATE users SET name = $2, image = $3,
				email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
			WHERE id = $1
			RETURNING id, email, name, image`,
			existing.ID, displayName, img,
		).Scan(&u.ID, &u.Email, &u.Name, &u.Image)
		return &u, err
	}

	displayName := emailLower
	if i := strings.Index(emailLower, "@"); i > 0 {
		displayName = emailLower[:i]
	}
	if name != nil && strings.TrimSpace(*name) != "" {
		displayName = strings.TrimSpace(*name)
	}

	var u User
	err = s.pool.QueryRow(ctx, `
		INSERT INTO users (id, email, name, image, password_hash, auth_provider, email_verified_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NULL, 'google', NOW(), NOW(), NOW())
		RETURNING id, email, name, image`,
		uuid.NewString(), emailLower, displayName, image,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Image)
	return &u, err
}

func (s *Service) createEmailVerificationLink(ctx context.Context, userID string) (string, error) {
	now := time.Now()

	var createdAt time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT created_at FROM email_verification_otps
		WHERE user_id = $1 AND consumed_at IS NULL
		ORDER BY created_at DESC LIMIT 1`, userID).Scan(&createdAt)
	if err == nil {
		if now.Sub(createdAt).Seconds() < apiauth.EmailVerificationResendCooldownSeconds {
			return "", ErrResendCooldown
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	_, _ = s.pool.Exec(ctx, `
		UPDATE email_verification_otps SET consumed_at = $2
		WHERE user_id = $1 AND consumed_at IS NULL`, userID, now)

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	token := hex.EncodeToString(raw)
	sum := sha256.Sum256([]byte(token))
	codeHash := hex.EncodeToString(sum[:])
	expiresAt := now.Add(apiauth.EmailVerificationTokenTTLHours * time.Hour)

	_, err = s.pool.Exec(ctx, `
		INSERT INTO email_verification_otps (id, user_id, code_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		uuid.NewString(), userID, codeHash, expiresAt, now,
	)
	if err != nil {
		return "", err
	}
	return token, nil
}

func (s *Service) ConsumeEmailVerificationToken(ctx context.Context, rawToken string) (*User, error) {
	now := time.Now()
	sum := sha256.Sum256([]byte(rawToken))
	codeHash := hex.EncodeToString(sum[:])

	var otpID, userID string
	err := s.pool.QueryRow(ctx, `
		SELECT id, user_id FROM email_verification_otps
		WHERE code_hash = $1 AND consumed_at IS NULL AND expires_at > $2
		LIMIT 1`, codeHash, now).Scan(&otpID, &userID)
	if errors.Is(err, pgx.ErrNoRows) {
		var exists string
		err2 := s.pool.QueryRow(ctx, `SELECT id FROM email_verification_otps WHERE code_hash = $1 LIMIT 1`, codeHash).Scan(&exists)
		if err2 == nil {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}
	if err != nil {
		return nil, err
	}

	_, err = s.pool.Exec(ctx, `UPDATE email_verification_otps SET consumed_at = $2 WHERE id = $1`, otpID, now)
	if err != nil {
		return nil, err
	}
	return s.FindByID(ctx, userID)
}

func (s *Service) sendVerification(to, name, token, callbackURL string) email.DeliveryResult {
	base := strings.TrimRight(s.cfg.APIURL, "/")
	verifyURL := fmt.Sprintf("%s/api/auth/verify-email?token=%s", base, token)
	if callbackURL != "" {
		verifyURL += "&callbackUrl=" + callbackURL
	}
	html := email.VerificationHTML(email.VerificationEmail{
		Email:          to,
		Name:           name,
		URL:            verifyURL,
		ExpiresInHours: apiauth.EmailVerificationTokenTTLHours,
		WordmarkURL:    email.DefaultWordmarkURL(s.cfg.WebURL),
	})
	return s.mailer.Send(to, "Verify your Payoes email", html)
}

func (s *Service) UserHasOrganization(ctx context.Context, userID string) (bool, error) {
	var id string
	err := s.pool.QueryRow(ctx, `
		SELECT id FROM organization_members WHERE user_id = $1 LIMIT 1`, userID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (s *Service) PendingInviteTokenForEmail(ctx context.Context, emailAddr string) (string, error) {
	var token string
	err := s.pool.QueryRow(ctx, `
		SELECT token FROM organization_invites
		WHERE lower(email) = lower($1)
			AND accepted_at IS NULL
			AND revoked_at IS NULL
			AND expires_at > NOW()
		ORDER BY created_at DESC LIMIT 1`, emailAddr).Scan(&token)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return token, err
}

func (s *Service) UpdateProfile(ctx context.Context, userID, name string, image *string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx, `
		UPDATE users SET name = $2, image = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, name, image`, userID, name, image,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Image)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &u, err
}

func (s *Service) ResolvePostAuthRedirect(ctx context.Context, userID, userEmail, callbackURL string) (string, error) {
	if safe := apiauth.GetSafePostAuthRedirect(callbackURL); safe != "" {
		return safe, nil
	}
	token, err := s.PendingInviteTokenForEmail(ctx, userEmail)
	if err != nil {
		return "", err
	}
	if token != "" {
		return "/invite/" + token, nil
	}
	hasOrg, err := s.UserHasOrganization(ctx, userID)
	if err != nil {
		return "", err
	}
	if hasOrg {
		return "/dashboard/payments", nil
	}
	return "/onboarding", nil
}
