# Implementation Reality Audit — VDB Partner Portal

**Laatste poortverificatie:** 2026-07-21  
**Eindstatus:**

```text
VDB PARTNER PORTAL LOCAL INTEGRATION PASS
PRODUCTION NOT ACTIVATED
EXTERNAL PROVIDERS NOT ACTIVATED
FULL BUSINESS E2E VALIDATION INCOMPLETE
```

Statuslegenda: `REAL AND TESTED` | `REAL BUT NOT FULLY TESTED` | `IMPLEMENTED WITH MOCK PROVIDER` | `PARTIALLY IMPLEMENTED` | `DOCUMENTED ONLY` | `NOT IMPLEMENTED` | `BLOCKED`

## Canonical local Supabase stack

Verified with `npx supabase status` and `docker ps` on 2026-07-21. Containers: `supabase_*_vdb-partners`.

| Service | Active endpoint |
|---------|-----------------|
| API | `http://127.0.0.1:54421` |
| Database | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio | `http://127.0.0.1:54423` |
| Mailpit | `http://127.0.0.1:54424` |

Source of truth: `supabase/config.toml` + `.env.local` (gitignored) + `.env.example`.

**Correction:** An earlier report mentioned Studio on `54323`. That referred to a first local start that still used default ports before the config offset. Those defaults are **not** the canonical `vdb-partners` stack. Do not point the app or tests at `54321`/`54322`/`54323`.

| Onderdeel | Status | Bewijs / notitie |
|-----------|--------|------------------|
| Authenticatie (e-mail/wachtwoord flows) | PARTIALLY IMPLEMENTED | Auth pages + Supabase SSR helpers; e-mailverificatie/reset UI aanwezig; niet end-to-end tegen live Auth-flows in CI |
| MFA voor admins | PARTIALLY IMPLEMENTED | Documented + fail-closed intent; geen enforced MFA gate in middleware getest |
| Seller onboarding | REAL BUT NOT FULLY TESTED | Multi-step actions + wizard; unit age/account-type getest; geen volledige E2E |
| Identity verification | IMPLEMENTED WITH MOCK PROVIDER | Provider abstraction + mock; productie geblokkeerd zonder echte provider of handmatige review |
| Agreement signing | REAL BUT NOT FULLY TESTED | Versies in DB/seed; accept-action met versie/timestamp; PDF helper aanwezig |
| Seller approval | REAL BUT NOT FULLY TESTED | Admin actions + status history intent; unit permissions getest |
| Product catalog | REAL BUT NOT FULLY TESTED | Schema + seed producten + compliance; seller UI empty-state tot data |
| Order flow | REAL BUT NOT FULLY TESTED | Statusmachine volledig + server create/transition; unit transitions PASS |
| Mollie | IMPLEMENTED WITH MOCK PROVIDER / BLOCKED live | Client + webhook route + fail-closed flags; geen live Mollie key |
| Manual bank payment | REAL BUT NOT FULLY TESTED | Admin confirm action (finance/owner); seller kan niet bevestigen via permissions |
| Commission engine | REAL AND TESTED | Pure engine unit tests PASS (fixed/percent/cap/over-margin) |
| Ledger | REAL AND TESTED | Pure helpers + SQL append-only triggers applied locally; unit PASS |
| Payout batches | REAL BUT NOT FULLY TESTED | Domain + admin actions; unit overlap/batch PASS |
| Bank payout logging | REAL BUT NOT FULLY TESTED | registerBankPayout + ledger insert path |
| Cash payout | REAL BUT NOT FULLY TESTED | prepare/confirm actions + pure cash helpers unit PASS |
| PDF receipt | REAL BUT NOT FULLY TESTED | pdfkit generators; hook in cash confirm; geen snapshot-E2E |
| RLS | REAL AND TESTED (migrations) | Policies applied via `supabase start`; SQL contract tests PASS; live JWT RLS matrix niet volledig geautomatiseerd |
| Audit logs | REAL BUT NOT FULLY TESTED | appendAuditLog wired in kritieke actions |
| Reports / exports | PARTIALLY IMPLEMENTED | Admin reports route/UI shell; CSV/PDF exports niet volledig |
| Email (Resend) | IMPLEMENTED WITH MOCK PROVIDER | Abstraction; fail-closed zonder key |
| E2E smoke | REAL AND TESTED | Playwright home/login/register PASS tegen lokale `pnpm dev` |
| Full business E2E | NOT IMPLEMENTED | Onboarding → order → payment → delivery → commission → payout → refund-after-payout nog open |
| Deployment | DOCUMENTED ONLY | Vercel/DNS docs; geen productie-deploy |
| Domain partners.vdbdigital.nl | DOCUMENTED ONLY | Geen DNS-wijziging uitgevoerd |
| Production secrets | BLOCKED | Niet geconfigureerd |

## Lokaal bewezen

- `pnpm typecheck` PASS
- `pnpm lint` PASS (warnings only)
- `pnpm test` PASS (29)
- `pnpm test:integration` PASS (5) met `SUPABASE_DB_URL` op **54422**
- `pnpm test:db` PASS (1)
- `pnpm test:e2e` PASS (3) met `BASE_URL=http://127.0.0.1:3000`
- `pnpm build` PASS
- `npx supabase start` + migrations + seed SUCCEEDED op Docker (`vdb-partners`, poorten **54421–54424**)

## Volgende fase (geen feature-stapeling)

1. Database-backed E2E: seller onboarding → approval → order → betaling → levering → commissie → payout
2. E2E: refund na payout (negatieve correctie, oude payout blijft)
3. Live JWT/RLS-tests per rol
4. Admin-MFA afdwingen
5. Mollie / Resend / KYC activeren en valideren
6. Rapportage-exports afbouwen
7. Productie-Supabase, Vercel, domein
8. Juridische/fiscale review + branding-asset

## Bewust niet geclaimd

- Productie-activatie
- Live Mollie/Resend/KYC
- Volledige Playwright business-scenario’s
- Live MFA enforcement
- Volledige rapportage-exports
