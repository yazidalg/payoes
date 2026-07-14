---
trigger: always_on
description: All project content must be written in English
---

# English Only

All project-facing content must be written in **English**. This applies to everything committed to or generated for the repository.

## In scope

- Documentation (`README.md`, `apps/docs/**`, `AGENTS.md`, comments in markdown)
- UI copy (labels, headings, buttons, placeholders, error messages)
- Code comments and JSDoc/TSDoc
- Commit messages and PR descriptions
- Script output, log messages, and CLI help text
- Variable names, function names, and API field names (already English by convention)
- Test descriptions and fixture text

## Out of scope

- Third-party dependencies and generated vendor files

## Examples

```tsx
// BAD
<h1>Dashboard</h1>
<p>Espace de travail pour gérer les portefeuilles</p>

// GOOD
<h1>Dashboard</h1>
<p>Workspace for managing wallets and transactions</p>
```

## When editing existing non-English content

Translate it to English as part of the change. Do not mix languages within the same file.
