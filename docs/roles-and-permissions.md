# Roles and permissions

Roles are `owner`, `finance_admin`, `sales_admin`, `support_admin`, and `seller`. The application matrix in `lib/permissions/matrix.ts` is an application-level guard; **Supabase RLS is the database enforcement layer** and is validated with live JWTs in `tests/integration/authenticated-rls-matrix.test.ts`.

## Source of truth

Authorization facts come from:

1. `user_roles` (via `SECURITY DEFINER` helpers — not client-editable JWT metadata)
2. `seller_profiles.status` for seller commercial scope

Role priority: `owner` → `finance_admin` → `sales_admin` → `support_admin` → `seller`.

## Seller status scope

| Status | Catalogue (`current_approved_seller_id`) | Commercial history (`current_readable_seller_id`) | `current_seller_id` |
|--------|------------------------------------------|---------------------------------------------------|---------------------|
| draft / pending_review | no | no | yes (onboarding) |
| approved | yes | yes | yes |
| suspended | no | yes | yes |
| blocked | no | no | null |

## Key RLS boundaries

- Finance-only writes: payments, commissions, payouts, cash receipts, refunds, ledger entries, product costs
- Owner-only: `user_roles` mutations, partner agreement version mutations
- Seller status changes: owner or sales_admin only (`enforce_seller_status_authority`)
- Seller isolation: orders/commissions/payouts scoped to own seller id
- Sellers cannot see `product_costs`, ledger, audit logs, or admin notes

See `docs/jwt-rls-validation-matrix.md` for the PASS matrix with test references.
