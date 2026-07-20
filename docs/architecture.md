# Architecture
The portal uses Next.js App Router, TypeScript strict mode, domain-focused `lib/` modules, and Supabase/Postgres. Browser clients use the anonymous Supabase key; privileged server paths use the service role only when required. Migrations define schemas, RLS, triggers, accounting records, and readable business numbers.

Payments belong to VDB Digital Software. Seller access is attribution and reporting, while commissions and payouts are internal financial obligations. Provider integrations are isolated behind `lib/payments`, `lib/notifications`, and `lib/verification`.
