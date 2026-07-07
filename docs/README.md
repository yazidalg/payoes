# Payoes documentation

Mintlify-powered developer documentation for the Payoes API.

## Structure

```
docs/
├── docs.json              # Site entry point (theme, branding)
├── config/
│   └── navigation.json    # Sidebar structure (tabs + groups)
├── openapi/
│   └── v1.yaml            # API contract (single source of truth)
├── guides/                # Conceptual and how-to content
├── api-reference/         # Hand-written API overview pages
├── snippets/              # Reusable MDX snippets
└── images/                # Logo and favicon assets
```

Configuration is split so `docs.json` stays small and navigation/OpenAPI settings can evolve independently.

## Local preview

From the repository root:

```bash
npm run docs:dev
```

Or from this directory:

```bash
npx mintlify@latest dev
```

Install the CLI globally (optional):

```bash
npm i -g mintlify
mintlify dev
```

## Deploy to Mintlify

1. Sign up at [dashboard.mintlify.com](https://dashboard.mintlify.com)
2. Connect the `payoes` GitHub repository
3. Enable **monorepo** mode with path `/docs`
4. Add custom domain (e.g. `docs.payoes.com`) in Mintlify dashboard
5. Set `NEXT_PUBLIC_DOCS_URL` in the web app to the docs URL

## Updating the API reference

Edit `openapi/v1.yaml` when adding or changing `/api/v1` endpoints. Mintlify auto-generates endpoint pages from the OpenAPI spec linked in `config/navigation.json`.
