# Soroban Payment Router Status

This document records the current Soroban payment router implementation and the work that remains before it can be treated as production-ready.

## Implemented Components

### Database Foundation

The database schema includes the following Soroban-related records:

- Payment fields: `payment_flow`, `blockchain_status`, `soroban_contract_id`, `platform_fee_amount`, `merchant_settlement_amount`, and `payment_authorization_hash`.
- `soroban_contract_deployments` for deployed contract metadata.
- `stellar_transactions` for normalized on-chain transaction records.
- `soroban_events` for contract event records.
- `stellar_sync_cursors` for durable event-ingestion cursors.

The payment quote repair migration is `0027_repair_payment_quote_columns.sql`. It restores `quoted_settlement_amount` and `settlement_quote_rate` for databases whose earlier migration history skipped those columns.

### Smart Contract

The unified `Payoes` contract is located at `contracts/src`.

The contract:

- Supports legacy direct `pay` with payer and authorization-signer authorization.
- Supports escrow `register_payment`, wallet `deposit`, and worker `record_settlement` / `record_refund`.
- Rejects expired payments, invalid fee amounts, paused execution, and duplicate payment IDs.
- Transfers the merchant settlement amount and the platform fee atomically on direct pay.
- Persists payment records and emits settlement/refund events.

Unit tests cover legacy pay, same-asset deposit settlement, and underpayment refund.

### Testnet Deployment

The current Testnet contract ID is:

```text
CB4SYQEJQWTDZJYAX3YUHSJKJOSG5CPCRGP22USJDOI6QWI7T3SOSFGE
```

The deployed WASM hash is:

```text
0bc10d157b2a190878ea8309d48222fcf32fd9bab352e27054102160305f50a2
```

Contract interface verification:

```powershell
stellar contract info interface `
  --network testnet `
  --contract-id CB4SYQEJQWTDZJYAX3YUHSJKJOSG5CPCRGP22USJDOI6QWI7T3SOSFGE
```

### Checkout Flow

New payments use `payment_flow = escrow` and a single Soroban contract path:

```text
Checkout requests an escrow deposit XDR
-> Backend registers the payment on the contract
-> Backend simulates deposit and signs the authorization entry
-> Customer wallet signs the transaction envelope
-> Backend submits the signed XDR to Soroban RPC
-> Same-asset deposits settle on the contract immediately
-> Cross-asset deposits are held on the contract, released to the operator, and settled by the worker
```

Legacy `direct` and `soroban` (`pay()`) checkout flows are deprecated for new payments.

The browser never receives the Payoes authorization signer secret.

## Required Environment Variables

```env
STELLAR_TESTNET_OPERATOR_SECRET=
SOROBAN_TESTNET_RPC_URL=
SOROBAN_TESTNET_CONTRACT_ID=

STELLAR_MAINNET_OPERATOR_SECRET=
SOROBAN_MAINNET_RPC_URL=
SOROBAN_MAINNET_CONTRACT_ID=
```

One operator secret is enough for sandbox development: Soroban authorization, classic escrow deposits, and sandbox payment simulation all read from `STELLAR_*_OPERATOR_SECRET`.

The operator secret must only be available to the server runtime or a secrets manager. It must not be committed, exposed to browser code, or stored in application tables.

## Current Limitations

- Soroban confirmation currently relies on the RPC transaction status. It does not yet persist or validate the `PaymentSettled` event.
- The event ingestion worker has not been implemented.
- `stellar_transactions` and `soroban_events` are not populated by the current checkout confirmation flow.
- `blockchain_status`, `soroban_contract_id`, and `merchant_settlement_amount` are not updated after successful checkout confirmation.
- Platform fee configuration has no dashboard or public API control yet. Normal payments apply a fixed 1% fee, rounded down to stroops. The fee is calculated in the settlement asset, while manually recorded payments remain fee-free.
- Soroban checkout requires a configured escrow contract for all new payments.
- Cross-asset deposits are held on the contract and settled by the operator worker.
- Mainnet deployment, contract audit, key management policy, monitoring, and alerting remain required.

## Next Implementation Steps

1. Implement a Soroban event ingestion service that reads `PaymentSettled` events with a durable RPC cursor.
2. Persist verified transactions to `stellar_transactions` and events to `soroban_events` idempotently.
3. Match the event payment hash to a pending Payoes payment and validate payer, merchant, asset, gross amount, and fee.
4. Update payment blockchain fields and deliver webhooks only after event verification.
5. Add a protected cron endpoint and reconciliation job for event ingestion.
6. Add platform-fee configuration and checkout fee presentation.
7. Add dashboard transaction details, unmatched-event review, and contract deployment visibility.
8. Complete Testnet end-to-end coverage before any Mainnet deployment.
