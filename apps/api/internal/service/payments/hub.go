package payments

import (
	"context"
)

// ported from: apps/web/src/lib/payments/hub-counts.ts

type HubCounts struct {
	PaymentIntents int `json:"payment-intents"`
	Invoices       int `json:"invoices"`
	PaymentLinks   int `json:"payment-links"`
}

func (s *Service) GetHubCounts(ctx context.Context, organizationID, environment string) (*HubCounts, error) {
	var counts HubCounts
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM payments
		WHERE organization_id = $1 AND environment = $2`,
		organizationID, environment,
	).Scan(&counts.PaymentIntents); err != nil {
		return nil, err
	}
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM invoices
		WHERE organization_id = $1 AND environment = $2`,
		organizationID, environment,
	).Scan(&counts.Invoices); err != nil {
		return nil, err
	}
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM payment_links
		WHERE organization_id = $1 AND environment = $2`,
		organizationID, environment,
	).Scan(&counts.PaymentLinks); err != nil {
		return nil, err
	}
	return &counts, nil
}
