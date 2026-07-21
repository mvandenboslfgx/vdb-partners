# Testing
`pnpm typecheck` checks TypeScript. `pnpm test` runs DB-free unit tests. `pnpm test:integration` includes environment-gated local database suites and `pnpm test:db` verifies migrations. `pnpm test:e2e` uses Playwright and skips when `BASE_URL` is absent.

Before adding a financial workflow, add deterministic cent-based unit tests, database invariants, authorization coverage, and an end-to-end scenario in a local Supabase environment.

## Database-backed business flow

`tests/integration/business-flow.db.test.ts` validates onboarding, approval, manual bank payment, delivery, commission release, bank and cash payouts, plus a refund after a paid payout. It only runs when `.env.local` targets `http://127.0.0.1:54421` and includes `SUPABASE_SERVICE_ROLE_KEY`.

```powershell
pnpm db:start
pnpm test:integration -- tests/integration/business-flow.db.test.ts
```

## Live JWT/RLS matrix

`tests/integration/authenticated-rls-matrix.test.ts` creates real Auth users for owner, finance/sales/support admins, and seller statuses (approved A/B, pending, suspended, blocked). Assertions use the **anon key + bearer access token**. Service role is fixture-only. See `docs/jwt-rls-validation-matrix.md`.

```powershell
pnpm test:integration -- tests/integration/authenticated-rls-matrix.test.ts
```

## UI business E2E

`tests/e2e/business-flow.spec.ts` covers browser onboarding → approval → sale → local settlement → commission visibility.

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"
pnpm test:e2e
```
