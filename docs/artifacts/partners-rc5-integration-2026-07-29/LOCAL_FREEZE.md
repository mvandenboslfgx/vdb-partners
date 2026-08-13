# LOCAL_FREEZE

## Intent

Scoped **local-only** commit of Partners RC5 integration after staging PASS.

## Policy

- Commit: yes (local)
- Push: **no**
- Tag: **no**
- Deploy / alias / production: **no**
- Public onboarding: **not opened**
- Owner / Mobile repos: untouched
- Vault / credentials: not in Git

## Canonical evidence path

`docs/artifacts/partners-rc5-integration-2026-07-29/`

Duplicate `docs/evidence/partners-rc5-integration-2026-07-29/` left untracked (not committed).

## Package manager

- Scripts use npm/`npx` conventions.
- Both `package-lock.json` and `pnpm-lock.yaml` remain (dual-lockfile drift recorded as open blocker).
- No lockfile changes in this freeze.
