package stellar

import (
	"fmt"
	"os"
	"strings"

	"github.com/stellar/go-stellar-sdk/txnbuild"
)

// OfficialIssuers mirrors apps/web/src/constants/assets/issuers.ts defaults.
var OfficialIssuers = map[string]map[string]string{
	"USDC": {
		"sandbox":    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
		"production": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
	},
	"EURC": {
		"sandbox":    "GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO",
		"production": "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
	},
	"PYUSD": {
		"sandbox":    "GBT2KJDKUZYZTQPCSR57VZT5NJHI4H7FOB5LT5FPRWSR7I5B4FS3UU7G",
		"production": "GDQE7IXJ4HUHV6RQHIUPRJSEZE4DRS5WY577O2FY6YQ5LVWZ7JZTU2V5",
	},
	"AUDD": {
		"sandbox":    "GBAQ7FQE2AIXWTX4TCMXEMB3EZSBF565LK5NBKNBTAMLNLX3BHUTFRAI",
		"production": "GDC7X2MXTYSAKUUGAIQ7J7RPEIM7GXSAIWFYWWH4GLNFECQVJJLB2EEU",
	},
	"NGNC": {
		"production": "GASBV6W7GGED66MXEVC7YZHTWWYMSVYEY35USF2HJZBLABLYIFQGXZY6",
	},
}

func IsOfficialAssetCode(code string) bool {
	if code == "XLM" {
		return true
	}
	_, ok := OfficialIssuers[code]
	return ok
}

func OfficialIssuer(code, environment string) string {
	if code == "XLM" {
		return ""
	}
	envKey := strings.ToUpper(code) + "_" + strings.ToUpper(mapEnvSuffix(environment)) + "_ISSUER"
	if v := strings.TrimSpace(os.Getenv(envKey)); v != "" {
		return v
	}
	byEnv := OfficialIssuers[code]
	if byEnv == nil {
		return ""
	}
	return byEnv[environment]
}

func mapEnvSuffix(environment string) string {
	if environment == "production" {
		return "MAINNET"
	}
	return "TESTNET"
}

type PaymentAsset struct {
	AssetCode     string
	IssuerAddress *string
}

// ResolveAsset ports apps/web/src/lib/stellar/assets.ts resolveStellarAsset.
func ResolveAsset(input PaymentAsset, environment string) (txnbuild.Asset, error) {
	if input.AssetCode == "XLM" {
		return txnbuild.NativeAsset{}, nil
	}
	issuer := ""
	if input.IssuerAddress != nil {
		issuer = strings.TrimSpace(*input.IssuerAddress)
	}
	if issuer == "" && IsOfficialAssetCode(input.AssetCode) {
		issuer = OfficialIssuer(input.AssetCode, environment)
	}
	if issuer == "" {
		return nil, fmt.Errorf("Issuer is required for asset %s", input.AssetCode)
	}
	return txnbuild.CreditAsset{Code: input.AssetCode, Issuer: issuer}, nil
}

func AssetIdentifier(input PaymentAsset, environment string) (string, error) {
	asset, err := ResolveAsset(input, environment)
	if err != nil {
		return "", err
	}
	if _, ok := asset.(txnbuild.NativeAsset); ok {
		return "native", nil
	}
	credit, ok := asset.(txnbuild.CreditAsset)
	if !ok {
		return "", fmt.Errorf("unsupported asset type")
	}
	return credit.Code + ":" + credit.Issuer, nil
}
