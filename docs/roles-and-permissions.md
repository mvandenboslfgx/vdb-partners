# Roles and permissions
Roles are owner, finance admin, sales admin, support admin, and seller. The permission matrix in `lib/permissions/matrix.ts` is an application-level guard; Supabase RLS is the database enforcement layer.

Finance handles payment confirmation, release, payouts, and costs. Sales approves sellers and products. Sellers can create attributed orders and view only their own profile, orders, commissions, and payouts. Role changes require an audited administrative process. Configurable policy: refine the matrix only alongside matching RLS migration changes.
