# Shared backend architecture

## Intent

VDB Digital is one platform with three frontends:

```text
VDB Digital website ───────┐
VDB Digital Mobile ────────┼── One shared Supabase backend (Auth, DB, Storage, Realtime, RPCs)
VDB Partner Portal ────────┘
```

Repositories stay separate. Coupling is shared Auth, database, Storage, Realtime, and secured server functions — not a monorepo merge.

## This repository

| Field | Value |
|-------|-------|
| Name | VDB Partner Portal / Affiliate |
| Path | `c:\Users\XXX\vdb-partners` |
| Remote | `https://github.com/mvandenboslfgx/vdb-partners.git` |
| `REPOSITORY_ROLE` | **`PARTNER_CLIENT`** |
| Canonical backend owner | **VDB Digital 2.0** (`CANONICAL_BACKEND_OWNER`) |
| Sibling clients | VDB Digital Mobile (`MOBILE_CLIENT`) |

## Environment matrix (summary)

| Environment | Backend | Isolation |
|-------------|---------|-----------|
| Local | Own Supabase `project_id=vdb-partners` on ports **54421–54424** | Full — may run beside other local stacks |
| Staging | One shared VDB staging Supabase | Shared Auth + data across website/app/portal |
| Production | One shared VDB production Supabase | Shared Auth + data; not activated from this repo |

See `docs/environment-matrix.md`.

## What “coupled” means for the Partner Portal

- Same `auth.users` / profiles / roles as website and mobile (once staging/production contracts align).
- Same partner, lead/sale, commission, and payout **records** — not portal-only clones.
- Customers still pay **VDB Digital Software** only; sellers receive commission via VDB.

## What “coupled” does not mean

- Sharing one Docker Desktop stack for local development.
- Letting Cursor agents stop `supabase_*_vdbdigital2` or `supabase_*_*mobile*` containers.
- Shipping Partner Portal migrations straight to production independently.

## Local audit snapshot (2026-07-22)

Observed on this machine during freeze documentation:

- Active Partner containers: `supabase_*_vdb-partners` (API **54421**).
- Sibling stack also present: `supabase_*_vdbdigital2` — **must not be stopped by this repo’s agents**.
- Sibling folders under `c:\Users\XXX\`: `vdbdigital2.0`, `vdb-app`, `vdb-partners`, others — out of scope for edits from this workspace.

## Related documents

- `docs/repository-responsibilities.md`
- `docs/environment-matrix.md`
- `docs/backend-contract.md`
- `docs/staging-integration-plan.md`
- `docs/cross-repository-test-plan.md`
- `docs/migration-ownership.md`
