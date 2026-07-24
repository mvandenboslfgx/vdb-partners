# Backend contract

Versioned contract between **VDB Digital 2.0** (publisher) and clients (Mobile, Partner Portal).

## Contract identity (this repo)

| Field | Value |
|-------|-------|
| `REPOSITORY_ROLE` | `PARTNER_CLIENT` |
| Contract package | `vdb-backend-contract@0.2.0-rc.2` |
| `schemaVersion` | `2026.07.24.mobile-compat-rc2` |
| Partner surface compatibility | Embeds non-breaking `0.2.0-rc.1` partner RPCs/tables |
| Env pin | `BACKEND_CONTRACT_VERSION=vdb-backend-contract@0.2.0-rc.2` |
| Source of generated types (target) | Canonical backend package / export from VDB Digital 2.0 |
| Source of types (today) | Local `supabase/migrations/*` in this repo (proposal + local proof only) |

Local migrations under `supabase/migrations` prove Partner behaviour in isolation. Shared staging/production must use the canonical schema published by VDB Digital 2.0 at the same `schemaVersion`.

**Do not publish Mobile `0.1.1` or historical owner `0.1.0` as the shared staging pin.**

## Required contract contents (target)

1. Generated `Database` TypeScript types
2. Roles and role priority
3. Status enums (seller/partner, order, payment, commission, payout)
4. RPC names + argument/result Zod schemas
5. Feature flags
6. Stable error codes
7. `schemaVersion` string

## Role mapping (local portal â†’ target shared)

| Local (current Partner Portal) | Target shared platform | Notes |
|--------------------------------|------------------------|-------|
| `seller` + `draft` / `pending_review` | `partner_pending` | Status may remain on profile |
| `seller` + `approved` | `partner` | |
| `sales_admin` / `support_admin` / `finance_admin` | `staff` (+ capability flags) or dedicated staff roles | Exact split owned by canonical backend |
| `owner` | `owner` | |
| (website) `customer` | `customer` | Not a Partner Portal login role today |
| (website) `admin` | `admin` | Canonical naming TBD |

**Do not invent a second Auth.** Mapping is a contract migration task owned by VDB Digital 2.0.

## Domain object mapping (local â†’ shared intent)

| Local table / concept | Shared domain |
|-----------------------|---------------|
| `seller_profiles` | partner profiles |
| seller applications / pending | partner applications |
| `orders` attributed to seller | sales / partner-attributed orders |
| `commissions` | commissions (one ledger) |
| `payouts` / `cash_receipts` | payouts |
| `marketing_assets` | marketing assets |
| `customers` | customers (VDB payee) |

There must not be separate â€œmobile commissionsâ€ and â€œaffiliate commissions.â€ See `docs/financial-single-source-of-truth.md`.

## Drift check (planned)

```text
CLIENT_BUILD fails if BACKEND_CONTRACT_VERSION != expected staging/production pin
```

Not implemented in CI yet. Documented as required before shared staging go-live.

## Change process

1. Partner Portal needs schema/RPC change.
2. Author a backend change proposal.
3. Apply **locally only** for tests.
4. Do **not** apply remote.
5. Land definitive migration in VDB Digital 2.0.
6. Bump `vdb-backend-contract` / `schemaVersion`; update this fileâ€™s pin.
7. Re-run Partner Portal JWT/RLS + business integration against local, then staging.
