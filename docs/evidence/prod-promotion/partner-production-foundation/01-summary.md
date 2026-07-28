# Partner Production Foundation — Evidence Pack

**Gate:** `PARTNER PRODUCTION FOUNDATION AND ENVIRONMENT REMEDIATION`  
**Verdict target:** PASS with **PRODUCTION DEPLOYMENT NOT AUTHORIZED**  
**UTC date:** 2026-07-28

## 1. Preflight (before remediation)

See `00-preflight.md`.

| Item | Value |
|------|-------|
| Repository | `C:\Users\XXX\vdb-partners` |
| Branch | `main` |
| HEAD (start) | `a380db26d6fb4426e2a8bc46e9c8d94388766690` |
| Local tag | `rc3-cross-repository-release-candidate` → `a380db26…` |
| Contract | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` |
| Remote | `https://github.com/mvandenboslfgx/vdb-partners.git` |
| Remote refs (start) | **0** |
| Production Supabase | `nhsrdnjfsxfikfbdmdfj` |
| Staging Supabase | `qzekuvmgfekzsowdecyk` |
| Canonical URL | `https://partners.vdbdigital.nl` |
| DNS (start) | NXDOMAIN for subdomain; parent NS `nsn1/nsn2.mijndomein.nl` |

### Dirty classification (at gate start + remediation)

| Path | Class |
|------|-------|
| Environment guard + callers + tests | REQUIRED |
| `contracts/.../pin.json` productionProjectRef | REQUIRED |
| `.env.*.local.example`, `.gitignore` | REQUIRED |
| `scripts/env-config-dry-run.mjs` | REQUIRED |
| `package.json` dry-run scripts | REQUIRED |
| `package-lock.json` | GENERATED — include for reproducible install |
| `docs/evidence/prod-promotion/**` | EVIDENCE |
| `next-env.d.ts` (build churn) | GENERATED — EXCLUDE (reverted) |
| `.env.local` | UNRELATED — EXCLUDE (gitignored; contains local secrets) |
| Vault under `C:\Users\XXX\.vdb-vault\` | OUTSIDE GIT |

## 2. Environment guard remediation

Replaced generic production denylist with fail-closed `assertExpectedSupabaseEnvironment`:

- production → must be `nhsrdnjfsxfikfbdmdfj`
- preview/staging → must be `qzekuvmgfekzsowdecyk`; production hard-refused
- development → local or staging only; production refused
- missing/unknown environment → block
- no silent fallback; no secrets in errors

Runtime entrypoint: `assertPartnerSupabaseEnvironment`.  
Deprecated wrapper: `assertNotProductionSupabaseUrl` (= development refuse-prod).

## 3. Local gates (commands / exit codes)

| Gate | Command | Exit |
|------|---------|------|
| Clean install | `npm ci` | **1** (no lockfile at start) → `npm install` after `rm node_modules` **0**; lockfile generated |
| Lint | `npm run lint` | **0** (warnings only; 0 errors) |
| Format (scoped changed files) | `npx prettier --check <changed>` | **0** |
| Format (repo-wide) | `npm run format:check` | **1** (151 pre-existing; FORMATTING NOISE — not mass-fixed) |
| Typecheck | `npm run typecheck` / `npx tsc --noEmit` | **0** |
| Unit tests | `npm test` | **0** — 19 files / **57** tests |
| Env dry-run production | `npx tsx scripts/env-config-dry-run.mjs production` | **0** |
| Env dry-run preview | `npx tsx scripts/env-config-dry-run.mjs preview` | **0** |
| Build | `npm run build` | **0** |
| Secret scan | pattern scan on tree | hits only in gitignored `.env.local` + placeholder example names — no committed secrets |

## 4. Production deploy status

**NOT AUTHORIZED.** Accidental CLI production deployments were created then **deleted**; `partners.vdbdigital.nl` alias removed; DNS never pointed (NXDOMAIN). See `99-verdict.md`.

## 5. Final verdict

`PARTNER PRODUCTION FOUNDATION REMEDIATION BLOCKED`
