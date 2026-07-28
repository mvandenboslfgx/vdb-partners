# RC3 Partner Controlled Production Deploy Retry — Baseline Preflight

**Gate:** `RC3 PARTNER PORTAL CONTROLLED PRODUCTION DEPLOYMENT RETRY`  
**UTC:** 2026-07-28  
**Prior foundation verdict (retained):** `PARTNER PRODUCTION FOUNDATION REMEDIATION BLOCKED`

## Audit trail — unauthorized production deploys (retained)

| Deployment | Status |
|------------|--------|
| `dpl_89LifDpagWzN94c23hxwBri8HAKR` | Created unintentionally; **deleted**; not findable now |
| `dpl_A6nJWs7qFRHWDxrNBKcyTWpqFm1g` | Created unintentionally; **deleted**; not findable now |
| `partners.vdbdigital.nl` alias | Removed after each; **not active** now |
| DNS | Remained **NXDOMAIN**; no DNS mutation in foundation gate |

These events remain in the audit trail and are **not** described as never having happened.

## Snapshot

| Item | Value |
|------|-------|
| Path | `C:\Users\XXX\vdb-partners` |
| Branch | `main` |
| HEAD (main) | `a0fbe2214fe85bc6317f719f3e52baffe759b5c4` |
| Tag `partner-rc3-production-ready` | `0a6ec90e260f8070708dfce4249368d0d02160b4` |
| Tag `rc3-cross-repository-release-candidate` | `a380db26d6fb4426e2a8bc46e9c8d94388766690` (unchanged) |
| Working tree | clean |
| Remote | `origin/main` in sync (0/0 divergence) |
| Contract | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` |
| Vercel project | `vdb-partners` / `prj_o5KSI7m7TldChUDpL0SgmdEl0pdq` |
| Ready production deployment | **none** |
| Active `partners.vdbdigital.nl` alias | **none** |
| DNS `partners.vdbdigital.nl` | **NXDOMAIN** |
| Preview | `dpl_Cy1j1Vg9RzjuWWk4noPqQe7TVP3F` Ready; health 200 |
| Git production builds | Canceled by `ignoreCommand` (e.g. `dpl` qb9e9owak) |
| Vault | `C:\Users\XXX\.vdb-vault\partner-production-auth-smoke.env` present; ACL user+(SYSTEM); outside Git |
| Vault Supabase host | `nhsrdnjfsxfikfbdmdfj.supabase.co` |

## HEAD vs release tag

`main` is **2 commits ahead** of `partner-rc3-production-ready`:

1. `1b5738e` — vercel.json ignoreCommand (project-level already applied)
2. `a0fbe22` — foundation evidence / BLOCKED verdict docs

**Deploy source for this gate:** immutable tag `partner-rc3-production-ready` → `0a6ec90…` (checkout detached for deploy). Not `main` HEAD.

## Env presence (names only)

Production / Preview / Development keys present (encrypted). Production intended ref `nhsrdnjfsxfikfbdmdfj`; Preview (`partner-rc3-preview`) intended ref `qzekuvmgfekzsowdecyk`. Runtime verification after intentional prod deploy.

## Stop-condition evaluation

| Condition | Result |
|-----------|--------|
| Unexpected Ready production / active partners alias | clear |
| Unauthorized deploys still present | clear (deleted) |
| DNS already live | clear (NXDOMAIN) |
| Dirty release tree | clear |
| Tag ≠ main HEAD | expected — deploy from tag only |
| Feature flags unexpectedly on | fail-closed env names present as `false` |

**Preflight: CONTINUE** — intentional single prod deploy from tag with `--skip-domain`.
