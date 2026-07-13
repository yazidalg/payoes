package paymentmethods

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Method struct {
	ID             string
	OrganizationID string
	AssetCode      string
	IssuerAddress  *string
	DisplayName    string
	IsVerified     bool
	IsEnabled      bool
	IsDefault      bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Serialized struct {
	ID            string    `json:"id"`
	AssetCode     string    `json:"asset_code"`
	IssuerAddress *string   `json:"issuer_address"`
	DisplayName   string    `json:"display_name"`
	Subtitle      *string   `json:"subtitle"`
	IsVerified    bool      `json:"is_verified"`
	IsEnabled     bool      `json:"is_enabled"`
	IsDefault     bool      `json:"is_default"`
	IsOfficial    bool      `json:"is_official"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type OfficialAsset struct {
	AssetCode   string  `json:"asset_code"`
	DisplayName string  `json:"display_name"`
	Description string  `json:"description"`
	IssuedBy    *string `json:"issued_by"`
}

type ListResult struct {
	PaymentMethods          []Serialized    `json:"payment_methods"`
	AvailableOfficialAssets []OfficialAsset `json:"available_official_assets"`
	SettlementAssetID       *string         `json:"settlement_asset_id"`
}

type officialAssetDef struct {
	Code        string
	DisplayName string
	Description string
	IssuedBy    *string
	IsNative    bool
}

var officialAssets = []officialAssetDef{
	{Code: "USDC", DisplayName: "USDC", Description: "Official Circle USD stablecoin", IssuedBy: strPtr("Circle")},
	{Code: "XLM", DisplayName: "XLM", Description: "Native Stellar asset", IsNative: true},
	{Code: "EURC", DisplayName: "EURC", Description: "Official Circle euro stablecoin", IssuedBy: strPtr("Circle")},
	{Code: "PYUSD", DisplayName: "PYUSD", Description: "Official PayPal USD stablecoin", IssuedBy: strPtr("Paxos")},
	{Code: "AUDD", DisplayName: "AUDD", Description: "Official Australian dollar stablecoin", IssuedBy: strPtr("AUDC Pty Ltd")},
	{Code: "NGNC", DisplayName: "NGNC", Description: "Official Nigerian naira stablecoin", IssuedBy: strPtr("LINK.IO")},
}

var defaultAssetCodes = []string{"USDC", "XLM"}

var builtinIssuers = map[string]map[string]*string{
	"USDC":  {"sandbox": strPtr("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"), "production": strPtr("GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN")},
	"EURC":  {"sandbox": strPtr("GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO"), "production": strPtr("GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2")},
	"PYUSD": {"sandbox": strPtr("GBT2KJDKUZYZTQPCSR57VZT5NJHI4H7FOB5LT5FPRWSR7I5B4FS3UU7G"), "production": strPtr("GDQE7IXJ4HUHV6RQHIUPRJSEZE4DRS5WY577O2FY6YQ5LVWZ7JZTU2V5")},
	"AUDD":  {"sandbox": strPtr("GBAQ7FQE2AIXWTX4TCMXEMB3EZSBF565LK5NBKNBTAMLNLX3BHUTFRAI"), "production": strPtr("GDC7X2MXTYSAKUUGAIQ7J7RPEIM7GXSAIWFYWWH4GLNFECQVJJLB2EEU")},
	"NGNC":  {"sandbox": nil, "production": strPtr("GASBV6W7GGED66MXEVC7YZHTWWYMSVYEY35USF2HJZBLABLYIFQGXZY6")},
}

var issuerEnvKeys = map[string]map[string]string{
	"USDC":  {"sandbox": "STELLAR_TESTNET_USDC_ISSUER", "production": "STELLAR_MAINNET_USDC_ISSUER"},
	"EURC":  {"sandbox": "STELLAR_TESTNET_EURC_ISSUER", "production": "STELLAR_MAINNET_EURC_ISSUER"},
	"PYUSD": {"sandbox": "STELLAR_TESTNET_PYUSD_ISSUER", "production": "STELLAR_MAINNET_PYUSD_ISSUER"},
	"AUDD":  {"sandbox": "STELLAR_TESTNET_AUDD_ISSUER", "production": "STELLAR_MAINNET_AUDD_ISSUER"},
	"NGNC":  {"sandbox": "STELLAR_TESTNET_NGNC_ISSUER", "production": "STELLAR_MAINNET_NGNC_ISSUER"},
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) List(ctx context.Context, organizationID, environment string, enabledOnly bool) (*ListResult, error) {
	methods, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	serialized := make([]Serialized, 0, len(methods))
	var settlementID *string
	for _, m := range methods {
		ser := Serialize(m)
		if enabledOnly && !ser.IsEnabled {
			continue
		}
		serialized = append(serialized, ser)
		if ser.IsDefault {
			settlementID = &ser.ID
		}
	}

	available := listAvailableOfficialAssets(methods, environment)
	return &ListResult{
		PaymentMethods:          serialized,
		AvailableOfficialAssets: available,
		SettlementAssetID:       settlementID,
	}, nil
}

func (s *Service) listMethods(ctx context.Context, organizationID string) ([]Method, error) {
	methods, err := s.queryMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if len(methods) == 0 {
		if err := s.seedDefaults(ctx, organizationID); err != nil {
			return nil, err
		}
		return s.queryMethods(ctx, organizationID)
	}
	return methods, nil
}

func (s *Service) queryMethods(ctx context.Context, organizationID string) ([]Method, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, asset_code, issuer_address, display_name,
		       is_verified, is_enabled, is_default, created_at, updated_at
		FROM assets
		WHERE organization_id = $1
		ORDER BY created_at ASC`, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Method
	for rows.Next() {
		var m Method
		var verified, enabled, isDefault int
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.AssetCode, &m.IssuerAddress, &m.DisplayName,
			&verified, &enabled, &isDefault, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, err
		}
		m.IsVerified = verified != 0
		m.IsEnabled = enabled != 0
		m.IsDefault = isDefault != 0
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Service) seedDefaults(ctx context.Context, organizationID string) error {
	for _, code := range defaultAssetCodes {
		var existing string
		err := s.pool.QueryRow(ctx, `
			SELECT id FROM assets WHERE organization_id = $1 AND asset_code = $2 LIMIT 1`,
			organizationID, code).Scan(&existing)
		if err == nil {
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		displayName := code
		for _, asset := range officialAssets {
			if asset.Code == code {
				displayName = asset.DisplayName
				break
			}
		}
		isDefault := 0
		if code == "USDC" {
			isDefault = 1
		}
		_, err = s.pool.Exec(ctx, `
			INSERT INTO assets (organization_id, asset_code, display_name, is_verified, is_enabled, is_default)
			VALUES ($1, $2, $3, 1, 1, $4)`,
			organizationID, code, displayName, isDefault)
		if err != nil {
			return err
		}
	}
	return nil
}

func Serialize(m Method) Serialized {
	official := getOfficialAsset(m.AssetCode)
	subtitle := officialSubtitle(m.AssetCode)
	if subtitle == nil && m.IssuerAddress != nil {
		s := "Issuer " + *m.IssuerAddress
		subtitle = &s
	}
	return Serialized{
		ID:            m.ID,
		AssetCode:     m.AssetCode,
		IssuerAddress: m.IssuerAddress,
		DisplayName:   m.DisplayName,
		Subtitle:      subtitle,
		IsVerified:    m.IsVerified,
		IsEnabled:     m.IsEnabled,
		IsDefault:     m.IsDefault,
		IsOfficial:    official != nil,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}
}

func listAvailableOfficialAssets(methods []Method, environment string) []OfficialAsset {
	out := make([]OfficialAsset, 0)
	for _, asset := range officialAssets {
		if hasMethod(methods, asset.Code) {
			continue
		}
		if !isOfficialAvailable(asset, environment) {
			continue
		}
		out = append(out, OfficialAsset{
			AssetCode:   asset.Code,
			DisplayName: asset.DisplayName,
			Description: asset.Description,
			IssuedBy:    asset.IssuedBy,
		})
	}
	return out
}

func hasMethod(methods []Method, code string) bool {
	for _, m := range methods {
		if m.AssetCode == code {
			return true
		}
	}
	return false
}

func isOfficialAvailable(asset officialAssetDef, environment string) bool {
	if asset.IsNative {
		return true
	}
	return getOfficialIssuer(asset.Code, environment) != nil
}

func getOfficialIssuer(code, environment string) *string {
	if keys, ok := issuerEnvKeys[code]; ok {
		if v := strings.TrimSpace(os.Getenv(keys[environment])); v != "" {
			return &v
		}
	}
	if issuers, ok := builtinIssuers[code]; ok {
		return issuers[environment]
	}
	return nil
}

func getOfficialAsset(code string) *officialAssetDef {
	for i := range officialAssets {
		if officialAssets[i].Code == code {
			return &officialAssets[i]
		}
	}
	return nil
}

func officialSubtitle(code string) *string {
	asset := getOfficialAsset(code)
	if asset == nil {
		return nil
	}
	if asset.IsNative {
		s := "Native Asset"
		return &s
	}
	if asset.IssuedBy != nil {
		s := "Issued by " + *asset.IssuedBy
		return &s
	}
	return nil
}

func strPtr(s string) *string { return &s }

func normalizeIssuer(issuer *string) *string {
	if issuer == nil {
		return nil
	}
	t := strings.TrimSpace(*issuer)
	if t == "" {
		return nil
	}
	return &t
}

func issuerEqual(a, b *string) bool {
	na, nb := normalizeIssuer(a), normalizeIssuer(b)
	if na == nil && nb == nil {
		return true
	}
	if na == nil || nb == nil {
		return false
	}
	return *na == *nb
}

func findMatchingMethod(methods []Method, assetCode string, issuerAddress *string) *Method {
	for i := range methods {
		if methods[i].AssetCode != assetCode {
			continue
		}
		if issuerEqual(methods[i].IssuerAddress, issuerAddress) {
			return &methods[i]
		}
	}
	return nil
}

func IsOfficialAssetCode(code string) bool {
	return getOfficialAsset(code) != nil
}

func ResolveOfficialIssuer(code, environment string) *string {
	if code == "XLM" {
		return nil
	}
	return getOfficialIssuer(code, environment)
}

func IsOfficialAvailable(code, environment string) bool {
	asset := getOfficialAsset(code)
	if asset == nil {
		return false
	}
	return isOfficialAvailable(*asset, environment)
}

func DefaultAssetCodes() []string {
	out := make([]string, len(defaultAssetCodes))
	copy(out, defaultAssetCodes)
	return out
}

func OfficialDisplayName(code string) string {
	if asset := getOfficialAsset(code); asset != nil {
		return asset.DisplayName
	}
	return code
}

func (s *Service) GetByID(ctx context.Context, organizationID, methodID string) (*Method, error) {
	var m Method
	var verified, enabled, isDefault int
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, asset_code, issuer_address, display_name,
		       is_verified, is_enabled, is_default, created_at, updated_at
		FROM assets
		WHERE organization_id = $1 AND id = $2
		LIMIT 1`, organizationID, methodID).Scan(
		&m.ID, &m.OrganizationID, &m.AssetCode, &m.IssuerAddress, &m.DisplayName,
		&verified, &enabled, &isDefault, &m.CreatedAt, &m.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	m.IsVerified = verified != 0
	m.IsEnabled = enabled != 0
	m.IsDefault = isDefault != 0
	return &m, nil
}

func (s *Service) ListEnabled(ctx context.Context, organizationID string) ([]Method, error) {
	methods, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	out := make([]Method, 0, len(methods))
	for _, m := range methods {
		if m.IsEnabled {
			out = append(out, m)
		}
	}
	return out, nil
}

func (s *Service) AddOfficial(ctx context.Context, organizationID, code, environment string) (*Method, error) {
	official := getOfficialAsset(code)
	if official == nil {
		return nil, errors.New("Unknown official asset")
	}
	if !isOfficialAvailable(*official, environment) {
		return nil, errors.New(code + " is not available in " + environment + " mode")
	}
	existing, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if findMatchingMethod(existing, code, nil) != nil {
		return nil, errors.New(code + " is already configured")
	}

	var m Method
	var verified, enabled, isDefault int
	err = s.pool.QueryRow(ctx, `
		INSERT INTO assets (organization_id, asset_code, issuer_address, display_name, is_verified, is_enabled, is_default)
		VALUES ($1, $2, NULL, $3, 1, 0, 0)
		RETURNING id, organization_id, asset_code, issuer_address, display_name,
		          is_verified, is_enabled, is_default, created_at, updated_at`,
		organizationID, code, official.DisplayName,
	).Scan(
		&m.ID, &m.OrganizationID, &m.AssetCode, &m.IssuerAddress, &m.DisplayName,
		&verified, &enabled, &isDefault, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	m.IsVerified = verified != 0
	m.IsEnabled = enabled != 0
	m.IsDefault = isDefault != 0
	return &m, nil
}

func (s *Service) AddCustom(ctx context.Context, organizationID, assetCode, issuerAddress, environment string) (*Method, error) {
	if IsOfficialAssetCode(assetCode) {
		return nil, errors.New("Use official assets for USDC, XLM, and EURC")
	}

	validation := stellarValidate(assetCode, issuerAddress, environment)
	if !validation.Valid {
		return nil, errors.New(validation.Error)
	}

	existing, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	if findMatchingMethod(existing, assetCode, &issuerAddress) != nil {
		return nil, errors.New("This asset is already configured")
	}

	code := strings.ToUpper(assetCode)
	var m Method
	var verified, enabled, isDefault int
	err = s.pool.QueryRow(ctx, `
		INSERT INTO assets (organization_id, asset_code, issuer_address, display_name, is_verified, is_enabled, is_default)
		VALUES ($1, $2, $3, $4, 0, 0, 0)
		RETURNING id, organization_id, asset_code, issuer_address, display_name,
		          is_verified, is_enabled, is_default, created_at, updated_at`,
		organizationID, code, issuerAddress, validation.AssetName,
	).Scan(
		&m.ID, &m.OrganizationID, &m.AssetCode, &m.IssuerAddress, &m.DisplayName,
		&verified, &enabled, &isDefault, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	m.IsVerified = verified != 0
	m.IsEnabled = enabled != 0
	m.IsDefault = isDefault != 0
	return &m, nil
}

func (s *Service) Update(ctx context.Context, organizationID, methodID string, isEnabled bool) (*Method, error) {
	method, err := s.GetByID(ctx, organizationID, methodID)
	if err != nil {
		return nil, err
	}
	if method == nil {
		return nil, errors.New("Payment method not found")
	}
	if !isEnabled && method.IsDefault {
		return nil, errors.New("Cannot disable the settlement asset. Choose another default first.")
	}
	if !isEnabled {
		methods, err := s.listMethods(ctx, organizationID)
		if err != nil {
			return nil, err
		}
		enabledCount := 0
		for _, row := range methods {
			if row.IsEnabled && row.ID != methodID {
				enabledCount++
			}
		}
		if enabledCount == 0 {
			return nil, errors.New("At least one payment method must remain enabled")
		}
	}

	enabledInt := 0
	if isEnabled {
		enabledInt = 1
	}
	var m Method
	var verified, enabled, isDefault int
	err = s.pool.QueryRow(ctx, `
		UPDATE assets SET is_enabled = $1, updated_at = NOW() WHERE id = $2
		RETURNING id, organization_id, asset_code, issuer_address, display_name,
		          is_verified, is_enabled, is_default, created_at, updated_at`,
		enabledInt, methodID,
	).Scan(
		&m.ID, &m.OrganizationID, &m.AssetCode, &m.IssuerAddress, &m.DisplayName,
		&verified, &enabled, &isDefault, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	m.IsVerified = verified != 0
	m.IsEnabled = enabled != 0
	m.IsDefault = isDefault != 0
	return &m, nil
}

func (s *Service) Remove(ctx context.Context, organizationID, methodID string) error {
	method, err := s.GetByID(ctx, organizationID, methodID)
	if err != nil {
		return err
	}
	if method == nil {
		return errors.New("Payment method not found")
	}
	if method.IsDefault {
		return errors.New("Cannot remove the settlement asset. Choose another default first.")
	}
	methods, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return err
	}
	enabledCount := 0
	for _, row := range methods {
		if row.IsEnabled {
			enabledCount++
		}
	}
	if enabledCount <= 1 && method.IsEnabled {
		return errors.New("At least one payment method must remain enabled")
	}
	_, err = s.pool.Exec(ctx, `DELETE FROM assets WHERE id = $1`, methodID)
	return err
}

func (s *Service) SetDefaultSettlement(ctx context.Context, organizationID, methodID string) (*Method, error) {
	method, err := s.GetByID(ctx, organizationID, methodID)
	if err != nil {
		return nil, err
	}
	if method == nil {
		return nil, errors.New("Payment method not found")
	}
	if !method.IsEnabled {
		return nil, errors.New("Enable this asset before setting it as the settlement asset")
	}
	if _, err := s.pool.Exec(ctx, `
		UPDATE assets SET is_default = 0, updated_at = NOW() WHERE organization_id = $1`, organizationID); err != nil {
		return nil, err
	}
	var m Method
	var verified, enabled, isDefault int
	err = s.pool.QueryRow(ctx, `
		UPDATE assets SET is_default = 1, updated_at = NOW() WHERE id = $1
		RETURNING id, organization_id, asset_code, issuer_address, display_name,
		          is_verified, is_enabled, is_default, created_at, updated_at`, methodID,
	).Scan(
		&m.ID, &m.OrganizationID, &m.AssetCode, &m.IssuerAddress, &m.DisplayName,
		&verified, &enabled, &isDefault, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	m.IsVerified = verified != 0
	m.IsEnabled = enabled != 0
	m.IsDefault = isDefault != 0
	return &m, nil
}

type ValidationResult struct {
	Valid     bool
	Error     string
	AssetName string
	Issuer    string
	Network   string
}

// ValidateCustom delegates to Horizon asset lookup (injected via package-level func for testability).
func (s *Service) ValidateCustom(assetCode, issuerAddress, environment string) ValidationResult {
	return stellarValidate(assetCode, issuerAddress, environment)
}

// TrustlineAsset is the payment-methods view of a required trustline.
type TrustlineAsset struct {
	AssetCode     string
	IssuerAddress string
	DisplayName   string
}

func BuildTrustlineAssetsFromMethods(methods []Method, environment string) []TrustlineAsset {
	seen := map[string]bool{}
	out := make([]TrustlineAsset, 0)
	for _, method := range methods {
		official := getOfficialAsset(method.AssetCode)
		if official != nil && official.IsNative {
			continue
		}

		var issuer *string
		if IsOfficialAssetCode(method.AssetCode) {
			if !IsOfficialAvailable(method.AssetCode, environment) {
				continue
			}
			issuer = ResolveOfficialIssuer(method.AssetCode, environment)
		} else {
			issuer = normalizeIssuer(method.IssuerAddress)
		}
		if issuer == nil {
			continue
		}
		key := method.AssetCode + ":" + *issuer
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, TrustlineAsset{
			AssetCode:     method.AssetCode,
			IssuerAddress: *issuer,
			DisplayName:   method.DisplayName,
		})
	}
	return out
}

func (s *Service) RequiredTrustlineAssets(ctx context.Context, organizationID, environment string) ([]TrustlineAsset, error) {
	methods, err := s.ListEnabled(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	return BuildTrustlineAssetsFromMethods(methods, environment), nil
}

func (s *Service) RequiredTrustlineAssetsForMethodIDs(ctx context.Context, organizationID string, methodIDs []string, environment string) ([]TrustlineAsset, error) {
	methods, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	selected := map[string]bool{}
	for _, id := range methodIDs {
		selected[id] = true
	}
	filtered := make([]Method, 0)
	for _, m := range methods {
		if selected[m.ID] {
			filtered = append(filtered, m)
		}
	}
	return BuildTrustlineAssetsFromMethods(filtered, environment), nil
}

func DefaultRequiredTrustlineAssets(environment string) []TrustlineAsset {
	seen := map[string]bool{}
	out := make([]TrustlineAsset, 0)
	for _, code := range defaultAssetCodes {
		official := getOfficialAsset(code)
		if official == nil || official.IsNative {
			continue
		}
		if !IsOfficialAvailable(code, environment) {
			continue
		}
		issuer := ResolveOfficialIssuer(code, environment)
		if issuer == nil {
			continue
		}
		key := code + ":" + *issuer
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, TrustlineAsset{
			AssetCode:     code,
			IssuerAddress: *issuer,
			DisplayName:   official.DisplayName,
		})
	}
	return out
}

// stellarValidate is set to the Horizon validator; overridable in tests.
var stellarValidate = func(assetCode, issuerAddress, environment string) ValidationResult {
	// Imported via thin wrapper in validate_horizon.go to avoid import cycles in tests.
	return validateViaHorizon(assetCode, issuerAddress, environment)
}

// AllowedAsset matches payment asset JSON shapes used by invoices and payment links.
type AllowedAsset struct {
	AssetCode     string  `json:"asset_code"`
	IssuerAddress *string `json:"issuer_address"`
}

type AssetConfig struct {
	SettlementAsset AllowedAsset   `json:"settlement_asset"`
	AllowedAssets   []AllowedAsset `json:"allowed_assets"`
}

func methodToAllowedAsset(m Method) AllowedAsset {
	return AllowedAsset{AssetCode: m.AssetCode, IssuerAddress: m.IssuerAddress}
}

func assetKey(a AllowedAsset) string {
	issuer := ""
	if a.IssuerAddress != nil {
		issuer = strings.TrimSpace(*a.IssuerAddress)
	}
	return a.AssetCode + ":" + issuer
}

func (s *Service) GetDefaultAssetConfig(ctx context.Context, organizationID string) (*AssetConfig, error) {
	methods, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	var enabled []Method
	var defaultMethod *Method
	for i := range methods {
		if !methods[i].IsEnabled {
			continue
		}
		enabled = append(enabled, methods[i])
		if methods[i].IsDefault {
			defaultMethod = &methods[i]
		}
	}
	if len(enabled) == 0 {
		return nil, errors.New("No enabled payment methods. Configure them in Settings → Settlement Wallet.")
	}
	settlement := enabled[0]
	if defaultMethod != nil {
		settlement = *defaultMethod
	}
	allowed := make([]AllowedAsset, 0, len(enabled))
	for _, m := range enabled {
		allowed = append(allowed, methodToAllowedAsset(m))
	}
	return &AssetConfig{
		SettlementAsset: methodToAllowedAsset(settlement),
		AllowedAssets:   allowed,
	}, nil
}

func (s *Service) ResolveAssetConfig(ctx context.Context, organizationID string, settlement *AllowedAsset, allowed []AllowedAsset) (*AssetConfig, error) {
	methods, err := s.listMethods(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	enabledKeys := map[string]bool{}
	var enabled []Method
	for _, m := range methods {
		if !m.IsEnabled {
			continue
		}
		enabled = append(enabled, m)
		enabledKeys[assetKey(methodToAllowedAsset(m))] = true
	}
	if len(enabled) == 0 {
		return nil, errors.New("No enabled payment methods. Configure them in Settings → Settlement Wallet.")
	}

	defaults, err := s.GetDefaultAssetConfig(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	settlementAsset := defaults.SettlementAsset
	if settlement != nil && settlement.AssetCode != "" {
		settlementAsset = *settlement
	}
	if !enabledKeys[assetKey(settlementAsset)] {
		return nil, errors.New("Settlement asset is not enabled for this business")
	}

	allowedAssets := defaults.AllowedAssets
	if len(allowed) > 0 {
		allowedAssets = allowed
	}
	if len(allowedAssets) == 0 {
		return nil, errors.New("At least one allowed asset is required")
	}
	includesSettlement := false
	for _, asset := range allowedAssets {
		if !enabledKeys[assetKey(asset)] {
			return nil, errors.New("Asset " + asset.AssetCode + " is not enabled for this business")
		}
		if assetKey(asset) == assetKey(settlementAsset) {
			includesSettlement = true
		}
	}
	if !includesSettlement {
		return nil, errors.New("Settlement asset must be included in allowed assets")
	}
	return &AssetConfig{SettlementAsset: settlementAsset, AllowedAssets: allowedAssets}, nil
}
