# RC3 Partner Portal Production Deployment — Release Preflight

**UTC:** 2026-07-28  
**Repository:** `C:\Users\XXX\vdb-partners`  
**Authorized scope:** `RC3 PARTNER PORTAL PRODUCTION DEPLOYMENT`  
**Prerequisite claimed:** `RC3 OWNER WEBSITE PRODUCTION DEPLOYMENT PASS`

## Eindverdict (deze gate)

```text
RC3 PARTNER PORTAL PRODUCTION DEPLOYMENT BLOCKED
```

No push, merge, Vercel deploy, database mutation, Mobile change, or synthetic account creation was executed.

---

## 1. Releasepreflight matrix

| Item | Value | Status |
|------|-------|--------|
| Repository path | `C:\Users\XXX\vdb-partners` | OK |
| Branch | `main` | OK |
| Full HEAD | `a380db26d6fb4426e2a8bc46e9c8d94388766690` | OK (matches required RC) |
| Annotated tag | `rc3-cross-repository-release-candidate` → `a380db26…` (tag object `7e95bb1…`) | OK |
| Working tree | Clean for release code; untracked `docs/evidence/prod-promotion/` only | OK (evidence noise) |
| Unstaged/untracked | Evidence folder only | OK |
| Formatting/noise | None on release files | OK |
| Remote | `https://github.com/mvandenboslfgx/vdb-partners.git` | **BLOCKER** |
| Remote refs | **0 heads/tags on origin** (`git ls-remote` empty; `origin/main` **gone**) | **BLOCKER** |
| Dry-run push | Would create **new** `main` on empty remote | Not executed |
| Contract | `vdb-backend-contract@0.2.0-rc.3` | OK |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` | OK |
| Production Supabase ref (authorized DB) | `nhsrdnjfsxfikfbdmdfj` (48 / `20260728090100` per operator) | DB out of scope |
| Deployment platform | Vercel (Owner uses `vdbdigital2-0` → `https://vdbdigital.nl`) | Partial |
| Partner deployment project | **Not found** under team `matthijs-projects-301cd812` | **BLOCKER** |
| Partner productie-URL | Not established (no Vercel project / domain mapping in this repo) | **BLOCKER** |
| `.vercel/project.json` | Absent | **BLOCKER** |
| `gh` auth | Not logged in | Warning (git HTTPS dry-run still OK) |

### Required env vars (names only — presence on Partner production project)

| Name | Present on Partner prod project? |
|------|----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Unknown / no project** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Unknown / no project** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Unknown / no project** |
| `BACKEND_CONTRACT_VERSION` / `VDB_BACKEND_CONTRACT` | **Unknown / no project** |
| `VDB_SCHEMA_VERSION` | **Unknown / no project** |
| `ENCRYPTION_KEY` | **Unknown / no project** |
| `APP_ENV` / `VERCEL_ENV` | **Unknown / no project** |

### Feature flags (expected fail-closed on production DB)

| Flag | Expected | Verified against Partner runtime? |
|------|----------|-----------------------------------|
| checkout | disabled | Not verified via Partner deploy (no project) |
| Mollie | disabled | Not verified |
| payout execution / `partner_payouts` | false | Not verified |
| messaging realtime | false | Not verified |
| support internal notes | false | Not verified |
| appointments booking | false | Not verified |

Owner website prior gate reported these fail-closed; Partner gate did not re-mutate DB.

---

## 2. Runtime-objectcontrole (source at RC HEAD)

### Identity / routing (PASS in source)

Uses: `admin_roles`, `partner_profiles`, `organization_members`  
Auth/session/destination: no runtime `user_roles` / `seller_profiles` queries.

### Partner domain (PASS in source)

`partner_profiles`, `partner_codes`, `partner_leads`, `partner_sales`, `partner_commissions`, `partner_payouts`, `partner_ledger_entries`, RPCs `partner_available_liability_cents` (+ `partner_financial_summary` with liability fallback).

### RC3 domain (PASS in source)

`portal_conversations`, `portal_messages`, `portal_message_attachments`, `portal_support_tickets`, `portal_support_replies`, `portal_appointments`.

### Hard runtime blocker on this exact RC

`lib/contract/env.ts` → `assertNotProductionSupabaseUrl()` **denylists** `nhsrdnjfsxfikfbdmdfj`.  
Called from `lib/auth/session.ts`, `lib/env.ts`, auth path.  
Deploying **exact** `a380db26` with production Supabase URL would fail authenticated session/routing.

`contracts/.../pin.json` still lists production under `productionProjectRefDenylist`.

---

## 3. Git / deployment — not executed

| Action | Status |
|--------|--------|
| Push | **Not executed** (empty remote + no Partner Vercel project + production denylist) |
| Merge | Not executed |
| Vercel production deploy | Not executed |
| Database migrations | Not executed |
| Mobile | Not touched |

Vercel team projects observed: `vdbdigital2-0` (Owner), `vdb-digital-staging`, unrelated apps. **No `vdb-partners` / partners portal project.**

---

## 4. Productieaccountinventarisatie

| Need | Result |
|------|--------|
| Vault path required | `C:\Users\XXX\.vdb-vault\partner-production-auth-smoke.env` |
| File present | **NO** |
| Vault contents present | Owner prod smoke + mobile staging + DB readonly tokens only |
| Active partner A/B / pending credentials | **Not inventarisable** without creating vault (not done) |
| Secrets printed | None |

---

## 5–10. Bootstrap / smoke / monitoring / rollback

Not started — blocked at preflight.

---

## Hard stop reasons (must clear before retry)

1. **No existing Partner Portal production deployment project** on Vercel (cannot use “bestaande productieomgeving”).
2. **GitHub `origin` has zero refs** — first push would bootstrap remote; allowed only with clear deploy target.
3. **Exact RC `a380db26` hard-denylists production Supabase ref** — production login would be blocked by design.
4. **Missing** `partner-production-auth-smoke.env` for authenticated production smoke.
5. **Unknown Partner production URL / env var presence.**

## Allowed next steps (require new authorization / ops)

- Create or identify Partner Vercel project + domain (e.g. `partners.vdbdigital.nl`).
- Configure production env (names above) pointing at `nhsrdnjfsxfikfbdmdfj` only.
- Ship a **new** commit (not silent rewrite of RC) that allows intentional production runtime while keeping accidental staging→prod mistakes fail-closed.
- Retag or authorize deploy of that production-ready commit.
- Provide/create vault `partner-production-auth-smoke.env` (ACL local user + SYSTEM).
- Then re-run this gate from preflight.
