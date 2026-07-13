package payments

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	customersvc "github.com/payoesteam/payoes/apps/api/internal/service/customers"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
	"github.com/payoesteam/payoes/apps/api/internal/stellar"
)

// ported from: apps/web/src/lib/payments/service.ts

const (
	defaultPaymentExpiryMinutes     = 60
	placeholderPricingPaymentAmount = "0.0000001"
	platformFeeBPS                  = 100
	stroopsPerUnit                  = int64(10_000_000)
	basisPointsPerUnit              = int64(10_000)
)

type AllowedAsset struct {
	AssetCode     string  `json:"asset_code"`
	IssuerAddress *string `json:"issuer_address"`
}

type Payment struct {
	ID                       string
	PublicID                 string
	OrganizationID           string
	CustomerID               *string
	SourceType               string
	PaymentLinkID            *string
	InvoiceID                *string
	Environment              string
	Amount                   string
	PricingCurrency          *string
	PricingAmount            *string
	QuotedPaidAmount         *string
	QuotedSettlementAmount   *string
	QuoteRate                *string
	SettlementQuoteRate      *string
	QuoteExpiresAt           *time.Time
	SettlementAsset          string
	SettlementAssetIssuer    *string
	AllowedAssets            []AllowedAsset
	PaidAsset                *string
	PaidAssetIssuer          *string
	Status                   string
	PaymentFlow              string
	BlockchainStatus         string
	SorobanContractID        *string
	PlatformFeeAmount        string
	MerchantSettlementAmount *string
	ReceivingAddress         string
	DepositAddress           *string
	PayerAddress             *string
	Description              *string
	Metadata                 map[string]string
	Memo                     *string
	ExpiresAt                *time.Time
	TxHash                   *string
	DepositTxHash            *string
	SettlementTxHash         *string
	RefundTxHash             *string
	ReceivedAmount           *string
	RefundReason             *string
	ConfirmedAt              *time.Time
	CreatedAt                time.Time
	UpdatedAt                time.Time
}

type CreateInput struct {
	OrganizationID   string
	Environment      string
	Amount           string
	SettlementAsset  *AllowedAsset
	AllowedAssets    []AllowedAsset
	Description      *string
	Metadata         map[string]string
	ExpiresInMinutes *int
	CustomerID       *string // public id cus_...
	SourceType       string
	PaymentLinkID    *string // internal uuid
	InvoiceID        *string // internal uuid
	PricingCurrency  *string
	PricingAmount    *string
	CheckoutBaseURL  string
}

type Service struct {
	pool      *pgxpool.Pool
	orgs      *orgsvc.Service
	customers *customersvc.Service

	settlementDeps SettlementDeps
}

func NewService(pool *pgxpool.Pool, orgs *orgsvc.Service, customers *customersvc.Service) *Service {
	return &Service{pool: pool, orgs: orgs, customers: customers}
}

// SettlementDeps optional collaborators for escrow settlement side effects.
type SettlementDeps struct {
	Webhooks        interface {
		DispatchEvent(ctx context.Context, organizationID, environment, event string, payload map[string]any) error
	}
	CheckoutBaseURL string
}

func (s *Service) SetSettlementDeps(deps SettlementDeps) {
	s.settlementDeps = deps
}

func createPublicID() (string, error) {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "pay_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func normalizeStellarAmount(amount string) string {
	parts := strings.Split(strings.TrimSpace(amount), ".")
	whole := "0"
	frac := ""
	if len(parts) > 0 && parts[0] != "" {
		whole = parts[0]
	}
	if len(parts) > 1 {
		frac = parts[1]
	}
	frac = (frac + "0000000")[:7]
	return whole + "." + frac
}

func stellarAmountToStroops(amount string) *big.Int {
	norm := normalizeStellarAmount(amount)
	parts := strings.Split(norm, ".")
	whole, _ := new(big.Int).SetString(parts[0], 10)
	frac, _ := new(big.Int).SetString(parts[1], 10)
	result := new(big.Int).Mul(whole, big.NewInt(stroopsPerUnit))
	return result.Add(result, frac)
}

