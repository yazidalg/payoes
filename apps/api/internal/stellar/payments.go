package stellar

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/strkey"
	"github.com/stellar/go-stellar-sdk/txnbuild"
)

const (
	MemoMaxLength      = 28
	DefaultSlippageBPS = 50
)

func HorizonClient(environment string) *horizonclient.Client {
	return &horizonclient.Client{HorizonURL: HorizonURL(environment)}
}

type BuildPaymentInput struct {
	SourcePublicKey      string
	DestinationPublicKey string
	Amount               string
	Asset                PaymentAsset
	Environment          string
	Memo                 *string
}

func BuildPaymentTransactionXDR(input BuildPaymentInput) (string, error) {
	account, err := LoadAccount(input.SourcePublicKey, input.Environment)
	if err != nil {
		return "", err
	}
	if account == nil {
		return "", fmt.Errorf("Your wallet account is not funded on this network. Add XLM before paying.")
	}

	asset, err := ResolveAsset(input.Asset, input.Environment)
	if err != nil {
		return "", err
	}

	if err := assertAssetTrustlines(input.SourcePublicKey, input.DestinationPublicKey, asset, input.Environment); err != nil {
		return "", err
	}

	seq, err := strconv.ParseInt(account.Sequence, 10, 64)
	if err != nil {
		return "", fmt.Errorf("Unable to read account sequence from Horizon")
	}

	params := txnbuild.TransactionParams{
		SourceAccount: &txnbuild.SimpleAccount{
			AccountID: input.SourcePublicKey,
			Sequence:  seq,
		},
		IncrementSequenceNum: true,
		Operations: []txnbuild.Operation{
			&txnbuild.Payment{
				Destination: input.DestinationPublicKey,
				Amount:      input.Amount,
				Asset:       asset,
			},
		},
		BaseFee:       txnbuild.MinBaseFee,
		Preconditions: txnbuild.Preconditions{TimeBounds: txnbuild.NewTimeout(TransactionTimeoutSeconds)},
	}
	if input.Memo != nil && strings.TrimSpace(*input.Memo) != "" {
		memo := strings.TrimSpace(*input.Memo)
		if len(memo) > MemoMaxLength {
			memo = memo[:MemoMaxLength]
		}
		params.Memo = txnbuild.MemoText(memo)
	}

	tx, err := txnbuild.NewTransaction(params)
	if err != nil {
		return "", err
	}
	return tx.Base64()
}

func assertAssetTrustlines(source, destination string, asset txnbuild.Asset, environment string) error {
	if _, ok := asset.(txnbuild.NativeAsset); ok {
		return nil
	}
	credit, ok := asset.(txnbuild.CreditAsset)
	if !ok {
		return fmt.Errorf("unsupported asset")
	}

	src, err := LoadAccount(source, environment)
	if err != nil {
		return err
	}
	if src == nil || !AccountTrustsAsset(src, credit.Code, credit.Issuer) {
		return fmt.Errorf("Your wallet is missing a trustline for %s", credit.Code)
	}

	// Muxed destinations resolve to the operator G-address for trustline checks.
	destCheck := destination
	if strings.HasPrefix(destination, "M") {
		if muxed, err := strkey.DecodeMuxedAccount(destination); err == nil {
			if g, err := muxed.AccountID(); err == nil {
				destCheck = g
			}
		}
	}
	dst, err := LoadAccount(destCheck, environment)
	if err != nil {
		return err
	}
	if dst == nil || !AccountTrustsAsset(dst, credit.Code, credit.Issuer) {
		return fmt.Errorf("The escrow wallet cannot receive %s yet. Try again in a moment.", credit.Code)
	}
	return nil
}

// SubmitSignedXDR submits a signed classic transaction to Horizon.
func SubmitSignedXDR(signedXDR, environment string) (string, error) {
	client := HorizonClient(environment)
	tx, err := client.SubmitTransactionXDR(signedXDR)
	if err != nil {
		return "", formatHorizonSubmitError(err)
	}
	return tx.Hash, nil
}

// SignAndSubmitPayment builds, signs with the operator keypair, and submits.
func SignAndSubmitPayment(kp *keypair.Full, destination, amount string, asset PaymentAsset, environment string, memo *string) (string, error) {
	xdrStr, err := BuildPaymentTransactionXDR(BuildPaymentInput{
		SourcePublicKey:      kp.Address(),
		DestinationPublicKey: destination,
		Amount:               amount,
		Asset:                asset,
		Environment:          environment,
		Memo:                 memo,
	})
	if err != nil {
		return "", err
	}

	tx, err := txnbuild.TransactionFromXDR(xdrStr)
	if err != nil {
		return "", err
	}
	parsed, ok := tx.Transaction()
	if !ok {
		return "", fmt.Errorf("expected a transaction envelope")
	}
	signed, err := parsed.Sign(NetworkPassphrase(environment), kp)
	if err != nil {
		return "", err
	}
	b64, err := signed.Base64()
	if err != nil {
		return "", err
	}
	return SubmitSignedXDR(b64, environment)
}

