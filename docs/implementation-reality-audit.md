# Implementation Reality Audit — VDB Partner Portal

**Laatste verificatie:** 2026-07-21  
**Eindstatus:**

```text
VDB PARTNER PORTAL LOCAL AUTHORIZATION PASS
PRODUCTION NOT ACTIVATED
EXTERNAL PROVIDERS NOT ACTIVATED
FULL BUSINESS DB FLOW VALIDATED LOCALLY
UI BUSINESS FLOW VALIDATED IN BROWSER
JWT RLS MATRIX VALIDATED LOCALLY
MFA PROVIDERS EXPORTS PRODUCTION STILL OPEN
```

Statuslegenda: `REAL AND TESTED` | `REAL BUT NOT FULLY TESTED` | `IMPLEMENTED WITH MOCK PROVIDER` | `PARTIALLY IMPLEMENTED` | `DOCUMENTED ONLY` | `NOT IMPLEMENTED` | `BLOCKED`

## Canonical local Supabase stack

Verified with `npx supabase status` and `docker ps`. Containers: `supabase_*_vdb-partners`.

| Service | Active endpoint |
|---------|-----------------|
| API | `http://127.0.0.1:54421` |
| Database | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio | `http://127.0.0.1:54423` |
| Mailpit | `http://127.0.0.1:54424` |

Source of truth: `supabase/config.toml` + `.env.local` (gitignored) + `.env.example`.

| Onderdeel | Status | Bewijs / notitie |
|-----------|--------|------------------|
| Authenticatie (e-mail/wachtwoord flows) | PARTIALLY IMPLEMENTED | Auth pages + SSR helpers; fixture users via Auth Admin API in DB tests |
| MFA voor admins | PARTIALLY IMPLEMENTED | Niet afgedwongen in middleware |
| Seller onboarding | REAL AND TESTED | DB flow: particular + bank/cash → pending_review |
| Identity verification | IMPLEMENTED WITH MOCK PROVIDER | manual_review path in DB flow |
| Agreement signing | REAL AND TESTED | Acceptance row in DB flow |
| Seller approval | REAL AND TESTED | Owner approve in DB flow |
| Product catalog | REAL BUT NOT FULLY TESTED | Seed products used by order creation |
| Order flow | REAL AND TESTED | submitted → awaiting_payment → payment_verified → delivered |
| Mollie | IMPLEMENTED WITH MOCK PROVIDER / BLOCKED live | Niet gebruikt in DB flow; manual bank path getest |
| Manual bank payment | REAL AND TESTED | Finance confirms paid+verified_at |
| Commission engine | REAL AND TESTED | Unit + DB create/release with hold_days=0 |
| Ledger | REAL AND TESTED | Balanced payout entries in DB flow; append-only triggers |
| Payout batches | REAL AND TESTED | Bank batch/items/paid |
| Bank payout logging | REAL AND TESTED | Paid payout + ledger |
| Cash payout | REAL AND TESTED | confirmed_received + cash_receipts row |
| Refund after payout | REAL AND TESTED | Old payout remains paid; compensating adjustment + ledger; re-payout blocked |
| PDF receipt | REAL BUT NOT FULLY TESTED | Generator aanwezig; niet in DB assert |
| RLS | REAL AND TESTED | Live JWT matrix: `authenticated-rls-matrix.test.ts` (20) + migration `20260721000004` |
| Reports / exports | PARTIALLY IMPLEMENTED | UI shell |
| Email (Resend) | IMPLEMENTED WITH MOCK PROVIDER | Niet geactiveerd |
| E2E smoke (Playwright) | REAL AND TESTED | Home/login/register |
| Full UI business E2E | REAL AND TESTED | `tests/e2e/business-flow.spec.ts`: onboarding → approve → sale → local settlement → commission zichtbaar |
| JWT/RLS matrix | REAL AND TESTED | Anon + access token; seller isolation; pending/suspended/blocked; admin negatives |
| Deployment / domain / secrets | DOCUMENTED ONLY / BLOCKED | Niet geactiveerd |

## Lokaal bewezen (2026-07-21)

- `pnpm typecheck` PASS
- `pnpm test` PASS (29)
- `pnpm test:integration` PASS (28) tegen API **54421** / DB **54422**
  - `business-flow.db.test.ts` (8) + `authenticated-rls-matrix.test.ts` (20)
- `pnpm test:db` PASS
- Playwright smoke PASS (3)
- Playwright UI business flow PASS (5)
- Migrations inclusief grants + per-table number triggers + SECURITY DEFINER role helpers + seller status / finance write guards

## Volgende fase

1. Admin-MFA afdwingen
2. Mollie / Resend / KYC activeren
3. Rapportage-exports
4. Productie-Supabase, Vercel, domein
5. Juridische/fiscale review + branding-asset

## Bewust niet geclaimd

- Productie-activatie
- Live Mollie/Resend/KYC
- Live MFA enforcement
- Bank/cash payout via UI (DB-pad wel bewezen; UI E2E stopt bij commission visibility na settlement)
