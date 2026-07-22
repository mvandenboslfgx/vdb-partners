# Decisions

## Hard business rules

- Customers pay VDB Digital Software; partners are paid by VDB.
- Financial values are integer cents, avoiding floating-point currency arithmetic.
- Ledger corrections are compensating entries; prior entries remain immutable.
- Supabase RLS is a primary enforcement layer; application permissions are not sufficient on their own.
- Provider integrations are feature-gated and disabled by default (fail-closed).

## Configurable business policy (owner may change later)

- Commission hold days after delivery: default **7** (`system_settings.commission_hold_days`).
- Minimum payout amount: default **€25** (`system_settings.min_payout_amount`).
- Default commission style: fixed amount per product; optional % of margin; never above net margin.
- Renewals do not auto-attribute until owner sets renewal commission policy.
- Sellers cannot grant discounts; admin may approve order-specific discounts.
- One seller per order; duplicate claims → admin review; no multi-level MLM commissions.

## Technical choices

- Next.js 16 App Router + Supabase (no Prisma).
- Local Supabase ports offset to `54421+` to avoid collisions with other VDB local stacks (**Configurabel**).
- Multi-repo freeze: this repo is `PARTNER_CLIENT`; VDB Digital 2.0 is `CANONICAL_BACKEND_OWNER`; local isolated, staging/production shared (`docs/shared-backend-architecture.md`).
- Catch-all seller/admin section routes for maintainable navigation; URLs still match `/dashboard/...` and `/admin/...`.
- Identity verification uses a replaceable provider interface; local mock allowed; production requires real provider or manual review.
- Env validation is lazy so `next build` works without production secrets; enforce with `VERCEL_ENV=production` or `FORCE_ENV_VALIDATION=true`.

## Legal / fiscal

- Partner agreement text is a working draft — **Te controleren met jurist**.
- Fiscal year summaries are administrative aids — **Te controleren met boekhouder**.
- VAT treatment per product/country — **Te controleren met boekhouder**.