func stroopsToStellarAmount(stroops *big.Int) string {
	unit := big.NewInt(stroopsPerUnit)
	whole := new(big.Int).Div(stroops, unit)
	frac := new(big.Int).Mod(stroops, unit)
	return fmt.Sprintf("%s.%07d", whole.String(), frac.Int64())
}

func calculatePlatformFeeAmount(amount string) string {
	gross := stellarAmountToStroops(amount)
	fee := new(big.Int).Mul(gross, big.NewInt(platformFeeBPS))
	fee.Div(fee, big.NewInt(basisPointsPerUnit))
	return stroopsToStellarAmount(fee)
}

func calculateMerchantSettlementAmount(amount string) string {
	gross := stellarAmountToStroops(amount)
	fee := new(big.Int).Mul(gross, big.NewInt(platformFeeBPS))
	fee.Div(fee, big.NewInt(basisPointsPerUnit))
	net := new(big.Int).Sub(gross, fee)
	return stroopsToStellarAmount(net)
}

func (s *Service) scanPayment(row pgx.Row) (*Payment, error) {
	return s.scanPaymentRow(row)
}

const paymentSelect = `
	id, public_id, organization_id, customer_id, source_type, payment_link_id, invoice_id,
	environment, amount, pricing_currency, pricing_amount, quoted_paid_amount, quoted_settlement_amount,
	quote_rate, settlement_quote_rate, quote_expires_at, settlement_asset, settlement_asset_issuer,
	allowed_assets, paid_asset, paid_asset_issuer, status, payment_flow, blockchain_status,
	soroban_contract_id, platform_fee_amount, merchant_settlement_amount, receiving_address,
	deposit_address, payer_address, description, metadata, memo, expires_at, tx_hash,
	deposit_tx_hash, settlement_tx_hash, refund_tx_hash, received_amount, refund_reason,
	confirmed_at, created_at, updated_at`

func (s *Service) List(ctx context.Context, organizationID, environment string, limit int) ([]Payment, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+paymentSelect+`
		FROM payments
		WHERE organization_id = $1 AND environment = $2
		ORDER BY created_at DESC
		LIMIT $3`, organizationID, environment, limit)
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

func (s *Service) ListForCustomer(ctx context.Context, customerID, environment string, limit int) ([]Payment, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+paymentSelect+`
		FROM payments
		WHERE customer_id = $1 AND environment = $2
		ORDER BY created_at DESC
		LIMIT $3`, customerID, environment, limit)
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

type scannable interface {
	Scan(dest ...any) error
}

