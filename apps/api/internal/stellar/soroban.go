package stellar

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

func SorobanRPCURL(environment string) string {
	if environment == "production" {
		return strings.TrimSpace(os.Getenv("SOROBAN_MAINNET_RPC_URL"))
	}
	if v := strings.TrimSpace(os.Getenv("SOROBAN_TESTNET_RPC_URL")); v != "" {
		return v
	}
	return "https://soroban-testnet.stellar.org"
}

func SorobanContractID(environment string) string {
	if environment == "production" {
		return strings.TrimSpace(os.Getenv("SOROBAN_MAINNET_CONTRACT_ID"))
	}
	return strings.TrimSpace(os.Getenv("SOROBAN_TESTNET_CONTRACT_ID"))
}

func IsSorobanConfigured(environment string) bool {
	return SorobanRPCURL(environment) != "" &&
		SorobanContractID(environment) != "" &&
		IsOperatorConfigured(environment)
}

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params"`
}

type rpcResponse struct {
	Error  *struct{ Message string `json:"message"` } `json:"error"`
	Result json.RawMessage                           `json:"result"`
}

// GetSorobanTransactionStatus calls Soroban RPC getTransaction.
func GetSorobanTransactionStatus(environment, txHash string) (string, error) {
	rpcURL := SorobanRPCURL(environment)
	if rpcURL == "" {
		return "", fmt.Errorf("Soroban RPC is not configured")
	}
	body, _ := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "getTransaction",
		Params:  map[string]string{"hash": txHash},
	})
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Post(rpcURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("Unable to confirm Soroban escrow transaction")
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("Unable to confirm Soroban escrow transaction")
	}
	var payload rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	if payload.Error != nil {
		msg := payload.Error.Message
		if msg == "" {
			msg = "Unable to confirm Soroban escrow transaction"
		}
		return "", fmt.Errorf("%s", msg)
	}
	var result struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(payload.Result, &result); err != nil {
		return "NOT_FOUND", nil
	}
	if result.Status == "" {
		return "NOT_FOUND", nil
	}
	return result.Status, nil
}

// SubmitSorobanSignedXDR submits a signed Soroban transaction via RPC sendTransaction.
func SubmitSorobanSignedXDR(environment, signedXDR string) (string, error) {
	rpcURL := SorobanRPCURL(environment)
	if rpcURL == "" {
		return "", fmt.Errorf("Soroban RPC is not configured")
	}
	body, _ := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "sendTransaction",
		Params:  map[string]string{"transaction": signedXDR},
	})
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(rpcURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("Unable to submit Soroban transaction")
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("Unable to submit Soroban transaction")
	}
	var payload rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	if payload.Error != nil {
		msg := payload.Error.Message
		if msg == "" {
			msg = "Soroban transaction was rejected by the network"
		}
		return "", fmt.Errorf("%s", msg)
	}
	var result struct {
		Hash   string `json:"hash"`
		Status string `json:"status"`
		ErrorResultXDR string `json:"errorResultXdr"`
	}
	if err := json.Unmarshal(payload.Result, &result); err != nil {
		return "", err
	}
	if result.Hash == "" {
		return "", fmt.Errorf("Soroban transaction was rejected by the network")
	}
	if result.Status == "ERROR" {
		return "", fmt.Errorf("Soroban transaction was rejected by the network")
	}
	return result.Hash, nil
}
