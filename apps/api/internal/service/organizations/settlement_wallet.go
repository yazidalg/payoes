package organizations

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// SettlementWallet ports organization_receiving_wallets rows used by settlement/receiving wallet APIs.
type SettlementWallet struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	Environment    string    `json:"environment"`
	StellarAddress string    `json:"stellarAddress"`
	WalletProvider *string   `json:"walletProvider"`
	ConnectedAt    time.Time `json:"connectedAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

func (s *Service) GetSettlementWallet(ctx context.Context, organizationID, environment string) (*SettlementWallet, error) {
	var w SettlementWallet
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, environment, stellar_address, wallet_provider, connected_at, updated_at
		FROM organization_receiving_wallets
		WHERE organization_id = $1 AND environment = $2
		LIMIT 1`, organizationID, environment).Scan(
		&w.ID, &w.OrganizationID, &w.Environment, &w.StellarAddress, &w.WalletProvider, &w.ConnectedAt, &w.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func (s *Service) UpsertSettlementWallet(ctx context.Context, organizationID, environment, stellarAddress string, walletProvider *string) (*SettlementWallet, error) {
	existing, err := s.GetSettlementWallet(ctx, organizationID, environment)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		var w SettlementWallet
		err := s.pool.QueryRow(ctx, `
			UPDATE organization_receiving_wallets
			SET stellar_address = $1, wallet_provider = $2, connected_at = NOW(), updated_at = NOW()
			WHERE id = $3
			RETURNING id, organization_id, environment, stellar_address, wallet_provider, connected_at, updated_at`,
			stellarAddress, walletProvider, existing.ID,
		).Scan(&w.ID, &w.OrganizationID, &w.Environment, &w.StellarAddress, &w.WalletProvider, &w.ConnectedAt, &w.UpdatedAt)
		if err != nil {
			return nil, err
		}
		return &w, nil
	}

	var w SettlementWallet
	err = s.pool.QueryRow(ctx, `
		INSERT INTO organization_receiving_wallets (organization_id, environment, stellar_address, wallet_provider)
		VALUES ($1, $2, $3, $4)
		RETURNING id, organization_id, environment, stellar_address, wallet_provider, connected_at, updated_at`,
		organizationID, environment, stellarAddress, walletProvider,
	).Scan(&w.ID, &w.OrganizationID, &w.Environment, &w.StellarAddress, &w.WalletProvider, &w.ConnectedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func SerializeSettlementWallet(w *SettlementWallet) map[string]any {
	if w == nil {
		return nil
	}
	return map[string]any{
		"stellarAddress": w.StellarAddress,
		"environment":    w.Environment,
		"walletProvider": w.WalletProvider,
		"connectedAt":    w.ConnectedAt,
	}
}
