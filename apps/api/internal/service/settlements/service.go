package settlements

import (
	"context"
	"encoding/json"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ported from: apps/web/src/lib/settlements/service.ts

var stellarTxHashPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

type AssetRef struct {
	AssetCode     string  `json:"asset_code"`
	IssuerAddress *string `json:"issuer_address"`
}

type ConversionRow struct {
	PaymentID                string    `json:"payment_id"`
	InvoiceID                *string   `json:"invoice_id"`
	PaidAsset                *AssetRef `json:"paid_asset"`
	QuotedPaidAmount         string    `json:"quoted_paid_amount"`
	SettlementAsset          AssetRef  `json:"settlement_asset"`
	QuotedSettlementAmount   string    `json:"quoted_settlement_amount"`
	PlatformFeeAmount        *string   `json:"platform_fee_amount,omitempty"`
	MerchantSettlementAmount *string   `json:"merchant_settlement_amount,omitempty"`
	PricingAmount            *string   `json:"pricing_amount"`
	PricingCurrency          *string   `json:"pricing_currency"`
	QuoteRate                *string   `json:"quote_rate"`
	SettlementQuoteRate      *string   `json:"settlement_quote_rate"`
	TxHash                   *string   `json:"tx_hash"`
	ConfirmedAt              *string   `json:"confirmed_at"`
	ConvertedOnChain         bool      `json:"converted_on_chain"`
}

type ListQuery struct {
	Page           int
	PageSize       int
	Search         string
	ConversionType string // path | direct
	SortOrder      string // asc | desc
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func isStellarTransactionHash(value *string) bool {
	return value != nil && stellarTxHashPattern.MatchString(*value)
}

func (s *Service) loadRows(ctx context.Context, organizationID, environment string, limit int) ([]ConversionRow, error) {
	if limit <= 0 {
		limit = 500
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.public_id, p.invoice_id, p.amount, p.quoted_paid_amount, p.quoted_settlement_amount,
		       p.platform_fee_amount, p.merchant_settlement_amount, p.pricing_amount, p.pricing_currency,
		       p.quote_rate, p.settlement_quote_rate, p.tx_hash, p.confirmed_at,
		       p.paid_asset, p.paid_asset_issuer, p.settlement_asset, p.settlement_asset_issuer,
		       p.metadata, i.public_id
		FROM payments p
		LEFT JOIN invoices i ON p.invoice_id = i.id
		WHERE p.organization_id = $1 AND p.environment = $2 AND p.status = 'completed'
		ORDER BY p.confirmed_at DESC NULLS LAST
		LIMIT $3`, organizationID, environment, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ConversionRow, 0)
	for rows.Next() {
		var (
			publicID                                   string
			invoiceInternalID                          *string
			amount                                     string
			quotedPaid, quotedSettlement               *string
			platformFee, merchantSettlement            *string
			pricingAmount, pricingCurrency             *string
			quoteRate, settlementQuoteRate             *string
			txHash                                     *string
			confirmedAt                                *time.Time
			paidAsset, paidIssuer                      *string
			settlementAsset                            string
			settlementIssuer                           *string
			metadataRaw                                []byte
			invoicePublicID                            *string
		)
		if err := rows.Scan(
			&publicID, &invoiceInternalID, &amount, &quotedPaid, &quotedSettlement,
			&platformFee, &merchantSettlement, &pricingAmount, &pricingCurrency,
			&quoteRate, &settlementQuoteRate, &txHash, &confirmedAt,
			&paidAsset, &paidIssuer, &settlementAsset, &settlementIssuer,
			&metadataRaw, &invoicePublicID,
		); err != nil {
			return nil, err
		}

		var metadata map[string]string
		if len(metadataRaw) > 0 {
			_ = json.Unmarshal(metadataRaw, &metadata)
		}
		if metadata != nil && metadata["manual"] == "true" {
			continue
		}
		if !isStellarTransactionHash(txHash) {
			continue
		}
		if paidAsset == nil || *paidAsset == "" {
			continue
		}
		hasQuote := quotedSettlement != nil && *quotedSettlement != ""
		if *paidAsset == settlementAsset && !hasQuote {
			continue
		}

		quotedPaidAmount := amount
		if quotedPaid != nil && *quotedPaid != "" {
			quotedPaidAmount = *quotedPaid
		}
		quotedSettlementAmount := amount
		if quotedSettlement != nil && *quotedSettlement != "" {
			quotedSettlementAmount = *quotedSettlement
		}

		var confirmedAtStr *string
		if confirmedAt != nil {
			s := confirmedAt.UTC().Format(time.RFC3339Nano)
			confirmedAtStr = &s
		}

		var resolvedTx *string
		if isStellarTransactionHash(txHash) {
			resolvedTx = txHash
		}

		row := ConversionRow{
			PaymentID:                publicID,
			InvoiceID:                invoicePublicID,
			PaidAsset:                &AssetRef{AssetCode: *paidAsset, IssuerAddress: paidIssuer},
			QuotedPaidAmount:         quotedPaidAmount,
			SettlementAsset:          AssetRef{AssetCode: settlementAsset, IssuerAddress: settlementIssuer},
			QuotedSettlementAmount:   quotedSettlementAmount,
			PlatformFeeAmount:        platformFee,
			MerchantSettlementAmount: merchantSettlement,
			PricingAmount:            pricingAmount,
			PricingCurrency:          pricingCurrency,
			QuoteRate:                quoteRate,
			SettlementQuoteRate:      settlementQuoteRate,
			TxHash:                   resolvedTx,
			ConfirmedAt:              confirmedAtStr,
			ConvertedOnChain:         *paidAsset != settlementAsset && hasQuote,
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *Service) List(ctx context.Context, organizationID, environment string, limit int) ([]ConversionRow, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := s.loadRows(ctx, organizationID, environment, limit)
	if err != nil {
		return nil, err
	}
	if len(rows) > limit {
		rows = rows[:limit]
	}
	return rows, nil
}

func (s *Service) ListPaginated(
	ctx context.Context,
	organizationID, environment string,
	query ListQuery,
) ([]ConversionRow, int, error) {
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
	sortOrder := query.SortOrder
	if sortOrder == "" {
		sortOrder = "desc"
	}

	rows, err := s.loadRows(ctx, organizationID, environment, 500)
	if err != nil {
		return nil, 0, err
	}

	if search := strings.ToLower(strings.TrimSpace(query.Search)); search != "" {
		filtered := rows[:0]
		for _, row := range rows {
			if strings.Contains(strings.ToLower(row.PaymentID), search) ||
				(row.TxHash != nil && strings.Contains(strings.ToLower(*row.TxHash), search)) ||
				(row.InvoiceID != nil && strings.Contains(strings.ToLower(*row.InvoiceID), search)) {
				filtered = append(filtered, row)
			}
		}
		rows = filtered
	}

	switch query.ConversionType {
	case "path":
		filtered := rows[:0]
		for _, row := range rows {
			if row.ConvertedOnChain {
				filtered = append(filtered, row)
			}
		}
		rows = filtered
	case "direct":
		filtered := rows[:0]
		for _, row := range rows {
			if !row.ConvertedOnChain {
				filtered = append(filtered, row)
			}
		}
		rows = filtered
	}

	sort.SliceStable(rows, func(i, j int) bool {
		var aTime, bTime int64
		if rows[i].ConfirmedAt != nil {
			if t, err := time.Parse(time.RFC3339Nano, *rows[i].ConfirmedAt); err == nil {
				aTime = t.UnixNano()
			}
		}
		if rows[j].ConfirmedAt != nil {
			if t, err := time.Parse(time.RFC3339Nano, *rows[j].ConfirmedAt); err == nil {
				bTime = t.UnixNano()
			}
		}
		if sortOrder == "asc" {
			return aTime < bTime
		}
		return aTime > bTime
	})

	total := len(rows)
	offset := (page - 1) * pageSize
	if offset >= total {
		return []ConversionRow{}, total, nil
	}
	end := offset + pageSize
	if end > total {
		end = total
	}
	return rows[offset:end], total, nil
}
