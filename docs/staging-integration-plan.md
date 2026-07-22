# Staging integration plan

## Goal

Prove that website, mobile, and Partner Portal share one Auth and one database **without** sharing local Docker stacks.

## Current status

| Item | Status |
|------|--------|
| Shared staging Supabase project | **NOT PROVISIONED** |
| Staging env wired in Partner Portal | **NOT DONE** |
| Anonymized seed for staging | **NOT DONE** |
| Cross-repo scenarios green | **NOT RUN** |

Local Partner Portal proof (isolated) remains valid: business DB flow, UI E2E, JWT/RLS matrix against `54421`.

## Prerequisites

1. VDB Digital 2.0 creates/owns the staging project and publishes `schemaVersion`.
2. Partner Portal and Mobile receive the same `SUPABASE_URL` + publishable key.
3. Service role / webhook secrets stored per host (Vercel / CI), never in mobile.
4. No unsanitized production dump.

## Partner Portal staging checklist

- [ ] `APP_ENV=staging` documented in deployment env
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = shared staging
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = shared staging publishable key
- [ ] `BACKEND_CONTRACT_VERSION` pinned to staging publish
- [ ] Feature flags fail-closed until intentionally enabled
- [ ] Mollie/Resend staging keys only (no live)
- [ ] Smoke: login as partner, see attributed sale/commission created from shared data

## Order of work

1. Freeze isolation (this document set) â€” **in progress in Partner Portal**
2. Canonical backend owner publishes staging schema
3. Partner Portal points staging env at shared project
4. Run `docs/cross-repository-test-plan.md` scenarios 4â€“10 that involve partners
5. Only then: production cutover planning

## Explicit non-actions from this repo

- Do not create the staging Supabase project from Partner Portal agents.
- Do not copy production data.
- Do not enable live Mollie on staging without owner approval.
