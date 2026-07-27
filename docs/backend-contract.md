# Backend contract

Versioned contract between **VDB Digital 2.0** (publisher) and clients (Mobile, Partner Portal).

## Contract identity (this repo)

| Field | Value |
|-------|-------|
| `REPOSITORY_ROLE` | `PARTNER_CLIENT` |
| Contract package | `vdb-backend-contract@0.2.0-rc.2` |
| `schemaVersion` | `2026.07.27.financial-concurrency-rc2` |
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

## Role mapping (Owner RC2 — runtime)

| Shared role | Owner encoding | Partner Portal route |
|-------------|----------------|----------------------|
| `owner` | `admin_roles.role=OWNER` | `/admin` |
| `admin` | `admin_roles.role=ADMIN` | `/admin` |
| `staff` | `admin_roles.role=SUPPORT\|CONTENT` | `/admin` |
| `partner` | `partner_profiles.status=ACTIVE` | `/dashboard` |
| `partner_pending` | `partner_profiles.status=PENDING` | `/onboarding` |
| `customer` | `organization_members` | `/geen-toegang?reden=klant` |

**Runtime auth/routing must not query local `user_roles` or `seller_profiles`.** Those remain local proposal tables for isolated Docker proofs only.

## Domain object mapping (local proposal → Owner RC2)

| Local table / concept | Shared domain |
|-----------------------|---------------|
| `seller_profiles` (legacy local) | `partner_profiles` |
| seller applications / pending | `partner_applications` + `partner_profiles.status=PENDING` |
| `orders` attributed to seller | `partner_sales` |
| `commissions` | `partner_commissions` |
| `payouts` / `cash_receipts` | `partner_payouts` / `partner_cash_receipts` |
| `marketing_assets` | marketing assets |
| `customers` | customers (VDB payee) |

There must not be separate “mobile commissions” and “affiliate commissions.” See `docs/financial-single-source-of-truth.md`.

Concurrency error codes (schema `2026.07.27.financial-concurrency-rc2`):

* `PARTNER_LEAD_ALREADY_CONVERTED`
* `PARTNER_INSUFFICIENT_LIABILITY`

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