func (s *Service) scanPaymentRow(row scannable) (*Payment, error) {
	var (
		p           Payment
		allowedRaw  []byte
		metadataRaw []byte
	)
	err := row.Scan(
		&p.ID, &p.PublicID, &p.OrganizationID, &p.CustomerID, &p.SourceType,
		&p.PaymentLinkID, &p.InvoiceID, &p.Environment, &p.Amount,
		&p.PricingCurrency, &p.PricingAmount, &p.QuotedPaidAmount, &p.QuotedSettlementAmount,
		&p.QuoteRate, &p.SettlementQuoteRate, &p.QuoteExpiresAt,
		&p.SettlementAsset, &p.SettlementAssetIssuer, &allowedRaw,
		&p.PaidAsset, &p.PaidAssetIssuer, &p.Status, &p.PaymentFlow, &p.BlockchainStatus,
		&p.SorobanContractID, &p.PlatformFeeAmount, &p.MerchantSettlementAmount,
		&p.ReceivingAddress, &p.DepositAddress, &p.PayerAddress, &p.Description, &metadataRaw,
		&p.Memo, &p.ExpiresAt, &p.TxHash, &p.DepositTxHash, &p.SettlementTxHash, &p.RefundTxHash,
		&p.ReceivedAmount, &p.RefundReason, &p.ConfirmedAt, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(allowedRaw) > 0 {
		_ = json.Unmarshal(allowedRaw, &p.AllowedAssets)
	}
	if len(metadataRaw) > 0 {
		_ = json.Unmarshal(metadataRaw, &p.Metadata)
	}
	return &p, nil
}

func (s *Service) GetByPublicID(ctx context.Context, publicID string) (*Payment, error) {
	return s.scanPayment(s.pool.QueryRow(ctx, `
		SELECT `+paymentSelect+` FROM payments WHERE public_id = $1 LIMIT 1`, publicID))
}

func (s *Service) GetForOrganization(ctx context.Context, publicID, organizationID, environment string) (*Payment, error) {
	p, err := s.GetByPublicID(ctx, publicID)
	if err != nil || p == nil {
		return nil, err
	}
	if p.OrganizationID != organizationID || p.Environment != environment {
		return nil, nil
	}
	return p, nil
}

func (s *Service) GetByID(ctx context.Context, id, organizationID, environment string) (*Payment, error) {
	p, err := s.scanPayment(s.pool.QueryRow(ctx, `
		SELECT `+paymentSelect+` FROM payments WHERE id = $1 LIMIT 1`, id))
	if err != nil || p == nil {
		return nil, err
	}
	if p.OrganizationID != organizationID || p.Environment != environment {
		return nil, nil
	}
	return p, nil
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Payment, error) {
	wallet, err := s.orgs.GetSettlementWalletAddress(ctx, input.OrganizationID, input.Environment)
	if err != nil {
		return nil, err
	}

	settlement := AllowedAsset{AssetCode: "USDC"}
	if input.SettlementAsset != nil && input.SettlementAsset.AssetCode != "" {
		settlement = *input.SettlementAsset
	}
	allowed := input.AllowedAssets
	if len(allowed) == 0 {
		allowed = []AllowedAsset{settlement}
	}

	var customerInternalID *string
	var customerPublicID *string
	if input.CustomerID != nil && strings.TrimSpace(*input.CustomerID) != "" {
		customer, err := s.customers.GetByPublicID(ctx, strings.TrimSpace(*input.CustomerID))
		if err != nil {
			return nil, err
		}
		if customer == nil || customer.OrganizationID != input.OrganizationID {
			return nil, errors.New("Customer not found")
		}
		if customer.Environment != input.Environment {
			return nil, errors.New("Customer environment does not match payment environment")
		}
		customerInternalID = &customer.ID
		customerPublicID = &customer.PublicID
	}

	expiresMinutes := defaultPaymentExpiryMinutes
	if input.ExpiresInMinutes != nil {
		expiresMinutes = *input.ExpiresInMinutes
	}
	expiresAt := time.Now().Add(time.Duration(expiresMinutes) * time.Minute)

	publicID, err := createPublicID()
	if err != nil {
		return nil, err
	}

	amount := normalizeStellarAmount(input.Amount)
	platformFee := calculatePlatformFeeAmount(amount)
	merchantSettlement := calculateMerchantSettlementAmount(amount)
	if input.PricingAmount != nil && strings.TrimSpace(*input.PricingAmount) != "" {
		amount = placeholderPricingPaymentAmount
		platformFee = "0.0000000"
		merchantSettlement = ""
	}

	sourceType := input.SourceType
	if sourceType == "" {
		sourceType = "direct"
	}

	allowedJSON, err := json.Marshal(allowed)
	if err != nil {
		return nil, err
	}
	var metaJSON []byte
	if input.Metadata != nil {
		metaJSON, err = json.Marshal(input.Metadata)
		if err != nil {
			return nil, err
		}
	}

	memo := publicID
	if len(memo) > 28 {
		memo = publicID[:28]
	}
	depositAddress := wallet
	if muxed, err := stellar.DepositAddress(input.Environment, publicID); err == nil && muxed != "" {
		depositAddress = muxed
	}

	var merchantPtr *string
	if merchantSettlement != "" {
		merchantPtr = &merchantSettlement
	}

	payment, err := s.scanPayment(s.pool.QueryRow(ctx, `
		INSERT INTO payments (
			public_id, organization_id, customer_id, source_type, payment_link_id, invoice_id,
			environment, payment_flow,
			amount, pricing_currency, pricing_amount, platform_fee_amount, merchant_settlement_amount,
			settlement_asset, settlement_asset_issuer, allowed_assets, receiving_address, deposit_address,
			description, metadata, memo, expires_at, status
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, 'escrow',
			$8, $9, $10, $11, $12,
			$13, $14, $15::jsonb, $16, $17,
			$18, $19, $20, $21, 'pending'
		)
		RETURNING `+paymentSelect,
		publicID, input.OrganizationID, customerInternalID, sourceType, input.PaymentLinkID, input.InvoiceID,
		input.Environment,
		amount, input.PricingCurrency, input.PricingAmount, platformFee, merchantPtr,
		settlement.AssetCode, settlement.IssuerAddress, allowedJSON, wallet, depositAddress,
		trimPtr(input.Description), metaJSON, memo, expiresAt,
	))
	if err != nil {
		return nil, err
	}

	_ = customerPublicID
	return payment, nil
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

func (s *Service) Serialize(ctx context.Context, payment *Payment, checkoutBaseURL string) (map[string]any, error) {
	var customerPublicID *string
	if payment.CustomerID != nil {
		var pid string
		err := s.pool.QueryRow(ctx, `SELECT public_id FROM customers WHERE id = $1`, *payment.CustomerID).Scan(&pid)
		if err == nil {
			customerPublicID = &pid
		}
	}
	return SerializePayment(payment, customerPublicID, checkoutBaseURL), nil
}

func (s *Service) SerializeMany(ctx context.Context, payments []Payment, checkoutBaseURL string) ([]map[string]any, error) {
	out := make([]map[string]any, 0, len(payments))
	for i := range payments {
		serialized, err := s.Serialize(ctx, &payments[i], checkoutBaseURL)
		if err != nil {
			return nil, err
		}
		out = append(out, serialized)
	}
	return out, nil
}

func SerializePayment(payment *Payment, customerPublicID *string, checkoutBaseURL string) map[string]any {
	assets := map[string]any{
		"settlement_asset": map[string]any{
			"asset_code":     payment.SettlementAsset,
			"issuer_address": payment.SettlementAssetIssuer,
		},
		"allowed_assets": payment.AllowedAssets,
		"paid_asset":     nil,
	}
	if payment.PaidAsset != nil {
		assets["paid_asset"] = map[string]any{
			"asset_code":     payment.PaidAsset,
			"issuer_address": payment.PaidAssetIssuer,
		}
	}

	var checkoutURL any
	manual := payment.Metadata != nil && payment.Metadata["manual"] == "true"
	if manual || payment.Status == "completed" {
		checkoutURL = nil
	} else {
		base := strings.TrimRight(checkoutBaseURL, "/")
		checkoutURL = base + "/c/" + payment.PublicID
	}

	return map[string]any{
		"id":                         payment.PublicID,
		"object":                     "payment_intent",
		"amount":                     payment.Amount,
		"pricing_currency":           payment.PricingCurrency,
		"pricing_amount":             payment.PricingAmount,
		"quoted_paid_amount":         payment.QuotedPaidAmount,
		"quoted_settlement_amount":   payment.QuotedSettlementAmount,
		"quote_rate":                 payment.QuoteRate,
		"settlement_quote_rate":      payment.SettlementQuoteRate,
		"quote_expires_at":           payment.QuoteExpiresAt,
		"platform_fee_amount":        payment.PlatformFeeAmount,
		"merchant_settlement_amount": payment.MerchantSettlementAmount,
		"settlement_asset":           assets["settlement_asset"],
		"allowed_assets":             assets["allowed_assets"],
		"paid_asset":                 assets["paid_asset"],
		"status":                     payment.Status,
		"description":                payment.Description,
		"metadata":                   payment.Metadata,
		"checkout_url":               checkoutURL,
		"source_type":                payment.SourceType,
		"customer_id":                customerPublicID,
		"payer_address":              payment.PayerAddress,
		"deposit_address":            payment.DepositAddress,
		"deposit_tx_hash":            payment.DepositTxHash,
		"settlement_tx_hash":         payment.SettlementTxHash,
		"refund_tx_hash":             payment.RefundTxHash,
		"received_amount":            payment.ReceivedAmount,
		"refund_reason":              payment.RefundReason,
		"tx_hash":                    payment.TxHash,
		"confirmed_at":               payment.ConfirmedAt,
		"expires_at":                 payment.ExpiresAt,
		"created_at":                 payment.CreatedAt,
	}
}
