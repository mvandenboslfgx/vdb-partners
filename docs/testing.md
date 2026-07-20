# Testing
`pnpm typecheck` checks TypeScript. `pnpm test` runs DB-free unit tests. `pnpm test:integration` and `pnpm test:db` contain environment-gated suites and skip when no `SUPABASE_DB_URL` is available. `pnpm test:e2e` uses Playwright and skips when `BASE_URL` is absent.

Before adding a financial workflow, add deterministic cent-based unit tests, database invariants, authorization coverage, and an end-to-end scenario in a local Supabase environment.
