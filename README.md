# Payoes

Monorepo for Payoes — Stellar payment SDK and web application.

## Structure

```
payoes/
├── apps/
│   └── web/                    # Landing page + dashboard (Next.js + shadcn/ui)
│       ├── components.json     # shadcn configuration
│       └── src/
│           ├── app/
│           │   ├── (marketing)/   # Landing page
│           │   └── dashboard/       # shadcn sidebar-07 dashboard
│           └── components/        # shadcn UI + app-sidebar, nav-*, team-switcher
├── packages/
│   └── sdk/                    # Payoes SDK (TypeScript)
└── package.json                # Workspace root
```

## Getting Started

Install dependencies from the root:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

- [http://localhost:3000](http://localhost:3000) — landing page
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard) — shadcn dashboard

## shadcn/ui

Dashboard is built with [shadcn/ui](https://ui.shadcn.com) (`sidebar-07` block).

```bash
cd apps/web
npx shadcn@latest add <component>
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server for `apps/web` |
| `npm run build` | Production build for `apps/web` |
| `npm run start` | Start production server |
| `npm run lint` | Lint `apps/web` |

## Workspaces

- **`apps/web`** — Next.js 16, Tailwind CSS v4, shadcn/ui (base-nova)
- **`packages/sdk`** — core SDK (`@payoes/sdk`), currently a placeholder
