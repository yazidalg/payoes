# Payoes Agent Instructions

Cross-tool rules for Claude Code, OpenAI Codex, Antigravity, and other AGENTS.md-compatible agents.

## Project

- Monorepo with npm workspaces plus a Go API; main UI is `apps/web` (Next.js)
- Canonical HTTP API is `apps/api` (Go). Legacy Next.js routes under `apps/web/src/app/api` remain in the repo but are unused.
- API docs live in `apps/docs/` (Mintlify)
- Stellar payments platform for organizations

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start web dev server |
| `npm run dev:api` | Start Go API on port 8080 |
| `npm run build` | Build web app |
| `npm run build:api` | Build Go API binary |
| `npm run lint` | Lint web app |
| `npm run db:migrate` | Run database migrations |
| `npm run db:setup` | Set up database |
| `npm run docs:dev` | Start docs dev server |

## Repository layout

- `apps/api`: Go HTTP API (chi). Auth, dashboard APIs, public REST `/api/v1`, checkout, cron, and inbound webhooks. See `apps/api/README.md`.
- `apps/web`: Next.js 16 App Router UI (React 19, Tailwind CSS v4, shadcn/ui). Hosted checkout pages and dashboard. Calls the Go API via `NEXT_PUBLIC_API_URL` and `apiFetch` (`src/lib/api-client.ts`).
- `packages/sdk`: `@payoes/sdk`, currently a placeholder.
- `apps/docs/`: Mintlify API documentation. `apps/docs/CONTEXT.md` describes the product vision and object model.

Run all npm scripts from the repo root. Local infrastructure comes from `docker compose up -d` (or `npm run docker:up`): PostgreSQL on 5432, MinIO on 9000/9001, and the Go `api` service on 8080. Copy `apps/web/.env.example` to `apps/web/.env.local` (and optionally `apps/api/.env`). Set `NEXT_PUBLIC_API_URL=http://localhost:8080`.

Database: Drizzle ORM + PostgreSQL remain the schema source of truth in `apps/web`. The entire schema is one file, `apps/web/src/lib/db/schema.ts`. After changing it, run `npm run db:generate` then `npm run db:migrate`. The Go API uses the same database and does not own migrations.

## Architecture

### Two API surfaces, two auth models (Go)

- `/api/v1/**`: public REST API. Bearer API keys, scopes, and `api_logs` (ported from `apps/web/src/lib/api-keys`).
- Dashboard `/api/organizations/**`, `/api/user`, `/api/session/**`: JWT session cookie `payoes_session` signed with `AUTH_SECRET` (Go auth; NextAuth handlers remain unused).
- `/api/webhooks/**`: inbound Persona / Shopify / WooCommerce webhooks.
- `/api/cron/**`: settlement and webhook retries, protected by `CRON_SECRET`. Point `scripts/cron` `PAYOES_URL` at the Go API.

Legacy TypeScript route handlers and `src/lib` services in `apps/web` are kept for reference and must not be deleted during the migration.

### Environment scoping (sandbox vs production)

Every organization-scoped resource row has both `organizationId` and `environment` (`sandbox` | `production`). This pair is the tenancy boundary: always filter by both, using the helpers in `src/lib/organizations/environment-scope.ts`. API keys are bound to one environment; the dashboard has a mode switcher. `src/lib/stellar/network.ts` maps environments to Stellar networks: sandbox uses Testnet, production uses Mainnet (Horizon URLs and passphrases included).

### Payment object model (Stripe-like)

ID prefixes match Stripe conventions and appear throughout code, docs, and URLs:

- Payments (`pay_...`) are the core record; `source` tracks how they were created (`direct`, `checkout_session`, `payment_link`).
- Checkout sessions (`cs_...`) wrap a payment and get a hosted page at `/c/[paymentId]`.
- Payment links (`plink_...`) are reusable; each visit to `/c/plink_...` spawns a new checkout session.
- Invoices (`inv_...`) go draft -> finalize (spawns a checkout session) -> paid; hosted at `/i/[invoiceId]`.
- Subscriptions (`sub_...`) bill by creating a finalized invoice per period; the period advances when that invoice is paid.

Blockchain specifics are in `src/lib/stellar/` (payment building/verification, trustlines, asset validation, Horizon). Checkout pages connect customer wallets with `@creit.tech/stellar-wallets-kit`; no customer login exists. Webhook delivery to merchant endpoints is in `src/lib/webhooks/delivery.ts`.

### App routes

`src/app/` route groups: `(marketing)` landing page, `(auth)` login/register, `dashboard/` (session-protected, per-organization), `onboarding/`, `invite/[token]` for team invites, and the hosted pages `c/`, `l/`, `i/` (public, no auth).

## Git (this repository)

- **Author name:** Muhammad Bintang Al-Fath
- **Author email:** alfathbintangmuhammad@gmail.com
- Identity is configured in local `.git/config` for this repo only
- Never update the user's global git config
- SSH uses `~/.ssh/id_fradium` via `core.sshCommand` (GitHub account: gavinalinski)
- Remote: `git@github.com:payoesteam/payoes.git`
- Only create commits or push when the user explicitly asks
- Never force-push to `main` unless the user explicitly requests it

## Content standards

### English only

All project-facing content must be written in **English**:

- Documentation, UI copy, code comments, commit messages, PR descriptions
- Script output, log messages, and CLI help text
- Translate any non-English content you touch as part of the change

### No em dash

Do not use the em dash character (`—`) in project-facing text. Use a colon, comma, parentheses, or a new sentence instead.

```markdown
<!-- BAD -->
Every organization must configure a settlement wallet: the Stellar public key that receives payments.
```

## Next.js

This is NOT the Next.js you know. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.

## Code principles

- Minimize scope: use the smallest correct diff
- Match existing naming, types, and patterns in surrounding code
- Avoid over-engineering and unnecessary abstractions
- Add comments only for non-obvious business logic
- Add tests only when requested or when they add meaningful coverage
