# Security model

RLS is enabled for all public application tables. Roles are resolved through private `SECURITY DEFINER` helpers with fixed `search_path` (`pg_catalog, public`) to avoid recursive policies and privilege escalation via `search_path` hijacking.

## Layers

1. **Supabase Auth JWT** — proves identity (`auth.uid()`)
2. **RLS policies** — enforce row access using DB role helpers
3. **Triggers** — protect seller status, ledger append-only, commission lifecycle
4. **App permission matrix** — server actions / UI (stricter product UX; never weaker than RLS for money)

## Seller isolation and status

Seller policies scope commercial records to the authenticated seller. Blocked sellers get a null `current_seller_id()`. Pending sellers may manage onboarding data but not the approved catalogue. Suspended sellers may read historical commercial rows but cannot use the catalogue or create referrals.

## Finance boundaries

`product_costs` and `ledger_entries` are finance/owner only. Other admin roles may read operational tables but cannot mutate payments, commissions, or payouts.

## Audit and roles

Audit logs are append-oriented for JWT clients (select/insert only). `user_roles` mutations are owner-only.

## Live proof

`docs/jwt-rls-validation-matrix.md` records Gate 2 results against API `54421` with anon key + access tokens.

Security headers include CSP, frame denial, MIME sniffing protection, referrer policy, and a restrictive permissions policy. Store secrets only in deployment environment configuration; rotate them if exposed.

**Next gate (separate):** admin MFA enforcement — not mixed into JWT/RLS validation.
