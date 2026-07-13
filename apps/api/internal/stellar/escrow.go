package stellar

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"

	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/strkey"
)

type EscrowConfig struct {
	PublicKey string
	Keypair   *keypair.Full
}

func GetEscrowConfig(environment string) (*EscrowConfig, error) {
	kp, err := OperatorKeypair(environment)
	if err != nil {
		return nil, err
	}
	return &EscrowConfig{PublicKey: kp.Address(), Keypair: kp}, nil
}

// DepositAddress ports getEscrowDepositAddress: muxed operator address keyed by payment id.
func DepositAddress(environment, paymentPublicID string) (string, error) {
	operator, err := OperatorPublicKey(environment)
	if err != nil {
		return "", err
	}
	if paymentPublicID == "" {
		return operator, nil
	}
	sum := sha256.Sum256([]byte(paymentPublicID))
	id := binary.BigEndian.Uint64(sum[:8])

	var muxed strkey.MuxedAccount
	if err := muxed.SetAccountID(operator); err != nil {
		return "", fmt.Errorf("invalid operator address for muxed deposit: %w", err)
	}
	muxed.SetID(id)
	addr, err := muxed.Address()
	if err != nil {
		return "", err
	}
	return addr, nil
}
