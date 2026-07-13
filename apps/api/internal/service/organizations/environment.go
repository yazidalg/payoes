package organizations

import "context"

func (s *Service) UpdateEnvironment(ctx context.Context, organizationID, environment string) (*Organization, error) {
	return s.scanOrg(s.pool.QueryRow(ctx, `
		UPDATE organizations SET environment = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING `+orgSelect, environment, organizationID))
}
