// Package soroban ports apps/web/src/lib/soroban configuration and RPC helpers.
package soroban

import "os"

func RPCURL(environment string) string {
	if environment == "production" {
		return os.Getenv("SOROBAN_MAINNET_RPC_URL")
	}
	if v := os.Getenv("SOROBAN_TESTNET_RPC_URL"); v != "" {
		return v
	}
	return "https://soroban-testnet.stellar.org"
}

func ContractID(environment string) string {
	if environment == "production" {
		return os.Getenv("SOROBAN_MAINNET_CONTRACT_ID")
	}
	return os.Getenv("SOROBAN_TESTNET_CONTRACT_ID")
}
