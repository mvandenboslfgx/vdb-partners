# Repository responsibilities

## Roles

| Repository | `REPOSITORY_ROLE` | Owns | Consumes |
|------------|-------------------|------|----------|
| VDB Digital 2.0 | `CANONICAL_BACKEND_OWNER` | Production/staging migrations, RLS, RPCs, Edge Functions, Mollie webhooks, shared DB types | — |
| VDB Digital Mobile | `MOBILE_CLIENT` | Mobile UX, device builds, local-only experiment schema proposals | Shared backend contract |
| **VDB Partner Portal (this repo)** | **`PARTNER_CLIENT`** | Partner web UX, local portal tests, local-only schema proposals | Shared backend contract |

## This repo (`PARTNER_CLIENT`) may

- Develop UI and server actions for onboarding, sales attribution, commissions visibility, payouts UX.
- Run an **isolated** local Supabase for unit/integration/E2E.
- Draft backend change proposals (schema, RLS, RPC, tests).
- Pin and consume a versioned backend contract.
- Point staging/production env at the **shared** Supabase projects when those exist and are approved.

## This repo must not

- Apply remote production/staging migrations on its own authority.
- Create a second production Auth provider.
- Create parallel “portal commissions” or “portal payouts” tables that diverge from the platform ledger.
- Stop or reconfigure sibling Docker projects.
- Edit files under sibling repositories.

## Domain ownership (eventual shared schema)

### Partner Portal + Mobile (shared records)

- partner applications / profiles / codes
- leads / sales (orders attributed to partners)
- commissions / payouts / marketing assets

### Website + Mobile (shared records; portal may only touch where RLS allows)

- customers, projects, chat, documents, quotes, invoices, appointments, reviews

### Admin (website primarily; portal staff roles as granted)

- approvals, payments confirmation, commission release, payout execution, audit logs

Exact table names in this local portal today (`seller_profiles`, `orders`, `commissions`, …) are the **local proposal**. Canonical naming/roles land in VDB Digital 2.0 and are mirrored here via the contract.

## Agent operating rules

1. Scope file edits to `vdb-partners` only.
2. Docker: only `supabase_*_vdb-partners` (or `npx supabase …` inside this repo).
3. Ports: only **54420–54424** for local DB/API/Studio/Mailpit/shadow.
4. On port or container conflict: report; do not tear down siblings.
5. No git push / remote migrate / live Mollie without explicit owner approval.
