package paymentmethods

import "github.com/payoesteam/payoes/apps/api/internal/stellar"

func validateViaHorizon(assetCode, issuerAddress, environment string) ValidationResult {
	result := stellar.ValidateCustomAssetOnHorizon(assetCode, issuerAddress, environment)
	return ValidationResult{
		Valid:     result.Valid,
		Error:     result.Error,
		AssetName: result.AssetName,
		Issuer:    result.Issuer,
		Network:   result.Network,
	}
}
