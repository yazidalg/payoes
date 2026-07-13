package payments

import (
	"context"
	"strconv"
	"strings"
)

// ListPaymentsQuery ports listPaymentsPaginated query from apps/web.
type ListPaymentsQuery struct {
	Page           int
	PageSize       int
	Search         string
	CustomerStatus string // has_customer | no_customer
	Status         string // pending | completed | failed | expired
	SortOrder      string // asc | desc
}

// ListPaginated ports listPaymentsPaginated.
func (s *Service) ListPaginated(
	ctx context.Context,
	organizationID, environment string,
	query ListPaymentsQuery,
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

	where := []string{"organization_id = $1", "environment = $2"}
	args := []any{organizationID, environment}
	argN := 3

	if search := strings.TrimSpace(query.Search); search != "" {
		pattern := "%" + search + "%"
		where = append(where, "(public_id ILIKE $"+strconv.Itoa(argN)+
			" OR payer_address ILIKE $"+strconv.Itoa(argN)+
			" OR description ILIKE $"+strconv.Itoa(argN)+")")
		args = append(args, pattern)
		argN++
	}
	switch query.CustomerStatus {
	case "has_customer":
		where = append(where, "customer_id IS NOT NULL")
	case "no_customer":
		where = append(where, "customer_id IS NULL")
	}
	if status := strings.TrimSpace(query.Status); status != "" {
		where = append(where, "status = $"+strconv.Itoa(argN)+"::payment_status")
		args = append(args, status)
		argN++
	}

	whereSQL := strings.Join(where, " AND ")
	orderSQL := "created_at DESC"
	if sortOrder == "asc" {
		orderSQL = "created_at ASC"
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
	if out == nil {
		out = []Payment{}
	}
	return out, total, rows.Err()
}
