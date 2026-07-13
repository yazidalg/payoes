package stellar

import "github.com/stellar/go-stellar-sdk/strkey"

// IsValidEd25519PublicKey ports apps/web/src/lib/stellar/validate-address.ts.
func IsValidEd25519PublicKey(address string) bool {
	return strkey.IsValidEd25519PublicKey(address)
}
