package invoices

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

	"github.com/payoesteam/payoes/apps/api/internal/email"
	checkoutsessions "github.com/payoesteam/payoes/apps/api/internal/service/checkoutsessions"
	customersvc "github.com/payoesteam/payoes/apps/api/internal/service/customers"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
)

// ported from: apps/web/src/lib/invoices/service.ts

type Invoice struct {
	ID                string
	PublicID          string
	OrganizationID    string
	Environment       string
	CustomerID        string
	CheckoutSessionID *string
	Amount            string
	CurrencyCode      string
	Description       *string
	Status            string
	Metadata          map[string]string
	DueAt             *time.Time
	PaidAt            *time.Time
	InvoiceNumber     *string
	SentAt            *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type Item struct {
	ID          string
	InvoiceID   string
	Description string
	Quantity    string
	UnitAmount  string
	SortOrder   int
	CreatedAt   time.Time
}

type ListRow struct {
	Invoice
	CustomerPublicID string
	CustomerName     *string
	CustomerEmail    *string
}

type ListQuery struct {
	Page      int
	PageSize  int
	Search    string
	Status    string
	SortOrder string
}

type CreateInput struct {
	OrganizationID string
	Environment    string
	CustomerID     string // public id
	Amount         *string
	CurrencyCode   string
	Description    *string
	Metadata       map[string]string
	DueInDays      *int
	DueAt          *time.Time
	Items          []LineItemInput
}

type UpdateInput struct {
	Description    *string
	SetDescription bool
	DueAt          *time.Time
	Metadata       map[string]string
	SetMetadata    bool
	Items          []LineItemInput
	SetItems       bool
}

type Detail struct {
	Invoice                 *Invoice
	CustomerPublicID        *string
	CustomerName            *string
	CustomerEmail           *string
	Items                   []Item
	CheckoutURL             *string
	CheckoutSessionPublicID *string
}

type Service struct {
	pool           *pgxpool.Pool
	customers      *customersvc.Service
	checkouts      *checkoutsessions.Service
	paymentMethods *paymentmethodssvc.Service
	mailer         *email.Sender
	webURL         string
}

func NewService(
	pool *pgxpool.Pool,
	customers *customersvc.Service,
	checkouts *checkoutsessions.Service,
	paymentMethods *paymentmethodssvc.Service,
	mailer *email.Sender,
	webURL string,
) *Service {
	return &Service{
		pool: pool, customers: customers, checkouts: checkouts,
		paymentMethods: paymentMethods, mailer: mailer, webURL: webURL,
	}
}

func createPublicID() (string, error) {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "inv_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func (s *Service) createInvoiceNumber(ctx context.Context, organizationID string) (string, error) {
	var count int
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM invoices WHERE organization_id = $1`, organizationID).Scan(&count); err != nil {
		return "", err
	}
	return fmt.Sprintf("INV-%06d", count+1), nil
}

func (s *Service) scanInvoice(row pgx.Row) (*Invoice, error) {
	var (
		inv     Invoice
		metaRaw []byte
	)
	err := row.Scan(
		&inv.ID, &inv.PublicID, &inv.OrganizationID, &inv.Environment, &inv.CustomerID,
		&inv.CheckoutSessionID, &inv.Amount, &inv.CurrencyCode, &inv.Description, &inv.Status,
		&metaRaw, &inv.DueAt, &inv.PaidAt, &inv.InvoiceNumber, &inv.SentAt, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(metaRaw) > 0 {
		_ = json.Unmarshal(metaRaw, &inv.Metadata)
	}
	return &inv, nil
}

const invoiceSelect = `
	id, public_id, organization_id, environment, customer_id, checkout_session_id,
	amount, currency_code, description, status, metadata, due_at, paid_at,
	invoice_number, sent_at, created_at, updated_at`

func (s *Service) GetByPublicID(ctx context.Context, publicID string) (*Invoice, error) {
	return s.scanInvoice(s.pool.QueryRow(ctx, `
		SELECT `+invoiceSelect+` FROM invoices WHERE public_id = $1 LIMIT 1`, publicID))
}

func (s *Service) GetForOrganization(ctx context.Context, publicID, organizationID, environment string) (*Invoice, error) {
	inv, err := s.GetByPublicID(ctx, publicID)
	if err != nil || inv == nil {
		return nil, err
	}
	if inv.OrganizationID != organizationID || inv.Environment != environment {
		return nil, nil
	}
	return inv, nil
}

func (s *Service) ListItems(ctx context.Context, invoiceID string) ([]Item, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, invoice_id, description, quantity, unit_amount, sort_order, created_at
		FROM invoice_items
		WHERE invoice_id = $1
		ORDER BY sort_order ASC, created_at ASC`, invoiceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Item
	for rows.Next() {
		var item Item
		if err := rows.Scan(&item.ID, &item.InvoiceID, &item.Description, &item.Quantity, &item.UnitAmount, &item.SortOrder, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Service) insertItems(ctx context.Context, invoiceID string, items []LineItemInput, currencyCode string) error {
	for i, item := range items {
		unit, err := ParseFiatAmount(strings.TrimSpace(item.UnitAmount), currencyCode)
		if err != nil {
			return err
		}
		_, err = s.pool.Exec(ctx, `
			INSERT INTO invoice_items (invoice_id, description, quantity, unit_amount, sort_order)
			VALUES ($1, $2, $3, $4, $5)`,
			invoiceID, strings.TrimSpace(item.Description), strings.TrimSpace(item.Quantity), unit, i,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) List(ctx context.Context, organizationID, environment string, limit int) ([]ListRow, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT i.id, i.public_id, i.organization_id, i.environment, i.customer_id, i.checkout_session_id,
			i.amount, i.currency_code, i.description, i.status, i.metadata, i.due_at, i.paid_at,
			i.invoice_number, i.sent_at, i.created_at, i.updated_at,
			c.public_id, c.name, c.email
		FROM invoices i
		INNER JOIN customers c ON i.customer_id = c.id
		WHERE i.organization_id = $1 AND i.environment = $2
		ORDER BY i.created_at DESC
		LIMIT $3`, organizationID, environment, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanListRows(rows)
}

func scanListRows(rows pgx.Rows) ([]ListRow, error) {
	var out []ListRow
	for rows.Next() {
		var (
			row     ListRow
			metaRaw []byte
		)
		if err := rows.Scan(
			&row.ID, &row.PublicID, &row.OrganizationID, &row.Environment, &row.CustomerID, &row.CheckoutSessionID,
			&row.Amount, &row.CurrencyCode, &row.Description, &row.Status, &metaRaw, &row.DueAt, &row.PaidAt,
			&row.InvoiceNumber, &row.SentAt, &row.CreatedAt, &row.UpdatedAt,
			&row.CustomerPublicID, &row.CustomerName, &row.CustomerEmail,
		); err != nil {
			return nil, err
		}
		if len(metaRaw) > 0 {
			_ = json.Unmarshal(metaRaw, &row.Metadata)
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

	where := []string{"i.organization_id = $1", "i.environment = $2"}
	args := []any{organizationID, environment}
	argN := 3

	if search := strings.TrimSpace(query.Search); search != "" {
		pattern := "%" + search + "%"
		where = append(where, fmt.Sprintf(`(
			i.public_id ILIKE $%d OR i.invoice_number ILIKE $%d OR i.description ILIKE $%d OR
			c.public_id ILIKE $%d OR c.name ILIKE $%d OR c.email ILIKE $%d
		)`, argN, argN, argN, argN, argN, argN))
		args = append(args, pattern)
		argN++
	}
	if status := strings.TrimSpace(query.Status); status == "overdue" {
		where = append(where, "i.status = 'open'", fmt.Sprintf("i.due_at < $%d", argN))
		args = append(args, time.Now())
		argN++
	} else if status != "" {
		where = append(where, fmt.Sprintf("i.status = $%d", argN))
		args = append(args, status)
		argN++
	}

	whereSQL := strings.Join(where, " AND ")
	orderSQL := "i.created_at DESC"
	if sortOrder == "asc" {
		orderSQL = "i.created_at ASC"
	}

	var total int
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM invoices i
		INNER JOIN customers c ON i.customer_id = c.id
		WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append(append([]any{}, args...), pageSize, offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
		SELECT i.id, i.public_id, i.organization_id, i.environment, i.customer_id, i.checkout_session_id,
			i.amount, i.currency_code, i.description, i.status, i.metadata, i.due_at, i.paid_at,
			i.invoice_number, i.sent_at, i.created_at, i.updated_at,
			c.public_id, c.name, c.email
		FROM invoices i
		INNER JOIN customers c ON i.customer_id = c.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, whereSQL, orderSQL, argN, argN+1), listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	listRows, err := scanListRows(rows)
	if err != nil {
		return nil, 0, err
	}
	serialized, err := s.SerializeMany(ctx, listRows)
	if err != nil {
		return nil, 0, err
	}
	return serialized, total, nil
}

func (s *Service) GetDetail(ctx context.Context, publicID, organizationID, environment string) (*Detail, error) {
	inv, err := s.GetForOrganization(ctx, publicID, organizationID, environment)
	if err != nil || inv == nil {
		return nil, err
	}

	var customerPublicID, customerName, customerEmail *string
	var pid string
	var name, email *string
	err = s.pool.QueryRow(ctx, `
		SELECT public_id, name, email FROM customers WHERE id = $1 LIMIT 1`, inv.CustomerID).
		Scan(&pid, &name, &email)
	if err == nil {
		customerPublicID = &pid
		customerName = name
		customerEmail = email
	}

	items, err := s.ListItems(ctx, inv.ID)
	if err != nil {
		return nil, err
	}

	var checkoutURL, sessionPublicID *string
	if inv.CheckoutSessionID != nil {
		var spid, ppid string
		err := s.pool.QueryRow(ctx, `
			SELECT cs.public_id, p.public_id
			FROM checkout_sessions cs
			INNER JOIN payments p ON cs.payment_id = p.id
			WHERE cs.id = $1 LIMIT 1`, *inv.CheckoutSessionID).Scan(&spid, &ppid)
		if err == nil {
			sessionPublicID = &spid
			url := s.checkouts.CheckoutURL(ppid)
			checkoutURL = &url
		}
	}

	return &Detail{
		Invoice: inv, CustomerPublicID: customerPublicID, CustomerName: customerName,
		CustomerEmail: customerEmail, Items: items, CheckoutURL: checkoutURL,
		CheckoutSessionPublicID: sessionPublicID,
	}, nil
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Invoice, error) {
	currencyCode := ResolveCurrencyCode(input.CurrencyCode)
	if !isInvoiceCurrencyCode(currencyCode) {
		return nil, errors.New("Unsupported invoice currency")
	}

	customer, err := s.customers.GetByPublicID(ctx, input.CustomerID)
	if err != nil {
		return nil, err
	}
	if customer == nil || customer.OrganizationID != input.OrganizationID {
		return nil, errors.New("Customer not found")
	}
	if customer.Environment != input.Environment {
		return nil, errors.New("Customer environment does not match invoice environment")
	}

	items := input.Items
	var amount string
	if len(items) > 0 {
		amount, err = CalculateTotal(items, currencyCode)
		if err != nil {
			return nil, err
		}
	} else if input.Amount != nil && strings.TrimSpace(*input.Amount) != "" {
		amount, err = ParseFiatAmount(*input.Amount, currencyCode)
		if err != nil {
			return nil, err
		}
	} else {
		return nil, errors.New("Invoice amount or items are required")
	}

	publicID, err := createPublicID()
	if err != nil {
		return nil, err
	}
	invoiceNumber, err := s.createInvoiceNumber(ctx, input.OrganizationID)
	if err != nil {
		return nil, err
	}

	dueAt := input.DueAt
	if dueAt == nil {
		days := defaultInvoiceDueDays
		if input.DueInDays != nil {
			days = *input.DueInDays
		}
		t := time.Now().Add(time.Duration(days) * 24 * time.Hour)
		dueAt = &t
	}

	var metaJSON []byte
	if input.Metadata != nil {
		metaJSON, err = json.Marshal(input.Metadata)
		if err != nil {
			return nil, err
		}
	}

	description := trimPtr(input.Description)
	inv, err := s.scanInvoice(s.pool.QueryRow(ctx, `
		INSERT INTO invoices (
			public_id, invoice_number, organization_id, environment, customer_id,
			amount, currency_code, description, metadata, status, due_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)
		RETURNING `+invoiceSelect,
		publicID, invoiceNumber, input.OrganizationID, input.Environment, customer.ID,
		amount, currencyCode, description, metaJSON, dueAt,
	))
	if err != nil {
		return nil, err
	}

	if len(items) > 0 {
		if err := s.insertItems(ctx, inv.ID, items, currencyCode); err != nil {
			return nil, err
		}
	} else if description != nil {
		if err := s.insertItems(ctx, inv.ID, []LineItemInput{{
			Description: *description, Quantity: "1", UnitAmount: amount,
		}}, currencyCode); err != nil {
			return nil, err
		}
	}
	return inv, nil
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

func (s *Service) Finalize(ctx context.Context, publicID, organizationID, environment string) (*Invoice, *checkoutsessions.Session, string, error) {
	inv, err := s.GetForOrganization(ctx, publicID, organizationID, environment)
	if err != nil {
		return nil, nil, "", err
	}
	if inv == nil {
		return nil, nil, "", errors.New("Invoice not found")
	}
	if inv.Status != "draft" {
		return nil, nil, "", fmt.Errorf("Invoice is %s", inv.Status)
	}

	var customerPublicID string
	if err := s.pool.QueryRow(ctx, `SELECT public_id FROM customers WHERE id = $1`, inv.CustomerID).
		Scan(&customerPublicID); err != nil {
		return nil, nil, "", errors.New("Customer not found")
	}

	var expiresIn *int
	if inv.DueAt != nil {
		minutes := int((time.Until(*inv.DueAt) + time.Minute - time.Nanosecond) / time.Minute)
		if minutes < minPaymentExpiryMinutes {
			minutes = minPaymentExpiryMinutes
		}
		expiresIn = &minutes
	}

	currency := inv.CurrencyCode
	amount := inv.Amount

	assetConfig, err := s.paymentMethods.GetDefaultAssetConfig(ctx, inv.OrganizationID)
	if err != nil {
		return nil, nil, "", err
	}
	settlement := paymentsvc.AllowedAsset{
		AssetCode: assetConfig.SettlementAsset.AssetCode, IssuerAddress: assetConfig.SettlementAsset.IssuerAddress,
	}
	allowed := make([]paymentsvc.AllowedAsset, 0, len(assetConfig.AllowedAssets))
	for _, a := range assetConfig.AllowedAssets {
		allowed = append(allowed, paymentsvc.AllowedAsset{AssetCode: a.AssetCode, IssuerAddress: a.IssuerAddress})
	}

	sess, payment, err := s.checkouts.Create(ctx, checkoutsessions.CreateInput{
		OrganizationID:   inv.OrganizationID,
		Environment:      inv.Environment,
		Amount:           placeholderPricingPaymentAmount,
		SettlementAsset:  &settlement,
		AllowedAssets:    allowed,
		PricingCurrency:  &currency,
		PricingAmount:    &amount,
		Description:      inv.Description,
		Metadata:         inv.Metadata,
		CustomerID:       &customerPublicID,
		SourceType:       "invoice",
		InvoiceID:        &inv.ID,
		ExpiresInMinutes: expiresIn,
	})
	if err != nil {
		return nil, nil, "", err
	}
	updated, err := s.scanInvoice(s.pool.QueryRow(ctx, `
		UPDATE invoices SET status = 'open', checkout_session_id = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING `+invoiceSelect, sess.ID, inv.ID))
	if err != nil {
		return nil, nil, "", err
	}
	return updated, sess, s.checkouts.CheckoutURL(payment.PublicID), nil
}

func (s *Service) Send(ctx context.Context, publicID, organizationID, environment string) (*Invoice, string, bool, bool, error) {
	detail, err := s.GetDetail(ctx, publicID, organizationID, environment)
	if err != nil {
		return nil, "", false, false, err
	}
	if detail == nil {
		return nil, "", false, false, errors.New("Invoice not found")
	}
	if detail.CustomerEmail == nil || strings.TrimSpace(*detail.CustomerEmail) == "" {
		return nil, "", false, false, errors.New("Customer email is required to send an invoice")
	}

	checkoutURL := detail.CheckoutURL
	inv := detail.Invoice
	if inv.Status == "draft" {
		updated, sess, url, err := s.Finalize(ctx, publicID, organizationID, environment)
		if err != nil {
			return nil, "", false, false, err
		}
		inv = updated
		checkoutURL = &url
		_ = sess
	}

	urlStr := ""
	if checkoutURL != nil {
		urlStr = *checkoutURL
	}
	invoiceNumber := inv.PublicID
	if inv.InvoiceNumber != nil && *inv.InvoiceNumber != "" {
		invoiceNumber = *inv.InvoiceNumber
	}

	var orgName string
	_ = s.pool.QueryRow(ctx, `SELECT name FROM organizations WHERE id = $1 LIMIT 1`, organizationID).Scan(&orgName)
	if strings.TrimSpace(orgName) == "" {
		orgName = "Merchant"
	}

	customerName := ""
	if detail.CustomerName != nil {
		customerName = *detail.CustomerName
	}
	description := ""
	if inv.Description != nil {
		description = *inv.Description
	}
	envLabel := ""
	if environment == "sandbox" {
		envLabel = "Sandbox"
	}

	emailItems := make([]email.InvoiceEmailItem, 0, len(detail.Items))
	for _, item := range detail.Items {
		lineAmount, err := LineItemAmount(LineItemInput{
			Description: item.Description,
			Quantity:    item.Quantity,
			UnitAmount:  item.UnitAmount,
		}, inv.CurrencyCode)
		if err != nil {
			lineAmount = item.UnitAmount
		}
		emailItems = append(emailItems, email.InvoiceEmailItem{
			Description: item.Description,
			Quantity:    item.Quantity,
			UnitAmount:  item.UnitAmount,
			LineAmount:  lineAmount,
		})
	}

	subject := fmt.Sprintf("Invoice %s from %s", invoiceNumber, orgName)
	if environment == "sandbox" {
		subject = "[Sandbox] " + subject
	}
	html := email.InvoiceHTML(email.InvoiceEmail{
		Email:            *detail.CustomerEmail,
		InvoiceNumber:    invoiceNumber,
		AmountDue:        inv.Amount,
		CurrencyCode:     inv.CurrencyCode,
		DueDateLabel:     email.FormatDueDateLabel(inv.DueAt),
		OrganizationName: orgName,
		CustomerName:     customerName,
		Description:      description,
		Items:            emailItems,
		PayURL:           urlStr,
		EnvironmentLabel: envLabel,
		WordmarkURL:      email.DefaultWordmarkURL(s.webURL),
	})
	delivery := s.mailer.Send(*detail.CustomerEmail, subject, html)

	updated, err := s.scanInvoice(s.pool.QueryRow(ctx, `
		UPDATE invoices SET sent_at = NOW(), updated_at = NOW() WHERE id = $1
		RETURNING `+invoiceSelect, inv.ID))
	if err != nil {
		return nil, "", false, false, err
	}
	return updated, urlStr, delivery.Delivered, delivery.Logged, nil
}
func (s *Service) Void(ctx context.Context, publicID, organizationID, environment string) (*Invoice, error) {
	inv, err := s.GetForOrganization(ctx, publicID, organizationID, environment)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("Invoice not found")
	}
	if inv.Status == "paid" {
		return nil, errors.New("Paid invoices cannot be voided")
	}
	return s.scanInvoice(s.pool.QueryRow(ctx, `
		UPDATE invoices SET status = 'void', updated_at = NOW() WHERE id = $1
		RETURNING `+invoiceSelect, inv.ID))
}

func (s *Service) MarkPaid(ctx context.Context, publicID, organizationID, environment string) (*Invoice, error) {
	inv, err := s.GetForOrganization(ctx, publicID, organizationID, environment)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("Invoice not found")
	}
	if inv.Status != "open" {
		return nil, errors.New("Only open invoices can be marked as paid")
	}
	return s.scanInvoice(s.pool.QueryRow(ctx, `
		UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1
		RETURNING `+invoiceSelect, inv.ID))
}

func (s *Service) Delete(ctx context.Context, publicID, organizationID, environment string) error {
	inv, err := s.GetForOrganization(ctx, publicID, organizationID, environment)
	if err != nil {
		return err
	}
	if inv == nil {
		return errors.New("Invoice not found")
	}
	if inv.Status != "draft" {
		return errors.New("Only draft invoices can be deleted")
	}
	_, err = s.pool.Exec(ctx, `DELETE FROM invoices WHERE id = $1`, inv.ID)
	return err
}

func assertEditable(status string) error {
	if status != "draft" && status != "open" {
		return errors.New("Only draft or unpaid invoices can be changed")
	}
	return nil
}

func (s *Service) Update(ctx context.Context, publicID, organizationID, environment string, input UpdateInput) (*Invoice, error) {
	inv, err := s.GetForOrganization(ctx, publicID, organizationID, environment)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("Invoice not found")
	}
	if err := assertEditable(inv.Status); err != nil {
		return nil, err
	}

	currencyCode := ResolveCurrencyCode(inv.CurrencyCode)
	amount := inv.Amount
	if input.SetItems {
		if len(input.Items) == 0 {
			return nil, errors.New("At least one line item is required")
		}
		amount, err = CalculateTotal(input.Items, currencyCode)
		if err != nil {
			return nil, err
		}
		if _, err := s.pool.Exec(ctx, `DELETE FROM invoice_items WHERE invoice_id = $1`, inv.ID); err != nil {
			return nil, err
		}
		if err := s.insertItems(ctx, inv.ID, input.Items, currencyCode); err != nil {
			return nil, err
		}
	}

	description := inv.Description
	if input.SetDescription {
		description = trimPtr(input.Description)
	}
	dueAt := inv.DueAt
	if input.DueAt != nil {
		dueAt = input.DueAt
	}
	var metaJSON []byte
	metadata := inv.Metadata
	if input.SetMetadata {
		metadata = input.Metadata
	}
	if metadata != nil {
		metaJSON, err = json.Marshal(metadata)
		if err != nil {
			return nil, err
		}
	}

	return s.scanInvoice(s.pool.QueryRow(ctx, `
		UPDATE invoices SET amount = $1, description = $2, metadata = $3, due_at = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING `+invoiceSelect, amount, description, metaJSON, dueAt, inv.ID))
}

func (s *Service) ChangeCustomer(ctx context.Context, publicID, organizationID, environment, customerPublicID string) (*Invoice, error) {
	inv, err := s.GetForOrganization(ctx, publicID, organizationID, environment)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("Invoice not found")
	}
	if err := assertEditable(inv.Status); err != nil {
		return nil, err
	}
	customer, err := s.customers.GetByPublicID(ctx, customerPublicID)
	if err != nil {
		return nil, err
	}
	if customer == nil || customer.OrganizationID != organizationID {
		return nil, errors.New("Customer not found")
	}
	if customer.Environment != environment {
		return nil, errors.New("Customer environment does not match invoice environment")
	}
	return s.scanInvoice(s.pool.QueryRow(ctx, `
		UPDATE invoices SET customer_id = $1, updated_at = NOW() WHERE id = $2
		RETURNING `+invoiceSelect, customer.ID, inv.ID))
}

func (s *Service) GetPaymentAssets(ctx context.Context, inv *Invoice) (*paymentmethodssvc.AssetConfig, error) {
	if inv.CheckoutSessionID != nil {
		var paymentID string
		err := s.pool.QueryRow(ctx, `
			SELECT payment_id FROM checkout_sessions WHERE id = $1 LIMIT 1`, *inv.CheckoutSessionID).Scan(&paymentID)
		if err == nil {
			var settlement string
			var issuer *string
			var allowedRaw []byte
			err := s.pool.QueryRow(ctx, `
				SELECT settlement_asset, settlement_asset_issuer, allowed_assets
				FROM payments WHERE id = $1 LIMIT 1`, paymentID).
				Scan(&settlement, &issuer, &allowedRaw)
			if err == nil {
				var allowed []paymentmethodssvc.AllowedAsset
				_ = json.Unmarshal(allowedRaw, &allowed)
				return &paymentmethodssvc.AssetConfig{
					SettlementAsset: paymentmethodssvc.AllowedAsset{AssetCode: settlement, IssuerAddress: issuer},
					AllowedAssets:   allowed,
				}, nil
			}
		}
	}
	return s.paymentMethods.GetDefaultAssetConfig(ctx, inv.OrganizationID)
}

func displayStatus(status string, dueAt *time.Time) string {
	if status == "open" && dueAt != nil && dueAt.Before(time.Now()) {
		return "overdue"
	}
	return status
}

func formatActivityDate(t time.Time) string {
	return t.Format("Jan 2, 3:04 PM")
}

func BuildActivity(status string, createdAt, updatedAt time.Time, sentAt, paidAt *time.Time, checkoutSessionID, customerEmail *string) []map[string]any {
	type event struct {
		id, label string
		at        time.Time
	}
	var events []event
	if paidAt != nil {
		events = append(events, event{"paid", "Invoice was marked as paid", *paidAt})
	}
	if sentAt != nil {
		label := "Invoice was sent to customer"
		if customerEmail != nil && strings.TrimSpace(*customerEmail) != "" {
			label = "Invoice was sent to " + strings.TrimSpace(*customerEmail)
		}
		events = append(events, event{"sent", label, *sentAt})
	}
	if checkoutSessionID != nil && status != "draft" && status != "void" {
		events = append(events, event{"payment-page", "Invoice payment page was created", updatedAt})
	}
	if status != "draft" && status != "void" {
		finalizedAt := updatedAt
		if sentAt != nil {
			finalizedAt = *sentAt
		}
		events = append(events, event{"finalized", "Invoice was finalized", finalizedAt})
	}
	events = append(events, event{"created", "Invoice was created", createdAt})

	// sort desc by time
	for i := 0; i < len(events); i++ {
		for j := i + 1; j < len(events); j++ {
			if events[j].at.After(events[i].at) {
				events[i], events[j] = events[j], events[i]
			}
		}
	}
	seen := map[string]bool{}
	out := make([]map[string]any, 0, len(events))
	for _, e := range events {
		key := fmt.Sprintf("%s:%d", e.id, e.at.UnixNano())
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, map[string]any{"id": e.id, "label": e.label, "at": formatActivityDate(e.at)})
	}
	return out
}

type SerializeOpts struct {
	CheckoutURL             *string
	CheckoutSessionPublicID *string
	Items                   []Item
	SettlementAsset         *string
	AllowedAssets           []string
	CustomerName            *string
	CustomerEmail           *string
	IncludeActivity         bool
}

func Serialize(inv *Invoice, customerPublicID *string, opts SerializeOpts) map[string]any {
	invoiceNumber := inv.PublicID
	if inv.InvoiceNumber != nil && *inv.InvoiceNumber != "" {
		invoiceNumber = *inv.InvoiceNumber
	}

	var settlement any
	if opts.SettlementAsset != nil {
		settlement = map[string]any{"asset_code": *opts.SettlementAsset, "issuer_address": nil}
	}
	allowed := make([]map[string]any, 0, len(opts.AllowedAssets))
	for _, code := range opts.AllowedAssets {
		allowed = append(allowed, map[string]any{"asset_code": code, "issuer_address": nil})
	}

	items := make([]map[string]any, 0, len(opts.Items))
	for _, item := range opts.Items {
		items = append(items, map[string]any{
			"description": item.Description,
			"quantity":    item.Quantity,
			"unit_amount": item.UnitAmount,
		})
	}

	out := map[string]any{
		"id":                  inv.PublicID,
		"object":              "invoice",
		"invoice_number":      invoiceNumber,
		"status":              inv.Status,
		"display_status":      displayStatus(inv.Status, inv.DueAt),
		"amount":              inv.Amount,
		"currency_code":       inv.CurrencyCode,
		"settlement_asset":    settlement,
		"allowed_assets":      allowed,
		"description":         inv.Description,
		"metadata":            inv.Metadata,
		"customer_id":         customerPublicID,
		"customer_name":       opts.CustomerName,
		"customer_email":      opts.CustomerEmail,
		"checkout_session_id": opts.CheckoutSessionPublicID,
		"checkout_url":        opts.CheckoutURL,
		"items":               items,
		"due_at":              inv.DueAt,
		"paid_at":             inv.PaidAt,
		"sent_at":             inv.SentAt,
		"created_at":          inv.CreatedAt,
		"updated_at":          inv.UpdatedAt,
	}
	if opts.IncludeActivity {
		out["activity"] = BuildActivity(
			inv.Status, inv.CreatedAt, inv.UpdatedAt, inv.SentAt, inv.PaidAt,
			opts.CheckoutSessionPublicID, opts.CustomerEmail,
		)
	}
	return out
}

func (s *Service) SerializeMany(ctx context.Context, rows []ListRow) ([]map[string]any, error) {
	sessionIDs := make([]string, 0)
	for _, row := range rows {
		if row.CheckoutSessionID != nil {
			sessionIDs = append(sessionIDs, *row.CheckoutSessionID)
		}
	}
	type sessionCheckout struct {
		sessionPublicID string
		paymentPublicID string
	}
	sessionMap := map[string]sessionCheckout{}
	if len(sessionIDs) > 0 {
		rows2, err := s.pool.Query(ctx, `
			SELECT cs.id, cs.public_id, p.public_id
			FROM checkout_sessions cs
			INNER JOIN payments p ON cs.payment_id = p.id
			WHERE cs.id = ANY($1::uuid[])`, sessionIDs)
		if err != nil {
			return nil, err
		}
		defer rows2.Close()
		for rows2.Next() {
			var id, sessionPublicID, paymentPublicID string
			if err := rows2.Scan(&id, &sessionPublicID, &paymentPublicID); err != nil {
				return nil, err
			}
			sessionMap[id] = sessionCheckout{
				sessionPublicID: sessionPublicID,
				paymentPublicID: paymentPublicID,
			}
		}
		if err := rows2.Err(); err != nil {
			return nil, err
		}
	}

	out := make([]map[string]any, 0, len(rows))
	for i := range rows {
		row := &rows[i]
		var sessionPublicID, checkoutURL *string
		if row.CheckoutSessionID != nil {
			if checkout, ok := sessionMap[*row.CheckoutSessionID]; ok {
				sessionPublicID = &checkout.sessionPublicID
				url := s.checkouts.CheckoutURL(checkout.paymentPublicID)
				checkoutURL = &url
			}
		}
		custID := row.CustomerPublicID
		out = append(out, Serialize(&row.Invoice, &custID, SerializeOpts{
			CheckoutURL:             checkoutURL,
			CheckoutSessionPublicID: sessionPublicID,
			CustomerName:            row.CustomerName,
			CustomerEmail:           row.CustomerEmail,
		}))
	}
	return out, nil
}

func (s *Service) SerializeDetail(detail *Detail, includeActivity bool) map[string]any {
	return Serialize(detail.Invoice, detail.CustomerPublicID, SerializeOpts{
		CheckoutURL:             detail.CheckoutURL,
		CheckoutSessionPublicID: detail.CheckoutSessionPublicID,
		Items:                   detail.Items,
		CustomerName:            detail.CustomerName,
		CustomerEmail:           detail.CustomerEmail,
		IncludeActivity:         includeActivity,
	})
}

func (s *Service) PreviewEmailHTML(presentation map[string]any) string {
	return previewEmailHTML(presentation, s.webURL)
}

func previewEmailHTML(presentation map[string]any, webURL string) string {
	invoiceNumber, _ := presentation["invoiceNumber"].(string)
	amount, _ := presentation["amount"].(string)
	currency, _ := presentation["currencyCode"].(string)
	if currency == "" {
		currency, _ = presentation["asset"].(string)
	}
	checkoutURL, _ := presentation["checkoutUrl"].(string)
	orgName := "Merchant"
	if org, ok := presentation["organization"].(map[string]any); ok {
		if n, ok := org["name"].(string); ok && n != "" {
			orgName = n
		}
	}
	customerName := ""
	if customer, ok := presentation["customer"].(map[string]any); ok {
		if n, ok := customer["name"].(string); ok {
			customerName = n
		}
	}
	recipient := "customer@example.com"
	if customer, ok := presentation["customer"].(map[string]any); ok {
		if e, ok := customer["email"].(string); ok && e != "" {
			recipient = e
		}
	}
	description := ""
	if d, ok := presentation["description"].(string); ok {
		description = d
	}
	envLabel := ""
	if label, ok := presentation["environmentLabel"].(string); ok {
		envLabel = label
	}

	dueDateLabel := "N/A"
	if dueAt, ok := presentation["dueAt"].(string); ok && dueAt != "" {
		if parsed, err := time.Parse(time.RFC3339, dueAt); err == nil {
			dueDateLabel = email.FormatDueDateLabel(&parsed)
		}
	}

	emailItems := make([]email.InvoiceEmailItem, 0)
	if rawItems, ok := presentation["items"].([]any); ok {
		for _, raw := range rawItems {
			item, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			desc, _ := item["description"].(string)
			qty, _ := item["quantity"].(string)
			unit, _ := item["unitAmount"].(string)
			line, _ := item["lineAmount"].(string)
			if line == "" {
				line = unit
			}
			emailItems = append(emailItems, email.InvoiceEmailItem{
				Description: desc,
				Quantity:    qty,
				UnitAmount:  unit,
				LineAmount:  line,
			})
		}
	}

	return email.InvoiceHTML(email.InvoiceEmail{
		Email:            recipient,
		InvoiceNumber:    invoiceNumber,
		AmountDue:        amount,
		CurrencyCode:     currency,
		DueDateLabel:     dueDateLabel,
		OrganizationName: orgName,
		CustomerName:     customerName,
		Description:      description,
		Items:            emailItems,
		PayURL:           checkoutURL,
		EnvironmentLabel: envLabel,
		WordmarkURL:      email.DefaultWordmarkURL(webURL),
	})
}
