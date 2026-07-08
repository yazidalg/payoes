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
Every organization must configure a receiving wallet — the Stellar public key that receives payments.

<!-- GOOD -->
Every organization must configure a receiving wallet: the Stellar public key that receives payments.
```

## Next.js

This is NOT the Next.js you know. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.

## Code principles

- Minimize scope: use the smallest correct diff
- Match existing naming, types, and patterns in surrounding code
- Avoid over-engineering and unnecessary abstractions
- Add comments only for non-obvious business logic
- Add tests only when requested or when they add meaningful coverage
