package payments

import (
	"strings"

	"github.com/payoesteam/payoes/apps/api/internal/stellar"
)

func issuerOrEmpty(v *string) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(*v)
}

func ResolveComparableIssuer(asset AllowedAsset, environment string) *string {
	explicit := issuerOrEmpty(asset.IssuerAddress)
	if explicit != "" {
		return &explicit
	}
	if asset.AssetCode == "XLM" {
		return nil
	}
	if stellar.IsOfficialAssetCode(asset.AssetCode) {
		issuer := stellar.OfficialIssuer(asset.AssetCode, environment)
		if issuer == "" {
			return nil
		}
		return &issuer
	}
	return nil
}

func ResolveAllowedAsset(asset AllowedAsset, environment string) AllowedAsset {
	return AllowedAsset{
		AssetCode:     asset.AssetCode,
		IssuerAddress: ResolveComparableIssuer(asset, environment),
	}
}

func AllowedAssetsEquivalent(left, right AllowedAsset, environment string) bool {
	if left.AssetCode != right.AssetCode {
		return false
	}
	if left.AssetCode == "XLM" {
		return true
	}
	return issuerOrEmpty(ResolveComparableIssuer(left, environment)) ==
		issuerOrEmpty(ResolveComparableIssuer(right, environment))
}

func FindAllowedAsset(allowed []AllowedAsset, assetCode string, issuerAddress *string, environment string) *AllowedAsset {
	incoming := AllowedAsset{AssetCode: assetCode, IssuerAddress: issuerAddress}
	for i := range allowed {
		if allowed[i].AssetCode != assetCode {
			continue
		}
		if AllowedAssetsEquivalent(allowed[i], incoming, environment) {
			match := allowed[i]
			return &match
		}
	}
	return nil
}

func PaidAssetOf(p *Payment) AllowedAsset {
	if p.PaidAsset != nil {
		return AllowedAsset{AssetCode: *p.PaidAsset, IssuerAddress: p.PaidAssetIssuer}
	}
	return AllowedAsset{AssetCode: p.SettlementAsset, IssuerAddress: p.SettlementAssetIssuer}
}

func SettlementAssetOf(p *Payment) AllowedAsset {
	return AllowedAsset{AssetCode: p.SettlementAsset, IssuerAddress: p.SettlementAssetIssuer}
}
