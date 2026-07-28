# Local gates

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| Clean install | `npm ci` | 1 | no lockfile initially |
| Clean install (fallback) | remove `node_modules` + `npm install` | 0 | generated `package-lock.json` |
| Lint | `npm run lint` | 0 | warnings only |
| Format (changed files) | `npx prettier --check <remediation files>` | 0 | |
| Format (repo-wide) | `npm run format:check` | 1 | 151 pre-existing FORMATTING NOISE — not mass-fixed |
| Typecheck | `npm run typecheck` | 0 | |
| Unit tests | `npm test` | 0 | 19 files / 57 tests |
| Env dry-run production | `npx tsx scripts/env-config-dry-run.mjs production` | 0 | |
| Env dry-run preview | `npx tsx scripts/env-config-dry-run.mjs preview` | 0 | |
| Build | `npm run build` | 0 | |
| Staging RC3 smoke | `npm run test:staging-rc3-smoke` | 0 | 55/55 |

No `|| true`. No secret values in logs.
