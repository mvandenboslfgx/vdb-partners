# Backend contract

Versioned contract between **VDB Digital 2.0** (publisher) and clients (Mobile, Partner Portal).

## Contract identity (this repo)

| Field                              | Value                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `REPOSITORY_ROLE`                  | `PARTNER_CLIENT`                                                                |
| Contract package                   | `vdb-backend-contract@0.2.0-rc.5`                                               |
| `schemaVersion`                    | `2026.07.29.partner-identity-directory-rc5`                                     |
| Partner surface compatibility      | Typed partner intake + activation checklist; embeds RC3 messaging/support + RC2 |
| Env pin                            | `BACKEND_CONTRACT_VERSION=vdb-backend-contract@0.2.0-rc.5`                      |
| Source of generated types (target) | Canonical backend package / export from VDB Digital 2.0                         |
| Source of types (today)            | Local `supabase/migrations/*` in this repo (proposal + local proof only)        |

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

## Partner types (Owner RC5)

Canonical Owner types: `INDIVIDUAL` (Particulier) and `BUSINESS` (Zakelijk).
Legacy UI values map as `particular → INDIVIDUAL`, `sole_trader|company → BUSINESS`.
Type is never inferred from company name or KvK. Staff approval alone never sets `ACTIVE`.

## Role mapping (Owner RC5 — runtime, same shared roles as RC2/RC3)

| Shared role       | Owner encoding                      | Partner Portal route        |
| ----------------- | ----------------------------------- | --------------------------- |
| `owner`           | `admin_roles.role=OWNER`            | `/admin`                    |
| `admin`           | `admin_roles.role=ADMIN`            | `/admin`                    |
| `staff`           | `admin_roles.role=SUPPORT\|CONTENT` | `/admin`                    |
| `partner`         | `partner_profiles.status=ACTIVE`    | `/dashboard`                |
| `partner_pending` | `partner_profiles.status=PENDING`   | `/onboarding`               |
| `customer`        | `organization_members`              | `/geen-toegang?reden=klant` |

**Runtime auth/routing must not query local `user_roles` or `seller_profiles`.** Those remain local proposal tables for isolated Docker proofs only.

## RC3 portal surfaces (shared `portal_*` — no parallel partner domain)

| Logical / Mobile name | Owner table                  |
| --------------------- | ---------------------------- |
| conversations         | `portal_conversations`       |
| messages              | `portal_messages`            |
| message_attachments   | `portal_message_attachments` |
| support_tickets       | `portal_support_tickets`     |
| support_messages      | `portal_support_replies`     |
| appointments          | `portal_appointments`        |

Fail-closed flags (default false): `mollie_checkout`, `digital_product_checkout`, `partner_payouts`, `messaging_realtime`, `support_internal_notes_rpc`, `appointments_booking`, `partner_compliance_fixtures`.

## Domain object mapping (local proposal → Owner RC3)

| Local table / concept            | Shared domain                                              |
| -------------------------------- | ---------------------------------------------------------- |
| `seller_profiles` (legacy local) | `partner_profiles`                                         |
| seller applications / pending    | `partner_applications` + `partner_profiles.status=PENDING` |
| `orders` attributed to seller    | `partner_sales`                                            |
| `commissions`                    | `partner_commissions`                                      |
| `payouts` / `cash_receipts`      | `partner_payouts` / `partner_cash_receipts`                |
| `marketing_assets`               | marketing assets                                           |
| `customers`                      | customers (VDB payee)                                      |

There must not be separate “mobile commissions” and “affiliate commissions.” See `docs/financial-single-source-of-truth.md`.

Concurrency error codes (schema `2026.07.27.financial-concurrency-rc2`):

- `PARTNER_LEAD_ALREADY_CONVERTED`
- `PARTNER_INSUFFICIENT_LIABILITY`

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
