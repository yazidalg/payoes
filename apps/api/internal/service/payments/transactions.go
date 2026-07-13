package payments

import (
	"context"
	"strconv"
	"strings"
)

// ported from: listCompletedPayments / listTransactionsPaginated in
// apps/web/src/lib/payments/service.ts

type ListTransactionsQuery struct {
	Page           int
	PageSize       int
	Search         string
	CustomerStatus string // has_customer | no_customer
	SortOrder      string // asc | desc
}

func (s *Service) ListCompleted(ctx context.Context, organizationID, environment string) ([]Payment, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+paymentSelect+`
		FROM payments
		WHERE organization_id = $1 AND environment = $2 AND status = 'completed'
		ORDER BY created_at DESC`, organizationID, environment)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Payment
	for rows.Next() {
		p, err := s.scanPaymentRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

func (s *Service) ListTransactionsPaginated(
	ctx context.Context,
	organizationID, environment string,
	query ListTransactionsQuery,
) ([]Payment, int, error) {
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
	sortOrder := query.SortOrder
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	where := []string{"organization_id = $1", "environment = $2", "status = 'completed'"}
	args := []any{organizationID, environment}
	argN := 3

	if search := strings.TrimSpace(query.Search); search != "" {
		pattern := "%" + search + "%"
		where = append(where, "(public_id ILIKE $"+strconv.Itoa(argN)+
			" OR payer_address ILIKE $"+strconv.Itoa(argN)+
			" OR tx_hash ILIKE $"+strconv.Itoa(argN)+")")
		args = append(args, pattern)
		argN++
	}
	switch query.CustomerStatus {
	case "has_customer":
		where = append(where, "customer_id IS NOT NULL")
	case "no_customer":
		where = append(where, "customer_id IS NULL")
	}

	whereSQL := strings.Join(where, " AND ")
	orderSQL := "confirmed_at DESC NULLS LAST"
	if sortOrder == "asc" {
		orderSQL = "confirmed_at ASC NULLS LAST"
	}

	var total int
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM payments WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append(append([]any{}, args...), pageSize, offset)
	rows, err := s.pool.Query(ctx, `
		SELECT `+paymentSelect+`
		FROM payments
		WHERE `+whereSQL+`
		ORDER BY `+orderSQL+`
		LIMIT $`+strconv.Itoa(argN)+` OFFSET $`+strconv.Itoa(argN+1), listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []Payment
	for rows.Next() {
		p, err := s.scanPaymentRow(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *p)
	}
	return out, total, rows.Err()
}
