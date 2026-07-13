package apilogs

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ported from: apps/web/src/lib/api-logs/service.ts

type LogRow struct {
	ID           string  `json:"id"`
	Method       string  `json:"method"`
	Path         string  `json:"path"`
	StatusCode   int     `json:"statusCode"`
	DurationMs   int     `json:"durationMs"`
	CreatedAt    string  `json:"createdAt"`
	APIKeyID     *string `json:"apiKeyId"`
	APIKeyName   *string `json:"apiKeyName"`
	APIKeyPrefix *string `json:"apiKeyPrefix"`
}

type ListQuery struct {
	Page        int
	PageSize    int
	Search      string
	Method      string
	StatusGroup string // 2xx | 4xx | 5xx
	APIKeyID    string
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) ListPaginated(
	ctx context.Context,
	organizationID, environment string,
	query ListQuery,
) ([]LogRow, int, error) {
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

	where := []string{"l.organization_id = $1", "l.environment = $2"}
	args := []any{organizationID, environment}
	argN := 3

	if search := strings.TrimSpace(query.Search); search != "" {
		where = append(where, "l.path ILIKE $"+strconv.Itoa(argN))
		args = append(args, "%"+search+"%")
		argN++
	}
	if query.Method != "" {
		where = append(where, "l.method = $"+strconv.Itoa(argN))
		args = append(args, query.Method)
		argN++
	}
	switch query.StatusGroup {
	case "2xx":
		where = append(where, "l.status_code >= 200 AND l.status_code < 300")
	case "4xx":
		where = append(where, "l.status_code >= 400 AND l.status_code < 500")
	case "5xx":
		where = append(where, "l.status_code >= 500")
	}
	if query.APIKeyID != "" {
		where = append(where, "l.api_key_id = $"+strconv.Itoa(argN))
		args = append(args, query.APIKeyID)
		argN++
	}

	whereSQL := strings.Join(where, " AND ")

	var total int
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM api_logs l WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append(append([]any{}, args...), pageSize, offset)
	limitIdx := argN
	offsetIdx := argN + 1

	rows, err := s.pool.Query(ctx, `
		SELECT l.id, l.method, l.path, l.status_code, l.duration_ms, l.created_at,
		       l.api_key_id, k.name, k.key_prefix
		FROM api_logs l
		LEFT JOIN api_keys k ON l.api_key_id = k.id
		WHERE `+whereSQL+`
		ORDER BY l.created_at DESC
		LIMIT $`+strconv.Itoa(limitIdx)+` OFFSET $`+strconv.Itoa(offsetIdx), listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := make([]LogRow, 0)
	for rows.Next() {
		var (
			row       LogRow
			createdAt time.Time
		)
		if err := rows.Scan(
			&row.ID, &row.Method, &row.Path, &row.StatusCode, &row.DurationMs, &createdAt,
			&row.APIKeyID, &row.APIKeyName, &row.APIKeyPrefix,
		); err != nil {
			return nil, 0, err
		}
		row.CreatedAt = createdAt.UTC().Format(time.RFC3339Nano)
		out = append(out, row)
	}
	return out, total, rows.Err()
}
