<div align="center">

<img src="apps/web/public/logo.svg" alt="Payoes" width="80" />

# Payoes

### Stellar payment infrastructure for modern businesses.

Accept stablecoin payments, manage invoices and checkout flows, and integrate with a developer-first API and dashboard.

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

**Payoes** is a Stellar payments platform for organizations. Configure a settlement wallet, accept USDC and other Stellar assets, and operate payment links, checkout sessions, and invoices from a unified dashboard or REST API.

> **Repository:** [`payoes/payoes`](https://github.com/payoes/payoes)

---

## Features

- **Marketing landing page**: public homepage with product overview and sign-up CTAs.
- **Organization dashboard**: payments, transactions, settlements, customers, and analytics in one workspace.
- **Payment links & checkout sessions**: shareable links and hosted checkout flows for one-time payments.
- **Invoicing**: create, send, finalize, and track invoices with customer management.
- **Settlement wallet**: configure the Stellar public key and trustlines that receive organization payments.
- **Sandbox & production**: separate environments for testing and live operations.
- **REST API (v1)**: programmatic access to customers, payments, invoices, and checkout sessions.
- **Developer tools**: API keys, webhooks with delivery retries, and request logs.
- **Payoes SDK**: TypeScript client for wallet and payment flows on Stellar (in progress).
- **Mintlify docs**: OpenAPI-backed developer documentation with local setup guides.
- **Team & onboarding**: organization setup, member invites, and wallet onboarding flows.
- **Responsive UI**: shadcn/ui dashboard with collapsible sidebar and mobile-friendly layouts.

---

## Tech Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org/) (App Router)                             |
| UI         | [React 19](https://react.dev/) + [shadcn/ui](https://ui.shadcn.com/)       |
| Styling    | [Tailwind CSS 4](https://tailwindcss.com/)                               |
| Language   | [TypeScript 5](https://www.typescriptlang.org/)                            |
| Database   | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth       | [NextAuth.js](https://next-auth.js.org/)                                   |
| Blockchain | [Stellar SDK](https://stellar.github.io/js-stellar-sdk/)                   |
| Storage    | [MinIO](https://min.io/) (S3-compatible, local dev)                        |
| Docs       | [Mintlify](https://mintlify.com/)                                          |
| Tooling    | ESLint · React Compiler · npm workspaces                                   |

---

## Requirements

- **Node.js** `>= 20`
- **npm** `>= 10`
- **Docker** (for local PostgreSQL and MinIO)

---

## Quick Start

```bash
git clone git@github.com:payoes/payoes.git
cd payoes
npm install
npm run docker:up
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate
npm run dev              # http://localhost:3000
```

For the full local setup (environment variables, docs server), see the [Getting started](docs/local-setup/getting-started.mdx) guide in `docs/`.

### Scripts

| Script               | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server on port `3000`.          |
| `npm run build`      | Produce an optimized production build.                |
| `npm run start`      | Serve the production build locally.                   |
| `npm run lint`       | Run ESLint across the web app.                        |
| `npm run docker:up`  | Start PostgreSQL and MinIO via Docker Compose.        |
| `npm run docker:down`| Stop Docker Compose services.                         |
| `npm run db:migrate` | Apply Drizzle database migrations.                    |
| `npm run db:setup`   | Initialize the database schema.                       |
| `npm run db:studio`  | Open Drizzle Studio for database inspection.          |
| `npm run docs:dev`   | Start Mintlify docs on port `3001`.                   |

---

## Architecture

```text
payoes/
├── apps/
│   └── web/                    # Next.js app (marketing, auth, dashboard, API)
│       ├── drizzle/            # SQL migrations
│       ├── public/             # Static assets (logo, favicon)
│       └── src/
│           ├── app/
│           │   ├── (marketing)/   # Public landing page
│           │   ├── (auth)/          # Login, register, email verification
│           │   ├── dashboard/       # Organization workspace
│           │   ├── onboarding/      # Org and wallet setup
│           │   └── api/             # REST routes (v1 + internal)
│           ├── components/          # UI, sidebar, payment flows
│           └── lib/                 # DB schema, auth, Stellar helpers
├── packages/
│   ├── sdk/                    # @payoes/sdk (TypeScript client)
│   ├── ui/                     # Shared UI primitives
│   └── utils/                  # Shared utilities
├── docs/                       # Mintlify developer documentation
├── docker-compose.yml          # PostgreSQL + MinIO for local dev
├── package.json                # npm workspaces root
└── README.md
```

### Routes

| Route group    | Path            | Purpose                                              |
| -------------- | --------------- | ---------------------------------------------------- |
| `(marketing)`  | `/`             | Public landing page                                  |
| `(auth)`       | `/login`, `/register` | Sign in and account creation                   |
| `dashboard`    | `/dashboard/*`  | Payments, customers, developers, and settings        |
| `onboarding`   | `/onboarding/*` | Organization and settlement wallet setup              |
| Public checkout| `/c/[paymentId]`, `/l/[linkId]`, `/i/[invoiceId]` | Hosted payment pages |

### Workspaces

| Package        | Description                                      |
| -------------- | ------------------------------------------------ |
| `apps/web`     | Main Next.js application and API                 |
| `@payoes/sdk`  | Core TypeScript SDK (placeholder, in progress)   |
| `@payoes/ui`   | Shared UI components                             |
| `@payoes/utils`| Shared utility functions                         |

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
<sub>Stellar payment infrastructure for modern businesses · <a href="https://github.com/payoes/payoes">payoes/payoes</a></sub>
</div>
