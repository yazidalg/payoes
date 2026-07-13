// Package stellar ports apps/web/src/lib/stellar helpers used by checkout and settlement.
package stellar

const (
	TestnetHorizonURL = "https://horizon-testnet.stellar.org"
	MainnetHorizonURL = "https://horizon.stellar.org"
	TestnetPassphrase = "Test SDF Network ; September 2015"
	MainnetPassphrase = "Public Global Stellar Network ; September 2015"
)

func HorizonURL(environment string) string {
	if environment == "production" {
		return MainnetHorizonURL
	}
	return TestnetHorizonURL
}

func NetworkPassphrase(environment string) string {
	if environment == "production" {
		return MainnetPassphrase
	}
	return TestnetPassphrase
}
