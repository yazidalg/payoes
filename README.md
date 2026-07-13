<div align="center">

<img src="assets/readme-header.png" alt="Payoes" width="720" />

### Payment Infrastructure for Stellar, Without the Blockchain Complexity.

Payoes is a developer first payment infrastructure for Stellar that makes blockchain payments as simple as traditional payment gateways.

<br />

<!-- Ecosystem badges -->
<a href="https://stellar.org">
  <img alt="Built for Stellar" src="https://img.shields.io/badge/Built%20for-Stellar-000000?style=for-the-badge&logo=stellar&logoColor=white" />
</a>
<a href="https://www.circle.com/en/usdc">
  <img alt="USDC Payments" src="https://img.shields.io/badge/USDC-Payments-2775CA?style=for-the-badge" />
</a>
<a href="https://mintlify.com/">
  <img alt="API Docs" src="https://img.shields.io/badge/API-Docs-0D9373?style=for-the-badge" />
</a>

<br />

<!-- Tech badges -->
<a href="https://nextjs.org/">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" />
</a>
<a href="https://react.dev/">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
</a>
<a href="https://www.typescriptlang.org/">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
</a>
<a href="https://tailwindcss.com/">
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss&logoColor=white" />
</a>
<a href="https://orm.drizzle.team/">
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black" />
</a>
<a href="https://nodejs.org/">
  <img alt="Node 20+" src="https://img.shields.io/badge/node-%E2%89%A520-5FA04E?logo=nodedotjs&logoColor=white" />
</a>
<img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen" />

<br /><br />

<p>
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#contributing">Contributing</a>
</p>

</div>

---

## About

**Payoes** is a developer first payment infrastructure that makes blockchain payments as easy to integrate as traditional payment gateways. By abstracting wallets, blockchain transactions, and payment settlement behind familiar APIs, Payoes enables developers and businesses to build modern payment experiences without blockchain complexity.

## Why Payoes

Blockchain payments are rapidly gaining adoption, but integration remains a major challenge for developers and businesses.

