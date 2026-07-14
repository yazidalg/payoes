---
trigger: always_on
description: Git author identity and SSH settings for this repository
---

# Git Identity (Payoes)

Use these settings for all git operations in this repository.

## Author

- **Name:** Muhammad Bintang Al-Fath
- **Email:** alfathbintangmuhammad@gmail.com

## Rules

- Identity is set in local `.git/config` only; never change global git config
- SSH uses `~/.ssh/payoes_rsa` via `core.sshCommand` (GitHub account: payoesdev)
- Remote: `git@github.com:payoes/payoes.git`
- Only create commits or push when the user explicitly asks
- Never force-push to `main` unless the user explicitly requests it
