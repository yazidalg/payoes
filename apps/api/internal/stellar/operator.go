package stellar

import (
	"fmt"
	"os"
	"strings"

	"github.com/stellar/go-stellar-sdk/keypair"
)

// OperatorSecret returns STELLAR_{TESTNET|MAINNET}_OPERATOR_SECRET.
func OperatorSecret(environment string) string {
	suffix := "TESTNET"
	if environment == "production" {
		suffix = "MAINNET"
	}
	return strings.TrimSpace(os.Getenv("STELLAR_" + suffix + "_OPERATOR_SECRET"))
}

func IsOperatorConfigured(environment string) bool {
	return OperatorSecret(environment) != ""
}

func OperatorKeypair(environment string) (*keypair.Full, error) {
	secret := OperatorSecret(environment)
	if secret == "" {
		suffix := "TESTNET"
		if environment == "production" {
			suffix = "MAINNET"
		}
		return nil, fmt.Errorf("STELLAR_%s_OPERATOR_SECRET is not configured", suffix)
	}
	kp, err := keypair.ParseFull(secret)
	if err != nil {
		return nil, fmt.Errorf("invalid operator secret: %w", err)
	}
	return kp, nil
}

func OperatorPublicKey(environment string) (string, error) {
	kp, err := OperatorKeypair(environment)
	if err != nil {
		return "", err
	}
	return kp.Address(), nil
}
