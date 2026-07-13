# Payoes Soroban Contract

Single on-chain contract for Payoes checkout: legacy direct `pay`, escrow `register_payment`, wallet `deposit`, and worker `record_settlement` / `record_refund`.

## Commands

Run from this directory:

```sh
cargo test -p payoes
stellar contract build --package payoes
```

Deployments are tracked in the web app `soroban_contract_deployments` table.
