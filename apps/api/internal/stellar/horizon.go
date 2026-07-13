package stellar

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"time"
)

var assetCodePattern = regexp.MustCompile(`^[A-Za-z0-9]{1,12}$`)

type HorizonAccount struct {
	AccountID string           `json:"account_id"`
	Sequence  string           `json:"sequence"`
	Balances  []HorizonBalance `json:"balances"`
}

type HorizonBalance struct {
	AssetType   string `json:"asset_type"`
	AssetCode   string `json:"asset_code"`
	AssetIssuer string `json:"asset_issuer"`
}

type AssetValidationResult struct {
	Valid     bool
	Error     string
	AssetName string
	Issuer    string
	Network   string
}

func IsValidAssetCode(code string) bool {
	return assetCodePattern.MatchString(code)
}

// AccountExists GETs Horizon /accounts/{addr}. Returns false on 404.
func AccountExists(address, environment string) (bool, error) {
	resp, err := horizonGet(environment, "/accounts/"+url.PathEscape(address))
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return false, fmt.Errorf("unable to verify Stellar account on Horizon")
	}
	return true, nil
}

// LoadAccount loads a Horizon account. Returns nil account when not found.
func LoadAccount(address, environment string) (*HorizonAccount, error) {
	resp, err := horizonGet(environment, "/accounts/"+url.PathEscape(address))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unable to load Stellar account from Horizon")
	}
	var account HorizonAccount
	if err := json.NewDecoder(resp.Body).Decode(&account); err != nil {
		return nil, err
	}
	return &account, nil
}

func AccountTrustsAsset(account *HorizonAccount, assetCode, issuer string) bool {
	if account == nil {
		return false
	}
	for _, bal := range account.Balances {
		if bal.AssetType != "credit_alphanum4" && bal.AssetType != "credit_alphanum12" {
			continue
		}
		if bal.AssetCode == assetCode && bal.AssetIssuer == issuer {
			return true
		}
	}
	return false
}

// ValidateCustomAssetOnHorizon ports apps/web/src/lib/stellar/validate-asset.ts.
func ValidateCustomAssetOnHorizon(assetCode, issuerAddress, environment string) AssetValidationResult {
	if !IsValidAssetCode(assetCode) {
		return AssetValidationResult{Valid: false, Error: "Asset code must be 1-12 alphanumeric characters"}
	}
	if !IsValidEd25519PublicKey(issuerAddress) {
		return AssetValidationResult{Valid: false, Error: "Issuer address must be a valid Stellar public key"}
	}

	q := url.Values{}
	q.Set("asset_code", assetCode)
	q.Set("asset_issuer", issuerAddress)
	resp, err := horizonGet(environment, "/assets?"+q.Encode())
	if err != nil {
		return AssetValidationResult{Valid: false, Error: "Unable to validate asset on Horizon. Try again later."}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return AssetValidationResult{Valid: false, Error: "Unable to validate asset on Horizon. Try again later."}
	}

	var payload struct {
		Embedded struct {
			Records []struct {
				AssetCode   string `json:"asset_code"`
				AssetIssuer string `json:"asset_issuer"`
			} `json:"records"`
		} `json:"_embedded"`
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return AssetValidationResult{Valid: false, Error: "Unable to validate asset on Horizon. Try again later."}
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return AssetValidationResult{Valid: false, Error: "Unable to validate asset on Horizon. Try again later."}
	}
	if len(payload.Embedded.Records) == 0 {
		return AssetValidationResult{Valid: false, Error: "Asset not found on this network"}
	}

	network := "Testnet"
	if environment == "production" {
		network = "Mainnet"
	}
	return AssetValidationResult{
		Valid:     true,
		AssetName: assetCode,
		Issuer:    issuerAddress,
		Network:   network,
	}
}

func horizonGet(environment, path string) (*http.Response, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	return client.Get(HorizonURL(environment) + path)
}
