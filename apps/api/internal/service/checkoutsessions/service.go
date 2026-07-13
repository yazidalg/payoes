package checkoutsessions

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
)

// ported from: apps/web/src/lib/checkout-sessions/service.ts

type Session struct {
	ID             string
	PublicID       string
	OrganizationID string
	PaymentID      string
	CustomerID     *string
	Status         string
	SuccessURL     *string
	CancelURL      *string
	ExpiresAt      *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ListRow struct {
	Session
	PaymentPublicID  string
	Amount           string
	SettlementAsset  string
	PaymentStatus    string
	CustomerPublicID *string
}

type ListQuery struct {
	Page      int
	PageSize  int
	Search    string
	Status    string
	SortOrder string
}

type CreateInput struct {
	OrganizationID   string
	Environment      string
	Amount           string
	SettlementAsset  *paymentsvc.AllowedAsset
	AllowedAssets    []paymentsvc.AllowedAsset
	Description      *string
	Metadata         map[string]string
	ExpiresInMinutes *int
	CustomerID       *string // public id
	SuccessURL       *string
	CancelURL        *string
	SourceType       string
	PaymentLinkID    *string // internal uuid
	InvoiceID        *string // internal uuid
	PricingCurrency  *string
	PricingAmount    *string
}

type Service struct {
	pool     *pgxpool.Pool
	payments *paymentsvc.Service
	webURL   string
}

func NewService(pool *pgxpool.Pool, payments *paymentsvc.Service, webURL string) *Service {
	return &Service{pool: pool, payments: payments, webURL: webURL}
}

func createPublicID() (string, error) {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "cs_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

// CheckoutURL builds the hosted checkout page URL. publicID must be a payment id (pay_...).
func (s *Service) CheckoutURL(paymentPublicID string) string {
	return strings.TrimRight(s.webURL, "/") + "/c/" + paymentPublicID
}

func (s *Service) scanSession(row pgx.Row) (*Session, error) {
	var sess Session
	err := row.Scan(
		&sess.ID, &sess.PublicID, &sess.OrganizationID, &sess.PaymentID, &sess.CustomerID,
		&sess.Status, &sess.SuccessURL, &sess.CancelURL, &sess.ExpiresAt, &sess.CreatedAt, &sess.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

const sessionSelect = `
	id, public_id, organization_id, payment_id, customer_id, status,
	success_url, cancel_url, expires_at, created_at, updated_at`

func (s *Service) GetByPublicID(ctx context.Context, publicID string) (*Session, error) {
	return s.scanSession(s.pool.QueryRow(ctx, `
		SELECT `+sessionSelect+` FROM checkout_sessions WHERE public_id = $1 LIMIT 1`, publicID))
}

// ResolvedCheckout mirrors resolvePaymentForHostedCheckout in apps/web.
type ResolvedCheckout struct {
	Payment *paymentsvc.Payment
	Session *Session
}

// ResolvePaymentForHostedCheckout resolves pay_ or cs_ checkout URLs to a payment.
func (s *Service) ResolvePaymentForHostedCheckout(ctx context.Context, checkoutID string) (*ResolvedCheckout, error) {
	checkoutID = strings.TrimSpace(checkoutID)
	if checkoutID == "" {
		return nil, nil
	}

	if strings.HasPrefix(checkoutID, "cs_") {
		sess, err := s.GetByPublicID(ctx, checkoutID)
		if err != nil || sess == nil {
			return nil, err
		}
		var paymentPublicID string
		err = s.pool.QueryRow(ctx, `
			SELECT public_id FROM payments WHERE id = $1 LIMIT 1`, sess.PaymentID).Scan(&paymentPublicID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		if err != nil {
			return nil, err
		}
		payment, err := s.payments.GetByPublicID(ctx, paymentPublicID)
		if err != nil || payment == nil {
			return nil, err
		}
		return &ResolvedCheckout{Payment: payment, Session: sess}, nil
	}

	if strings.HasPrefix(checkoutID, "pay_") {
		payment, err := s.payments.GetByPublicID(ctx, checkoutID)
		if err != nil || payment == nil {
			return nil, err
		}
		return &ResolvedCheckout{Payment: payment}, nil
	}

	return nil, nil
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Session, *paymentsvc.Payment, error) {
	sourceType := input.SourceType
	if sourceType == "" {
		sourceType = "checkout_session"
	}
	payment, err := s.payments.Create(ctx, paymentsvc.CreateInput{
		OrganizationID:   input.OrganizationID,
		Environment:      input.Environment,
		Amount:           input.Amount,
		SettlementAsset:  input.SettlementAsset,
		AllowedAssets:    input.AllowedAssets,
		Description:      input.Description,
		Metadata:         input.Metadata,
		ExpiresInMinutes: input.ExpiresInMinutes,
		CustomerID:       input.CustomerID,
		SourceType:       sourceType,
		PaymentLinkID:    input.PaymentLinkID,
		InvoiceID:        input.InvoiceID,
		PricingCurrency:  input.PricingCurrency,
		PricingAmount:    input.PricingAmount,
	})
	if err != nil {
		return nil, nil, err
	}

	publicID, err := createPublicID()
	if err != nil {
		return nil, nil, err
	}

	successURL := trimPtr(input.SuccessURL)
	cancelURL := trimPtr(input.CancelURL)

	sess, err := s.scanSession(s.pool.QueryRow(ctx, `
		INSERT INTO checkout_sessions (
			public_id, organization_id, payment_id, customer_id, status,
			success_url, cancel_url, expires_at
		) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7)
		RETURNING `+sessionSelect,
		publicID, input.OrganizationID, payment.ID, payment.CustomerID,
		successURL, cancelURL, payment.ExpiresAt,
	))
	if err != nil {
		return nil, nil, err
	}
	return sess, payment, nil
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

func (s *Service) List(ctx context.Context, organizationID, environment string, limit int) ([]ListRow, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT cs.id, cs.public_id, cs.organization_id, cs.payment_id, cs.customer_id, cs.status,
			cs.success_url, cs.cancel_url, cs.expires_at, cs.created_at, cs.updated_at,
			p.public_id, p.amount, p.settlement_asset, p.status
		FROM checkout_sessions cs
		INNER JOIN payments p ON cs.payment_id = p.id
		WHERE cs.organization_id = $1 AND p.environment = $2
		ORDER BY cs.created_at DESC
		LIMIT $3`, organizationID, environment, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ListRow
	for rows.Next() {
		var row ListRow
		if err := rows.Scan(
			&row.ID, &row.PublicID, &row.OrganizationID, &row.PaymentID, &row.CustomerID, &row.Status,
			&row.SuccessURL, &row.CancelURL, &row.ExpiresAt, &row.CreatedAt, &row.UpdatedAt,
			&row.PaymentPublicID, &row.Amount, &row.SettlementAsset, &row.PaymentStatus,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
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

	where := []string{"cs.organization_id = $1", "p.environment = $2"}
	args := []any{organizationID, environment}
	argN := 3

	if search := strings.TrimSpace(query.Search); search != "" {
		pattern := "%" + search + "%"
		where = append(where, fmt.Sprintf(
			`(cs.public_id ILIKE $%d OR p.public_id ILIKE $%d OR c.public_id ILIKE $%d)`,
			argN, argN, argN,
		))
		args = append(args, pattern)
		argN++
	}
	if status := strings.TrimSpace(query.Status); status != "" {
		where = append(where, fmt.Sprintf("cs.status = $%d", argN))
		args = append(args, status)
		argN++
	}

	whereSQL := strings.Join(where, " AND ")
	orderSQL := "cs.created_at DESC"
	if sortOrder == "asc" {
		orderSQL = "cs.created_at ASC"
	}

	countSQL := `
		SELECT COUNT(*)
		FROM checkout_sessions cs
		INNER JOIN payments p ON cs.payment_id = p.id
		LEFT JOIN customers c ON cs.customer_id = c.id
		WHERE ` + whereSQL
	var total int
	if err := s.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append(append([]any{}, args...), pageSize, offset)
	listSQL := fmt.Sprintf(`
		SELECT cs.id, cs.public_id, cs.organization_id, cs.payment_id, cs.customer_id, cs.status,
			cs.success_url, cs.cancel_url, cs.expires_at, cs.created_at, cs.updated_at,
			p.public_id, p.amount, p.settlement_asset, p.status, c.public_id
		FROM checkout_sessions cs
		INNER JOIN payments p ON cs.payment_id = p.id
		LEFT JOIN customers c ON cs.customer_id = c.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, whereSQL, orderSQL, argN, argN+1)

	rows, err := s.pool.Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var serialized []map[string]any
	for rows.Next() {
		var row ListRow
		if err := rows.Scan(
			&row.ID, &row.PublicID, &row.OrganizationID, &row.PaymentID, &row.CustomerID, &row.Status,
			&row.SuccessURL, &row.CancelURL, &row.ExpiresAt, &row.CreatedAt, &row.UpdatedAt,
			&row.PaymentPublicID, &row.Amount, &row.SettlementAsset, &row.PaymentStatus, &row.CustomerPublicID,
		); err != nil {
			return nil, 0, err
		}
		serialized = append(serialized, Serialize(row, s.CheckoutURL(row.PaymentPublicID), row.CustomerPublicID, row.PaymentPublicID, nil))
	}
	if serialized == nil {
		serialized = []map[string]any{}
	}
	return serialized, total, rows.Err()
}

type Detail struct {
	Session          *Session
	Payment          *paymentsvc.Payment
	CustomerPublicID *string
}

func (s *Service) GetDetail(ctx context.Context, publicID, organizationID, environment string) (*Detail, error) {
	sess, err := s.GetByPublicID(ctx, publicID)
	if err != nil || sess == nil {
		return nil, err
	}
	if sess.OrganizationID != organizationID {
		return nil, nil
	}
	payment, err := s.payments.GetByID(ctx, sess.PaymentID, organizationID, environment)
	if err != nil || payment == nil {
		return nil, err
	}

	var customerPublicID *string
	if sess.CustomerID != nil {
		var pid string
		err := s.pool.QueryRow(ctx, `SELECT public_id FROM customers WHERE id = $1`, *sess.CustomerID).Scan(&pid)
		if err == nil {
			customerPublicID = &pid
		}
	}
	return &Detail{Session: sess, Payment: payment, CustomerPublicID: customerPublicID}, nil
}

func Serialize(session ListRow, checkoutURL string, customerPublicID *string, paymentPublicID string, payment *paymentsvc.Payment) map[string]any {
	var settlement any
	var allowed any = []any{}
	var paid any

	if payment != nil {
		settlement = map[string]any{
			"asset_code":     payment.SettlementAsset,
			"issuer_address": payment.SettlementAssetIssuer,
		}
		allowed = payment.AllowedAssets
		if payment.PaidAsset != nil {
			paid = map[string]any{
				"asset_code":     payment.PaidAsset,
				"issuer_address": payment.PaidAssetIssuer,
			}
		}
	} else if session.SettlementAsset != "" {
		settlement = map[string]any{
			"asset_code":     session.SettlementAsset,
			"issuer_address": nil,
		}
	}

	amount := session.Amount
	paymentStatus := session.PaymentStatus
	if payment != nil {
		amount = payment.Amount
		paymentStatus = payment.Status
	}

	pid := paymentPublicID
	if pid == "" {
		pid = session.PaymentPublicID
	}

	return map[string]any{
		"id":                session.PublicID,
		"object":            "checkout.session",
		"status":            session.Status,
		"payment_intent_id": pid,
		"amount":            amount,
		"settlement_asset":  settlement,
		"allowed_assets":    allowed,
		"paid_asset":        paid,
		"payment_status":    paymentStatus,
		"customer_id":       customerPublicID,
		"success_url":       session.SuccessURL,
		"cancel_url":        session.CancelURL,
		"checkout_url":      checkoutURL,
		"expires_at":        session.ExpiresAt,
		"created_at":        session.CreatedAt,
	}
}

func SerializeSession(sess *Session, checkoutURL string, customerPublicID *string, payment *paymentsvc.Payment) map[string]any {
	row := ListRow{Session: *sess}
	if payment != nil {
		row.PaymentPublicID = payment.PublicID
		row.Amount = payment.Amount
		row.SettlementAsset = payment.SettlementAsset
		row.PaymentStatus = payment.Status
	}
	return Serialize(row, checkoutURL, customerPublicID, row.PaymentPublicID, payment)
}
