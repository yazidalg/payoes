package stellar

import (
	"fmt"
	"strconv"

	"github.com/stellar/go-stellar-sdk/txnbuild"
)

const TransactionTimeoutSeconds = 300

type TrustlineAsset struct {
	AssetCode     string `json:"asset_code"`
	IssuerAddress string `json:"issuer_address"`
	DisplayName   string `json:"display_name"`
}

// GetMissingTrustlines ports the check path of apps/web/src/lib/stellar/trustlines.ts.
func GetMissingTrustlines(accountID string, required []TrustlineAsset, environment string) ([]TrustlineAsset, error) {
	account, err := LoadAccount(accountID, environment)
	if err != nil {
		return nil, err
	}

	missing := make([]TrustlineAsset, 0)
	for _, asset := range required {
		if account == nil || !AccountTrustsAsset(account, asset.AssetCode, asset.IssuerAddress) {
			missing = append(missing, asset)
		}
	}
	return missing, nil
}

// BuildChangeTrustTransactionXDR ports buildChangeTrustTransactionXdr.
func BuildChangeTrustTransactionXDR(sourcePublicKey string, assets []TrustlineAsset, environment string) (string, error) {
	if len(assets) == 0 {
		return "", fmt.Errorf("No trustlines to add.")
	}

	account, err := LoadAccount(sourcePublicKey, environment)
	if err != nil {
		return "", err
	}
	if account == nil {
		return "", fmt.Errorf("Your wallet account is not funded on this network. Add XLM before adding trustlines.")
	}

	seq, err := strconv.ParseInt(account.Sequence, 10, 64)
	if err != nil {
		return "", fmt.Errorf("Unable to read account sequence from Horizon")
	}

	ops := make([]txnbuild.Operation, 0, len(assets))
	for _, asset := range assets {
		ops = append(ops, &txnbuild.ChangeTrust{
			Line: txnbuild.CreditAsset{
				Code:   asset.AssetCode,
				Issuer: asset.IssuerAddress,
			}.MustToChangeTrustAsset(),
		})
	}

	tx, err := txnbuild.NewTransaction(txnbuild.TransactionParams{
		SourceAccount: &txnbuild.SimpleAccount{
			AccountID: sourcePublicKey,
			Sequence:  seq,
		},
		IncrementSequenceNum: true,
		Operations:           ops,
		BaseFee:              txnbuild.MinBaseFee,
		Preconditions:        txnbuild.Preconditions{TimeBounds: txnbuild.NewTimeout(TransactionTimeoutSeconds)},
	})
	if err != nil {
		return "", err
	}

	// Network passphrase is applied by the wallet when signing; unsigned XDR does not embed it.
	_ = NetworkPassphrase(environment)

	xdr, err := tx.Base64()
	if err != nil {
		return "", err
	}
	return xdr, nil
}
