package customers

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
)

type ListCustomersQuery struct {
	Page          int
	PageSize      int
	SortBy        string // created_at | email | name
	SortOrder     string // asc | desc
	Search        string
	WalletStatus  string // linked | unlinked
	EmailStatus   string // present | missing
	PaymentStatus string // has_payments | no_payments
}

func (s *Service) ListPaginated(
	ctx context.Context,
	organizationID, environment string,
	query ListCustomersQuery,
) ([]Customer, int, error) {
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

	sortBy := query.SortBy
	switch sortBy {
	case "email", "name", "created_at":
	default:
		sortBy = "created_at"
	}
	sortOrder := query.SortOrder
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	where := []string{"c.organization_id = $1", "c.environment = $2"}
	args := []any{organizationID, environment}
	argN := 3

	if search := strings.TrimSpace(query.Search); search != "" {
		pattern := "%" + search + "%"
		where = append(where, "(c.name ILIKE $"+strconv.Itoa(argN)+
			" OR c.email ILIKE $"+strconv.Itoa(argN)+
			" OR c.public_id ILIKE $"+strconv.Itoa(argN)+
			" OR c.primary_stellar_address ILIKE $"+strconv.Itoa(argN)+")")
		args = append(args, pattern)
		argN++
	}
	switch query.WalletStatus {
	case "linked":
		where = append(where, "c.primary_stellar_address IS NOT NULL AND trim(c.primary_stellar_address) <> ''")
	case "unlinked":
		where = append(where, "(c.primary_stellar_address IS NULL OR trim(c.primary_stellar_address) = '')")
	}
	switch query.EmailStatus {
	case "present":
		where = append(where, "c.email IS NOT NULL AND trim(c.email) <> ''")
	case "missing":
		where = append(where, "(c.email IS NULL OR trim(c.email) = '')")
	}
	switch query.PaymentStatus {
	case "has_payments":
		where = append(where, `EXISTS (
			SELECT 1 FROM payments p
			WHERE p.customer_id = c.id AND p.environment = $2
		)`)
	case "no_payments":
		where = append(where, `NOT EXISTS (
			SELECT 1 FROM payments p
			WHERE p.customer_id = c.id AND p.environment = $2
		)`)
	}

	whereSQL := strings.Join(where, " AND ")
	orderSQL := "c." + sortBy + " " + strings.ToUpper(sortOrder) + " NULLS LAST"

	var total int
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM customers c WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append(append([]any{}, args...), pageSize, offset)
	rows, err := s.pool.Query(ctx, `
		SELECT `+customerSelectWithAlias+`
		FROM customers c
		WHERE `+whereSQL+`
		ORDER BY `+orderSQL+`
		LIMIT $`+strconv.Itoa(argN)+` OFFSET $`+strconv.Itoa(argN+1), listArgs...)
	if err != nil {
		return nil, 0, err
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
			return nil, 0, err
		}
		if len(metaRaw) > 0 {
			_ = json.Unmarshal(metaRaw, &c.Metadata)
		}
		out = append(out, c)
	}
	if out == nil {
		out = []Customer{}
	}
	return out, total, rows.Err()
}

const customerSelectWithAlias = `
	c.id, c.public_id, c.organization_id, c.environment, c.email, c.name,
	c.primary_stellar_address, c.notes, c.metadata, c.created_at, c.updated_at`
