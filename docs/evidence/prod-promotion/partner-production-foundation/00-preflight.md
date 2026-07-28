# Partner Production Foundation — Preflight

**UTC:** 2026-07-28  
**Gate:** `PARTNER PRODUCTION FOUNDATION AND ENVIRONMENT REMEDIATION`  
**Production deployment:** NOT AUTHORIZED in this gate

## Snapshot

| Item | Value |
|------|-------|
| Path | `C:\Users\XXX\vdb-partners` |
| Branch | `main` |
| HEAD | `a380db26d6fb4426e2a8bc46e9c8d94388766690` |
| Tag | `rc3-cross-repository-release-candidate` → `a380db26…` |
| Contract | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` |
| Remote | `https://github.com/mvandenboslfgx/vdb-partners.git` |
| Remote refs | **0** |
| Vercel project | none |
| Domain `partners.vdbdigital.nl` | NXDOMAIN |
| Partner smoke vault | missing |
| Owner prod smoke vault | present (key names only inventoried) |

## Dirty tree classification

| Path | Class |
|------|-------|
| `docs/evidence/prod-promotion/**` | EVIDENCE — keep, no secrets |

## `assertNotProductionSupabaseUrl` callers (pre-remediation)

| File | Role |
|------|------|
| `lib/contract/env.ts` | definition + `assertStagingSupabaseUrl` / `describeRuntimeEnvironment` |
| `middleware.ts` | every protected request |
| `lib/env.ts` | `getEnv()` |
| `lib/auth/session.ts` | session + profile |
| `app/actions/auth.ts` | sign-in / register / reset / destination |
| `lib/contract/local-legacy.ts` | seller_* remote gate |
| `tests/unit/contract-pin.test.ts` | denylist expectations |

## Production flags (target fail-closed)

checkout, Mollie Live, payout execution, messaging realtime, support internal notes, appointments booking — all disabled.
