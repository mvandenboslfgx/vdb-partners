# JWT/RLS validation matrix

Live validation against local Supabase (`54421`) using **anon key + real access tokens**. Service role is used only for fixture seeding.

**Suite:** `tests/integration/authenticated-rls-matrix.test.ts`  
**Helpers:** `tests/helpers/rls.ts`  
**Migration hardening:** `supabase/migrations/20260721000004_rls_status_and_role_guards.sql`

## Role priority (source of truth)

Resolved from `user_roles` via `SECURITY DEFINER` helpers (not client JWT metadata):

`owner` → `finance_admin` → `sales_admin` → `support_admin` → `seller`

Seller commercial scope additionally depends on `seller_profiles.status`:

| Helper | Statuses |
|--------|----------|
| `current_seller_id()` | any except `blocked` |
| `current_readable_seller_id()` | `approved`, `suspended` |
| `current_approved_seller_id()` | `approved` only |

## Results (local Gate 2)

| Role | Resource | SELECT | INSERT | UPDATE | DELETE | Result | Test |
|------|----------|--------|--------|--------|--------|--------|------|
| owner | sellers/orders/payments/commissions/payouts/ledger/costs/notes/audits | allowed | N/A | N/A | N/A | PASS | owner positives |
| finance_admin | payments/commissions/payouts/ledger/costs/cash_receipts | allowed | finance write | finance write | N/A | PASS | finance positives |
| finance_admin | user_roles (assign owner) | — | denied | — | — | PASS | finance negatives |
| finance_admin | partner_agreement_versions | read via auth policy | — | ineffective | — | PASS | finance negatives |
| finance_admin | audit_logs | allowed | allowed | — | ineffective | PASS | finance negatives |
| sales_admin | sellers/orders/products | allowed | — | — | — | PASS | sales positives |
| sales_admin | product_costs / ledger_entries | denied empty | — | — | — | PASS | sales negatives |
| sales_admin | user_roles / payouts mutate | — | denied | ineffective | — | PASS | sales negatives |
| support_admin | tickets/orders | allowed | — | — | — | PASS | support positives |
| support_admin | costs/commissions/payouts/payments/roles/seller status | denied / ineffective | denied | ineffective | — | PASS | support negatives |
| seller_approved_a | own profile/products/tickets | allowed | ticket insert | — | — | PASS | seller A positives |
| seller_approved_a | seller B orders/commissions/payouts/tickets/notifications/customers | denied empty | — | — | — | PASS | isolation |
| seller_approved_b | own commercial trail | allowed | — | — | — | PASS | isolation proof seed |
| any seller | product_costs/ledger/audit/admin_notes | denied empty | — | — | — | PASS | financial restrictions |
| any seller | payments/fulfilments/commissions/payouts/cash_receipts/refunds/roles/status | denied / ineffective | denied | ineffective | — | PASS | financial restrictions |
| seller_pending | own profile + agreement versions | allowed | — | — | — | PASS | pending |
| seller_pending | products/orders/commissions/payouts | denied empty | — | — | — | PASS | pending |
| seller_suspended | historical own orders | allowed | — | — | — | PASS | suspended |
| seller_suspended | catalogue / new referrals | denied | denied | — | — | PASS | suspended |
| seller_blocked | current_seller_id + commercial data | null / denied | denied | — | — | PASS | blocked |

Server actions that create orders still use privileged workflows after app-layer auth; direct JWT `INSERT` into `orders` is denied (PASS).

## SECURITY DEFINER audit

| Function | search_path | Notes |
|----------|-------------|-------|
| `private.current_user_role` | `pg_catalog, public` | role priority LIMIT 1 |
| `private.current_seller_id` | `pg_catalog, public` | excludes `blocked` |
| `private.current_approved_seller_id` | `pg_catalog, public` | approved only |
| `private.current_readable_seller_id` | `pg_catalog, public` | approved + suspended |
| `public.is_*_admin` | `pg_catalog, public` | wrappers |
| `public.enforce_seller_status_authority` | `pg_catalog, public` | owner/sales_admin only; null `auth.uid()` (service role) allowed for fixtures |

No dynamic SQL. Execute granted to `authenticated` + `service_role` on public wrappers.
