# RC3 Partner Portal — Release Preflight

**Timestamp:** 2026-07-28  
**Gate:** `RC3 PARTNER PORTAL PRODUCTION DEPLOYMENT`  
**Verdict at preflight:** **BLOCKED** (no push/deploy performed)

## Identity

| Field | Value |
|-------|-------|
| Repository path | `C:\Users\XXX\vdb-partners` |
| Branch | `main` |
| Full HEAD | `a380db26d6fb4426e2a8bc46e9c8d94388766690` |
| Annotated tag | `rc3-cross-repository-release-candidate` |
| Tag object | `7e95bb1ad4a56d909134e5222bc17bc266d80113` |
| Tag target (peeled) | `a380db26d6fb4426e2a8bc46e9c8d94388766690` (**matches HEAD**) |
| Working tree | clean (`porcelain` count = 0) |
| Unstaged / untracked | none |
| Known formatting/noise | none observed |

## Remote divergence

| Field | Value |
|-------|-------|
| Remote | `https://github.com/mvandenboslfgx/vdb-partners.git` |
| `git ls-remote --heads origin` | **0 refs** |
| `git ls-remote --tags origin` | **0 refs** |
| Local tracking | `main...origin/main [gone]` |
| Assessment | **UNCLEAR / EMPTY REMOTE** — STOP criterion |

No push executed.

## Contract / schema / production backend

| Field | Value |
|-------|-------|
| Contract | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` |
| Production Supabase ref | `nhsrdnjfsxfikfbdmdfj` |
| DB migration count (prod) | **48** |
| Tip (prod) | **`20260728090100`** |
| Feature flags (prod DB) | all listed keys **false** (fail-closed) |

## Deployment platform

| Field | Value |
|-------|-------|
| Platform | Vercel (expected; Owner already on Vercel) |
| Team | `matthijs-projects-301cd812` |
| Existing projects | `vdbdigital2-0` only (Owner) |
| Partner project | **MISSING** |
| Expected production URL | `https://partners.vdbdigital.nl` (README) |
| Domain on Vercel team | **`partners.vdbdigital.nl` not present** |
| DNS | resolve **failed** / no usable record observed |

No Partner production deployment target exists.

## Environment variables (names + presence only)

### Required by Partner `getEnv()` when `VERCEL_ENV=production`

| Name | Required in prod | Present on Partner Vercel project |
|------|------------------|-----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | **N/A — no Partner project** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | N/A |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | N/A |
| `ENCRYPTION_KEY` | yes | N/A |

### Documented / used names (presence on deploy target unknown)

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAIN_SITE_URL`, `MAIN_SITE_URL`, `BASE_URL`, `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `IDENTITY_PROVIDER`, `IDENTITY_PROVIDER_API_KEY`, `CRON_SECRET`, `SENTRY_DSN`, `FORCE_ENV_VALIDATION`, `EMAILS_REQUIRED`, plus legacy env flag names: `seller_registration_enabled`, `identity_verification_enabled`, `mollie_payments_enabled`, `manual_bank_payments_enabled`, `cash_payouts_enabled`, `bank_payouts_enabled`, `marketing_library_enabled`, `support_enabled`, `international_registration_enabled`.

Local `.env.local` points at **localhost:54421** only (no staging/prod ref). Values not printed.

## Feature flags (DB + expected fail-closed)

| Flag | Production DB `enabled` | Deploy expectation |
|------|-------------------------|--------------------|
| Checkout (`mollie_checkout` / `digital_product_checkout` / `payments.*`) | **false** | remain fail-closed |
| Mollie Live | **false** (`mollie_checkout`, `payments.mollie_checkout`) | remain fail-closed |
| Payout execution (`partner_payouts`, `partner.payouts`) | **false** | remain fail-closed |
| Messaging realtime (`messaging_realtime`) | **false** | remain fail-closed |
| Support internal notes (`support_internal_notes_rpc`) | **false** | remain fail-closed |
| Appointments booking (`appointments_booking`) | **false** | remain fail-closed |

## Hard STOP reasons (preflight)

1. **Production Supabase denylist in this exact RC** — `assertNotProductionSupabaseUrl` in `middleware.ts`, `lib/env.ts`, `lib/auth/session.ts`, `app/actions/auth.ts` rejects `nhsrdnjfsxfikfbdmdfj`. Pointing production env at the authorized backend would refuse auth/runtime.
2. **Empty / unclear remote** — zero heads and tags on `origin`; cannot safely update a production branch.
3. **No Partner Vercel project / domain / DNS** — nowhere to deploy `partners.vdbdigital.nl`.
4. **Missing production Partner env** — no project to hold required secrets.

## Runtime object control (static, pre-deploy)

### Identity / routing (canonical — used)

- `admin_roles`, `partner_profiles`, `organization_members` via `lib/auth/identity.ts`

### Partner domain (canonical loaders)

- `partner_profiles`, `partner_codes`, `partner_leads`, `partner_sales`, `partner_commissions`, `partner_payouts`, RPCs `partner_financial_summary`, `partner_available_liability_cents`

### RC3 portal domain (canonical)

- `portal_conversations`, `portal_messages`, `portal_conversation_participants`, `portal_message_attachments`, `portal_support_tickets`, `portal_appointments`

### Legacy

- `user_roles` / `seller_profiles` appear in local-legacy / tests / gated actions; production remote use is blocked by denylist + `assertLocalLegacySellerDomainAllowed`. Auth path does not query them.

## Production account inventory (read-only)

| Role slot | Usable for Partner smoke? | Notes (no PII) |
|-----------|---------------------------|----------------|
| Active partner A | **NO** | `partner_profiles` = **0** |
| Active partner B | **NO** | `partner_profiles` = **0** |
| Pending partner | **NO** | `partner_profiles` = **0** |
| Customer | conditional | `organization_members` = 2 (Owner smoke synth); credentials only if vault has them |
| Staff | conditional | `admin_roles` present (SUPPORT-class from Owner smoke) |
| Admin | conditional | `admin_roles` present |
| Owner | conditional | existing + Owner smoke |
| Anon | N/A | no credentials |

Auth users (prod): **9** (includes Owner website smoke synthetics).  
Partner leads/sales: **0**. Portal conversations: **1** (unrelated to partner fixtures).

Synthetic Partner bootstrap (`prod-smoke-partner-a/b/pending`) **not started** — requires deploy target + denylist resolution first.

## Actions not taken

- No git push
- No merge
- No Vercel deploy
- No database migrations / SQL
- No Mobile changes
- No synthetic partner account creation
- No cleanup

## Required unblocks (separate authorization)

1. Explicit decision to **lift or bypass** production denylist for Partner production runtime (code change beyond exact RC as currently written, or a new tagged build).
2. Create / designate **Vercel Partner production project**, env (prod ref only), domain `partners.vdbdigital.nl` (+ DNS).
3. Clarify **Git remote**: recreate `main` (and tag) on origin, or document alternate production branch remote.
4. After deploy: authorize synthetic partner bootstrap + authenticated smoke.
