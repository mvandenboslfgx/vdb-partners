# BASELINE — Partners RC5 Integration

- **UTC:** 2026-07-29
- **Repository:** `C:\Users\XXX\vdb-partners`
- **Branch:** `preview/catalog-safe-release`
- **HEAD:** `41553c13c1a577b72c89092a211d93be85792f10`
- **Package manager:** docs/scripts prefer **pnpm**; lockfiles present: `pnpm-lock.yaml` + `package-lock.json` (no `packageManager` field)
- **Pre-integration contract pin:** `vdb-backend-contract@0.2.0-rc.3` / `2026.07.25.messaging-support-appointments-rc3`
- **Post-integration contract pin:** `vdb-backend-contract@0.2.0-rc.5` / `2026.07.29.partner-identity-directory-rc5`
- **Staging ref:** `qzekuvmgfekzsowdecyk`
- **Production ref (untouched):** `nhsrdnjfsxfikfbdmdfj`

## Working tree classification (at gate start)

| Path                                                      | Class                                       |
| --------------------------------------------------------- | ------------------------------------------- |
| `docs/evidence/prod-promotion/rc3-partner-deploy-retry/*` | evidence (pre-existing RC3 promotion retry) |
| `lib/auth/session.ts`                                     | pre-existing phantom dirty (hash == HEAD)   |
| `lib/env.ts`                                              | pre-existing phantom dirty (hash == HEAD)   |
| `next-env.d.ts`                                           | generated                                   |
| RC5 contract/code/tests/evidence under this gate          | RC5-integratie                              |
| Unrelated sibling WIP                                     | none overwritten                            |

## Baseline surfaces (pre-change)

- **Env guards:** `lib/contract/env.ts` fail-closed staging/prod refs
- **Onboarding routes:** `/register`, `/onboarding`, `/dashboard`, `/geen-toegang`
- **`sellerOnboardingSchema`:** companyName + 8-digit KvK always required (pre-RC5)
- **Partner types:** local `particular` / `sole_trader` / `company` only
- **Status mapping:** ACTIVE→partner, PENDING→partner_pending, SUSPENDED/REVOKED→blocked
- **Catalog/lead RPCs:** `list_partner_catalog`, `create_partner_lead`
- **Support:** `is_internal=false` filter; internal-note RPC fail-closed
- **Feature flags:** portal env flags + RC3 fail-closed set
- **Deploy status (read-only):** Vercel MCP list_deployments → 403; prior evidence shows `partners.vdbdigital.nl` on RC3 preview/prod foundation — **no alias/deploy changes in this gate**

## Owner handoff read

- `PARTNERS_PORTAL_PARTNER_TYPE_HANDOFF.md` (read successfully)
- Domain/activation/legal docs were listed by workspace glob; shell path access to that Owner docs folder was intermittent — contract bundle + handoff used as SSOT