type DepositVerification struct {
	Valid          bool
	Reason         string
	PayerAddress   string
	ReceivedAmount string
	PaidAsset      PaymentAsset
}

// VerifyEscrowDepositByMemo ports verifyEscrowDepositByMemo.
func VerifyEscrowDepositByMemo(txHash, destination, environment string, memo *string) (DepositVerification, error) {
	tx, ops, err := loadTransactionAndOps(txHash, environment)
	if err != nil {
		return DepositVerification{}, err
	}
	if !tx.Successful {
		return DepositVerification{Valid: false, Reason: "Transaction was not successful"}, nil
	}
	if memo != nil && *memo != "" {
		txMemo := ""
		if tx.Memo != "" {
			txMemo = tx.Memo
		}
		if txMemo != *memo {
			return DepositVerification{Valid: false, Reason: "Payment memo does not match"}, nil
		}
	}

	paymentOp := findPaymentOp(ops)
	if paymentOp == nil {
		return DepositVerification{Valid: false, Reason: "Payment operation not found"}, nil
	}

	to := paymentOp.To
	if paymentOp.ToMuxed != "" {
		to = paymentOp.ToMuxed
	}
	if to != destination {
		return DepositVerification{Valid: false, Reason: "Payment was sent to a different address than the escrow wallet"}, nil
	}

	payer := paymentOp.From
	if paymentOp.FromMuxed != "" {
		payer = paymentOp.FromMuxed
	}

	code := "XLM"
	var issuer *string
	if paymentOp.AssetType != "native" {
		code = paymentOp.AssetCode
		iss := paymentOp.AssetIssuer
		issuer = &iss
	}

	return DepositVerification{
		Valid:          true,
		PayerAddress:   payer,
		ReceivedAmount: paymentOp.Amount,
		PaidAsset:      PaymentAsset{AssetCode: code, IssuerAddress: issuer},
	}, nil
}

type PaymentOp struct {
	Type        string `json:"type"`
	From        string `json:"from"`
	FromMuxed   string `json:"from_muxed"`
	To          string `json:"to"`
	ToMuxed     string `json:"to_muxed"`
	Amount      string `json:"amount"`
	AssetType   string `json:"asset_type"`
	AssetCode   string `json:"asset_code"`
	AssetIssuer string `json:"asset_issuer"`
	TxHash      string `json:"transaction_hash"`
}

type horizonTx struct {
	Successful bool   `json:"successful"`
	Memo       string `json:"memo"`
	Hash       string `json:"hash"`
}

func loadTransactionAndOps(txHash, environment string) (*horizonTx, []PaymentOp, error) {
	client := &http.Client{Timeout: 20 * time.Second}
	txResp, err := client.Get(HorizonURL(environment) + "/transactions/" + url.PathEscape(txHash))
	if err != nil {
		return nil, nil, err
	}
	defer txResp.Body.Close()
	if txResp.StatusCode == http.StatusNotFound {
		return nil, nil, fmt.Errorf("Transaction not found")
	}
	if txResp.StatusCode < 200 || txResp.StatusCode >= 300 {
		return nil, nil, fmt.Errorf("Unable to load transaction from Horizon")
	}
	var tx horizonTx
	if err := json.NewDecoder(txResp.Body).Decode(&tx); err != nil {
		return nil, nil, err
	}

	opsResp, err := client.Get(HorizonURL(environment) + "/transactions/" + url.PathEscape(txHash) + "/operations?limit=10")
	if err != nil {
		return nil, nil, err
	}
	defer opsResp.Body.Close()
	body, err := io.ReadAll(opsResp.Body)
	if err != nil {
		return nil, nil, err
	}
	var payload struct {
		Embedded struct {
			Records []PaymentOp `json:"records"`
		} `json:"_embedded"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, nil, err
	}
	return &tx, payload.Embedded.Records, nil
}

func findPaymentOp(ops []PaymentOp) *PaymentOp {
	for i := range ops {
		if ops[i].Type == "payment" {
			return &ops[i]
		}
	}
	return nil
}

// ListRecentPaymentsForAccount returns recent payment operations for an account.
func ListRecentPaymentsForAccount(accountID, environment string, limit int) ([]PaymentOp, error) {
	if limit <= 0 {
		limit = 50
	}
	client := &http.Client{Timeout: 20 * time.Second}
	u := fmt.Sprintf("%s/accounts/%s/payments?order=desc&limit=%d",
		HorizonURL(environment), url.PathEscape(accountID), limit)
	resp, err := client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Unable to list payments from Horizon")
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var payload struct {
		Embedded struct {
			Records []PaymentOp `json:"records"`
		} `json:"_embedded"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	return payload.Embedded.Records, nil
}

func formatHorizonSubmitError(err error) error {
	if herr, ok := err.(*horizonclient.Error); ok {
		if herr.Problem.Detail != "" {
			return fmt.Errorf("%s", herr.Problem.Detail)
		}
		if herr.Problem.Title != "" {
			return fmt.Errorf("%s", herr.Problem.Title)
		}
	}
	return fmt.Errorf("Unable to submit payment: %w", err)
}
