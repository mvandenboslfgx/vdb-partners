# Architecture
The portal uses Next.js App Router, TypeScript strict mode, domain-focused `lib/` modules, and Supabase/Postgres. Browser clients use the anonymous Supabase key; privileged server paths use the service role only when required. Migrations define schemas, RLS, triggers, accounting records, and readable business numbers.

This repository is a **`PARTNER_CLIENT`**: a separate frontend that will share Auth/DB/Storage/Realtime with VDB Digital 2.0 and Mobile on staging/production. Locally it uses an isolated Supabase (`vdb-partners`, ports 54421–54424). Canonical remote schema ownership lives in VDB Digital 2.0 — see `docs/shared-backend-architecture.md` and `docs/migration-ownership.md`.

Payments belong to VDB Digital Software. Seller access is attribution and reporting, while commissions and payouts are internal financial obligations. Provider integrations are isolated behind `lib/payments`, `lib/notifications`, and `lib/verification`.
