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

---

## Resources

| Resource                   | Link                                        |
| -------------------------- | ------------------------------------------- |
| Website                    | https://payoes.com                          |
| Documentation              | https://docs.payoes.com                     |
| Payoes SDK                 | https://www.npmjs.com/package/@payoes/sdk   |
| Demo Video                 | https://www.youtube.com/watch?v=QL7icAGV0t4 |
| Pitch Deck                 | https://canva.link/r0khw89qvqiv4ft          |
| Testnet Smart Contract     |                                             |
| **Mainnet** Smart Contract |                                             |

## Tech Stack

| Layer      | Technology                                               |
| ---------- | -------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org/) (App Router)           |
| UI         | [React 19](https://react.dev/)                           |
| Styling    | [Tailwind CSS 4](https://tailwindcss.com/)               |
| Language   | [TypeScript 5](https://www.typescriptlang.org/)          |
| Database   | [PostgreSQL](https://www.postgresql.org/)                |
| Blockchain | [Stellar SDK](https://stellar.github.io/js-stellar-sdk/) |
| Docs       | [Mintlify](https://mintlify.com/)                        |
| Tooling    | ESLint · React Compiler · npm workspaces                 |

---

## Requirements

- **Node.js** `>= 20`
- **npm** `>= 10`
- **Docker** (for local PostgreSQL and MinIO)

---

## Quick Start

```bash
git clone git@github.com:yazidalg/payoes.git
cd payoes
npm install
npm run docker:up
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate
npm run dev              # http://localhost:3000
```

For the full local setup (environment variables, docs server), see the [Getting started](apps/docs/local-setup/getting-started.mdx) guide in `apps/docs/`.

### Scripts

| Script                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the Next.js dev server on port `3000`.   |
| `npm run build`       | Produce an optimized production build.         |
| `npm run start`       | Serve the production build locally.            |
| `npm run lint`        | Run ESLint across the web app.                 |
| `npm run docker:up`   | Start PostgreSQL and MinIO via Docker Compose. |
| `npm run docker:down` | Stop Docker Compose services.                  |
| `npm run db:migrate`  | Apply Drizzle database migrations.             |
| `npm run db:setup`    | Initialize the database schema.                |
| `npm run db:studio`   | Open Drizzle Studio for database inspection.   |
| `npm run docs:dev`    | Start Mintlify docs on port `3001`.            |

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
