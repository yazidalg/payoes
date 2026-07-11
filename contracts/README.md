# Payoes Soroban Contracts

`payoes-payment-router` settles a Payoes payment atomically. A valid invocation requires authorization from both the payer and the Payoes authorization signer. The contract transfers the merchant amount and platform fee directly from the payer, records the payment ID, and emits a `PaymentSettled` event.

## Commands

Run commands from this directory:

```sh
cargo test -p payoes-payment-router
stellar contract build --package payoes-payment-router
```

Deployments and the active contract IDs are recorded by the web application in `soroban_contract_deployments`.