According to Source: [Ripple's 2026 Digital Asset Survey](https://ripple.com/insights/first-look-at-ripples-2026-digital-asset-survey/):

- **74%** of financial leaders believe stablecoins improve cash flow efficiency.
- **57%** prefer an integrated payment infrastructure partner.
- **71%** prefer a unified payment solution over fragmented payment tools.

Despite this growing demand, developers are still expected to manage wallets, blockchain transactions, smart contracts, and payment settlement on their own.

Payoes bridges this gap by providing a developer first payment infrastructure that abstracts blockchain complexity into familiar payment workflows. Instead of building payment infrastructure from scratch, developers can integrate Stellar payments using modern APIs while leveraging the speed, security, and transparency of the Stellar network.

## Features

- **Crypto Payments**  
  Accept Stellar asset payments through a modern payment gateway. Payoes abstracts wallets, blockchain transactions, and payment processing so developers can integrate crypto payments without blockchain expertise.

- **Checkout, Payment Links & Invoicing**  
  Create hosted checkout pages, reusable payment links, and professional invoices to deliver a seamless payment experience for customers while simplifying payment collection for businesses.

- **On Chain Settlement & Verification**  
  Every successful payment is securely settled on the Stellar network and permanently recorded on chain, providing transparent, immutable, and publicly verifiable payment records.

- **Cross Asset Settlement**  
  Let customers pay with their preferred Stellar asset while merchants automatically receive settlement in their preferred asset through Stellar Path Payments.

- **Developer Integration**  
  Integrate Payoes into any application using developer friendly REST APIs, official SDKs, and real time webhooks designed for fast and reliable payment integrations.

- **Platform Integrations**  
  Connect Payoes with popular commerce platforms, business applications, and developer tools through ready to use integrations, plugins, APIs, and webhooks.

## Stellar Usage

Payoes is built on Stellar as the settlement layer. customers pay through wallets or QR codes; funds move through on-chain payment routing, path payments, and on-chain verification on Testnet or Mainnet.

**Payment flow**

1. Customer pays via wallet or QR deposit
2. Hosted checkout (Stellar Wallets Kit)
3. Muxed deposit address (SEP-23), detected by Horizon
4. Soroban settlement contract: register, deposit, settle or refund
5. Same asset: settle on contract (merchant + platform fee)
6. Cross asset: release to operator, Path Payment via DEX, record settlement
7. Merchant settlement wallet, webhooks, and explorer links

### Soroban Smart Contract

The `Payoes` contract in [`contracts/`](contracts/) is the on-chain payment router for every new payment.

| Capability                            | What it does                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `register_payment`                    | Locks payment terms: merchant, paid token, settlement amount, platform fee, expiry  |
| `deposit`                             | Holds customer funds on-chain; auto-refunds if the amount is too low                |
| `settle_same_asset_deposit`           | Atomically pays the merchant and platform fee when paid and settlement assets match |
| `release_deposit_to_operator`         | Releases held funds for cross-asset conversion by the settlement worker             |
| `record_settlement` / `record_refund` | Finalizes contract state after Horizon settlement or refund                         |
| Admin controls                        | Pause switch, fee recipient, authorization signer rotation                          |

Contract events (`payment_registered`, `payment_deposit_received`, `payment_settled`, `payment_refunded`) provide an auditable on-chain trail. Rust unit tests cover legacy pay, same-asset settlement, and underpayment refunds.

See the settlement flow diagram in [`docs/architecture/`](docs/architecture/).

### Path Payments and DEX Liquidity

Customers can pay in one Stellar asset while merchants settle in another (for example, pay in XLM, receive USDC).

1. Payoes quotes the required paid amount using live pricing and slippage buffers.
2. The settlement worker queries Horizon `strictReceivePaths` to find the best route through the Stellar DEX.
3. The operator submits a `pathPaymentStrictReceive` transaction to deliver the exact settlement amount to the merchant wallet.
4. The Soroban contract records the final settlement on-chain.

This uses Stellar's native order books and liquidity paths instead of custom swap logic.

### Trustlines

Issued assets on Stellar (such as USDC) require trustlines before an account can hold them.

Payoes validates trustlines before checkout and settlement:

- **Customers** must trust the asset they pay with (clear error if missing).
- **Merchants** must trust settlement assets on their receiving wallet.
- **Operator accounts** auto-sync trustlines for accepted merchant assets during payment creation and quote refresh.

Merchants can add missing trustlines from the dashboard via `changeTrust` transactions signed in their connected wallet.

### Muxed Accounts (SEP-23)

Each payment gets a **unique muxed deposit address** (`M...`) derived from the operator account and the payment ID. This gives Payoes:

- One deposit destination per checkout without creating a new keypair per payment
- Easier reconciliation when many customers pay in parallel
- QR-friendly deposit URLs that map to a single payment intent

Horizon deposit detection matches both classic and muxed destination fields when confirming payments.

### Horizon API

[Horizon](https://developers.stellar.org/docs/data/apis/horizon) is Payoes' read and submit layer for classic Stellar operations:

| Use case                 | Horizon capability                                                        |
| ------------------------ | ------------------------------------------------------------------------- |
| Build payment XDR        | Load account sequence, network passphrase                                 |
| Path finding             | `strictReceivePaths` for cross-asset quotes and settlement                |
| Payment verification     | Fetch transaction + operations; validate destination, asset, amount, memo |
| QR / background deposits | Poll payments to muxed operator addresses                                 |
| Explorer links           | Tx hashes surfaced in the dashboard link to Stellar Expert                |

A cron settlement worker scans Horizon for inbound deposits and drives on-chain settlement for both sandbox and production environments.

### Network Duality

Every organization runs in **sandbox** or **production**. Payoes maps environments directly to Stellar networks:

| Payoes environment | Stellar network | Horizon         | Soroban                |
| ------------------ | --------------- | --------------- | ---------------------- |
| `sandbox`          | Testnet         | Testnet Horizon | Testnet contract + RPC |
| `production`       | Mainnet         | Mainnet Horizon | Mainnet contract + RPC |

API keys, payments, webhooks, and settlement wallets are scoped per environment. The dashboard mode switcher lets merchants test on Testnet before going live on Mainnet with the same integration code.

### Wallet Integration

Hosted checkout connects to the Stellar wallet ecosystem through [**Stellar Wallets Kit**](https://github.com/Creit-Tech/Stellar-Wallets-Kit):

- **Freighter**, **Albedo**, and **xBull** supported out of the box
- Network validation ensures the wallet matches the checkout environment (Testnet vs Mainnet)
- Customers sign deposit transactions in-wallet; operator secrets never reach the browser
- **QR mode** generates `web+stellar:pay` URIs for wallet apps that support URI scanning

Merchants connect a **settlement wallet** (for example via Freighter) during onboarding to receive funds.

---

## Resources

| Resource                   | Link                                                     |
| -------------------------- | -------------------------------------------------------- |
| Website                    | https://payoes.com                                       |
| Documentation              | https://docs.payoes.com                                  |
| Payoes SDK                 | https://www.npmjs.com/package/@payoes/sdk                |
| Demo Video                 | https://www.youtube.com/watch?v=QL7icAGV0t4              |
| Pitch Deck                 | https://canva.link/r0khw89qvqiv4ft                       |
| Testnet Smart Contract     | CDD7VS6OPAAEHUNHJ2RUTLG5FZZWSWR2GZL5XFQBTQOTIO3ZEY5M6JJS |
| **Mainnet** Smart Contract | CANYTHWVKNUVAM2WZUAKIPP3AD6C5CBDPDDHZPJOPBRJRWRBOVGGZNUI |

## Requirements

- **Node.js** `>= 20`
- **npm** `>= 10`
- **Docker** (for local PostgreSQL and MinIO)

## Quick Start

The HTTP API lives in **`apps/api` (Go)**. The Next.js app (`apps/web`) serves the UI and calls the Go API via `NEXT_PUBLIC_API_URL`. Legacy routes under `apps/web/src/app/api` remain in the repo but are unused.

```bash
git clone git@github.com:yazidalg/payoes.git
cd payoes
npm install
npm run docker:up
cp apps/web/.env.example apps/web/.env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:8080 and AUTH_SECRET are set
npm run db:migrate
npm run dev:api          # http://localhost:8080 (Go API)
npm run dev              # http://localhost:3000 (Next.js UI)
```

For the full local setup (environment variables, docs server), see the [Getting started](apps/docs/local-setup/getting-started.mdx) guide in `apps/docs/`. See also [`apps/api/README.md`](apps/api/README.md).

### Scripts

| Script                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Start the Next.js UI on port `3000`.                 |
| `npm run dev:api`     | Start the Go API on port `8080`.                     |
| `npm run build`       | Produce an optimized production build.               |
| `npm run build:api`   | Build the Go API binary.                             |
| `npm run start`       | Serve the production build locally.                  |
| `npm run lint`        | Run ESLint across the web app.                       |
| `npm run docker:up`   | Start PostgreSQL, MinIO, and the Go API via Compose. |
| `npm run docker:down` | Stop Docker Compose services.                        |
| `npm run db:migrate`  | Apply Drizzle database migrations.                   |
| `npm run db:setup`    | Initialize the database schema.                      |
| `npm run db:studio`   | Open Drizzle Studio for database inspection.         |
| `npm run docs:dev`    | Start Mintlify docs on port `3001`.                  |

## Architecture

Payoes is a monorepo that combines a Next.js UI, a Go API (`apps/api`), a Soroban settlement contract, and shared packages. Merchants integrate through REST APIs or platform plugins; customers pay on hosted checkout pages without creating a Payoes account.

Diagrams use the [C4 model](https://c4model.com/). Source files and full write-up live in [`docs/architecture/`](docs/architecture/).

### API surfaces

The canonical API is the Go service in `apps/api`. Legacy Next.js handlers under `apps/web/src/app/api` are kept but unused.

| Surface          | Path               | Auth                                       | Used by                              |
| ---------------- | ------------------ | ------------------------------------------ | ------------------------------------ |
| Public REST API  | `/api/v1/**`       | Bearer API key (`sandbox` or `production`) | Merchant backends, SDK, integrations |
| Internal API     | `/api/**` (non-v1) | JWT session cookie (`payoes_session`)      | Dashboard UI                         |
| Inbound webhooks | `/api/webhooks/**` | Provider signatures                        | Persona, Shopify, WooCommerce        |
| Cron workers     | `/api/cron/**`     | `CRON_SECRET`                              | `scripts/cron`                       |

Every organization-scoped resource is filtered by `organizationId` and `environment`. Sandbox maps to Stellar Testnet; production maps to Mainnet.

### Repository layout

| Path                | Role                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `apps/api`          | Go HTTP API: auth, dashboard APIs, `/api/v1`, checkout, cron, inbound webhooks                |
| `apps/web`          | Next.js UI: marketing, dashboard, hosted checkout (calls Go API; legacy `/api` routes unused) |
| `apps/docs`         | Mintlify API documentation                                                                    |
| `packages/sdk`      | `@payoes/sdk` npm package for merchant integrations                                           |
| `contracts`         | Soroban smart contract for on-chain payment routing and settlement                            |
| `docs/architecture` | C4 PlantUML diagram sources                                                                   |

---

## Contributing

Contributions are welcome: bug reports, feature requests, and pull requests all help improve Payoes for developers and organizations alike.

Before opening a PR:

1. Install dependencies: `npm install`
2. Start local services: `npm run docker:up`
3. Run migrations: `npm run db:migrate`
4. Verify the build: `npm run build`
5. Run lint: `npm run lint`
6. Keep commits scoped and follow conventional prefixes (`feat:`, `fix:`, `style:`, `refactor:`, `chore:`, `docs:`).
7. For UI changes, include before/after screenshots in your PR description when practical.

---

## Acknowledgements

Built for organizations that want modern payment infrastructure on Stellar, standing on open-source foundations:

- [Next.js](https://nextjs.org/) · [React](https://react.dev/) · [Tailwind CSS](https://tailwindcss.com/)
- [Stellar](https://stellar.org): onchain payments and asset infrastructure
- [shadcn/ui](https://ui.shadcn.com/): dashboard components and design patterns
- [Mintlify](https://mintlify.com/): developer documentation

<div align="center">
<sub>Payment Infrastructure for Stellar, Without the Blockchain Complexity. · <a href="https://github.com/yazidalg/payoes">yazidalg/payoes</a></sub>
</div>
