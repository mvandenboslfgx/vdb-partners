# Financial single source of truth

## Rule

Money, commissions, payouts, ledger entries, and payment confirmation are **platform financial facts** owned by the canonical backend (**VDB Digital 2.0**), not by any single frontend.

This Partner Portal (`PARTNER_CLIENT`) is a **client surface**: it may display and request partner workflows locally, but it is **not** independently production-authoritative for financial state.

## Ownership

| Concern | Authoritative source |
|---------|----------------------|
| Customer payment to VDB | Canonical backend + Mollie/manual confirmation paths owned with VDB Digital 2.0 |
| Commission calculation / release | Shared finance RPCs / tables after canonical adoption |
| Payout batch / bank / cash receipt | Shared payout records — one ledger, many UIs |
| Ledger balance / adjustments | Append-only ledger in shared DB |
| Partner Portal local migrations | **Proposals + local proof only** until landed in VDB Digital 2.0 |

## Hard product rule (unchanged)

Customers pay **VDB Digital Software** only. Partners never collect customer funds. Partners receive commission via VDB (bank or cash).

## What this repo may do locally

- Prove partner onboarding → sale attribution → commission visibility → payout UX against isolated `vdb-partners` (54421).
- Keep local finance workflow helpers for tests (`lib/workflows/finance.ts`).
- Propose schema/RLS/RPC changes via `docs/migration-ownership.md`.

## What this repo must not do

- Apply remote production/staging finance migrations on its own.
- Invent portal-only commission or payout tables that diverge from the platform ledger.
- Treat local service-role workflows as a second production money engine.

## Contract pin

- Package intent: `vdb-backend-contract@0.1.0`
- `schemaVersion`: `2026.07.22.freeze`

See `docs/backend-contract.md` and `docs/shared-backend-architecture.md`.
