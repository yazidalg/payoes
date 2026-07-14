# Payoes Agent Instructions

Cross-tool rules for Claude Code, OpenAI Codex, Antigravity, and other AGENTS.md-compatible agents.

## Project

- Monorepo with npm workspaces; main app is `apps/web` (Next.js)
- API docs live in `docs/` (Mintlify)
- Stellar payments platform for organizations

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start web dev server |
| `npm run build` | Build web app |
| `npm run lint` | Lint web app |
| `npm run db:migrate` | Run database migrations |
| `npm run db:setup` | Set up database |
| `npm run docs:dev` | Start docs dev server |

## Repository layout

- `apps/web`: the entire application (Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui). Dashboard, hosted checkout, and the public REST API all live here.
- `packages/sdk`: `@payoes/sdk`, currently a placeholder.
- `docs/`: Mintlify API documentation. `docs/CONTEXT.md` describes the product vision and object model.

Run all npm scripts from the repo root. Local infrastructure comes from `docker compose up -d` (or `npm run docker:up`): PostgreSQL on 5432 and MinIO (S3-compatible storage) on 9000/9001. Copy `apps/web/.env.example` to `apps/web/.env` for configuration. There is no test suite.

Database: Drizzle ORM + PostgreSQL. The entire schema is one file, `apps/web/src/lib/db/schema.ts`. After changing it, run `npm run db:generate` (creates SQL in `apps/web/drizzle/`) then `npm run db:migrate`. `npm run db:studio` opens Drizzle Studio.

## Architecture

### Two API surfaces, two auth models

- `src/app/api/v1/**`: the public REST API. Authenticated with Bearer API keys via `withApiKeyAuth` (`src/lib/api-keys/auth.ts`), which also logs every request to `api_logs`. The authenticated `apiKey` carries `organizationId` and `environment`; handlers pass both into services.
- `src/app/api/**` (everything outside `v1/` and `webhooks/`): internal endpoints for the dashboard UI, authenticated with the Auth.js session (NextAuth v5; config in `src/auth.ts` and `src/auth.config.ts`, route protection in `src/middleware.ts`, session helpers in `src/lib/auth/`).
- `src/app/api/webhooks/persona/`: inbound Persona KYC webhooks.

Route handlers stay thin: validate with zod, then call a service. Domain logic lives in `src/lib/<domain>/service.ts` (payments, invoices, subscriptions, customers, webhooks, api-keys, organizations, ...). The dashboard and the v1 API share these services; per the project's API-driven principle, dashboard-only capabilities should not exist.

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

- **Author name:** Payoes
- **Author email:** alfathbintangmuhammad@gmail.com
- Identity is configured in local `.git/config` for this repo only
- Never update the user's global git config
- SSH uses `~/.ssh/payoes_rsa` via `core.sshCommand` (GitHub account: payoesdev)
- Remote: `git@github.com:payoes/payoes.git`
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
