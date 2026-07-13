package payments

import "encoding/json"

const handledDepositTxHashesKey = "handled_deposit_tx_hashes"

func getHandledDepositTxHashes(metadata map[string]string) []string {
	if metadata == nil {
		return nil
	}
	raw, ok := metadata[handledDepositTxHashesKey]
	if !ok || raw == "" {
		return nil
	}
	var parsed []string
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil
	}
	out := make([]string, 0, len(parsed))
	for _, v := range parsed {
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

func IsEscrowRefundTerminal(payment *Payment) bool {
	return payment.Status == "refunded" || payment.RefundTxHash != nil
}

func IsDepositTxAlreadyHandled(payment *Payment, txHash string) bool {
	if txHash == "" {
		return false
	}
	handled := getHandledDepositTxHashes(payment.Metadata)
	contains := false
	for _, h := range handled {
		if h == txHash {
			contains = true
			break
		}
	}

	if contains && payment.DepositTxHash == nil && payment.Status == "pending" {
		return true
	}
	if payment.DepositTxHash == nil || *payment.DepositTxHash != txHash {
		return false
	}
	if payment.Status == "completed" {
		return true
	}
	if IsEscrowRefundTerminal(payment) {
		return true
	}
	if payment.Status == "refunding" {
		return true
	}
	if payment.Status == "settlement_failed" && payment.RefundReason != nil {
		return true
	}
	return false
}

func MarkDepositTxHandled(metadata map[string]string, txHash string) map[string]string {
	if txHash == "" {
		if metadata == nil {
			return map[string]string{}
		}
		return metadata
	}
	out := map[string]string{}
	for k, v := range metadata {
		out[k] = v
	}
	handled := getHandledDepositTxHashes(out)
	for _, h := range handled {
		if h == txHash {
			return out
		}
	}
	handled = append(handled, txHash)
	raw, _ := json.Marshal(handled)
	out[handledDepositTxHashesKey] = string(raw)
	return out
}
