# Migration ownership

## Rule

**VDB Digital 2.0** is the only repository allowed to apply definitive migrations to shared staging and production Supabase projects.

## Partner Portal (`PARTNER_CLIENT`)

### Allowed

- Maintain `supabase/migrations/` for **local** `project_id=vdb-partners` development and tests.
- Treat local migrations as **proposals + local proof**.
- Open a backend change proposal when Mobile/Portal need schema that must become platform-wide.

### Forbidden

- `supabase db push` / migrate against shared staging or production from this repo without owner + canonical-backend process.
- `supabase db reset` against any remote.
- Inventing divergent production tables for commissions/payouts.

## Proposal workflow

1. Describe need (tables, columns, RLS, RPCs, tests).
2. Implement and prove on local `54421` / `54422`.
3. Hand off migration SQL + test evidence to VDB Digital 2.0.
4. After canonical merge: pull contract/`schemaVersion`, align local naming if required, delete obsolete divergent local-only experiments.
5. Re-run Partner Portal integration + JWT/RLS + E2E locally, then staging scenarios.

## Current local migrations (proposal set)

Present under `supabase/migrations/` in this repo (non-exhaustive intent):

- Initial partner commerce schema + RLS
- Grants / number triggers / private schema fixes
- Seller status + finance write guards (`20260721000004_rls_status_and_role_guards.sql`)

These remain **local** until adopted by the canonical backend.

## Remote actions

Require explicit owner approval:

- remote migration
- production Edge deploy
- live Mollie
- production seed/reset
- git push (when acting as agent)
- any sibling repo change
