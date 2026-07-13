package webhooks

import (
	"context"
)

// DispatchEvent enqueues webhook deliveries for matching enabled endpoints.
// Ported from apps/web/src/lib/webhooks/delivery.ts dispatchWebhookEvent.
func (s *Service) DispatchEvent(ctx context.Context, organizationID, environment, event string, payload map[string]any) error {
	rows, err := s.pool.Query(ctx, `
		SELECT id, url, events, enabled, secret
		FROM webhook_endpoints
		WHERE organization_id = $1 AND environment = $2`, organizationID, environment)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id        string
			url       string
			eventsRaw []byte
			enabled   int
			secret    string
		)
		if err := rows.Scan(&id, &url, &eventsRaw, &enabled, &secret); err != nil {
			return err
		}
		if enabled != 1 {
			continue
		}
		events := scanEvents(eventsRaw)
		matched := false
		for _, e := range events {
			if e == event {
				matched = true
				break
			}
		}
		if !matched {
			continue
		}
		if _, err := s.EnqueueDelivery(ctx, id, url, secret, event, payload); err != nil {
			return err
		}
	}
	return rows.Err()
}
