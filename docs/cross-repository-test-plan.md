# Cross-repository test plan

Cross-platform scenarios require **one shared staging Supabase**. Local stacks can only prove each client in isolation.

## Status legend

`BLOCKED_ON_STAGING` | `LOCAL_PROXY` | `PASS` | `FAIL` | `NOT_RUN`

## Scenarios

| # | Scenario | Partner Portal role | Status today |
|---|----------|---------------------|--------------|
| 1 | Customer registers on website and logs into Mobile with same account | N/A (observe only) | `BLOCKED_ON_STAGING` |
| 2 | Customer creates request in Mobile; admin sees it on website | N/A | `BLOCKED_ON_STAGING` |
| 3 | Admin changes project; customer sees update in Mobile | N/A | `BLOCKED_ON_STAGING` |
| 4 | Partner registers lead/sale in Partner Portal | Actor | `LOCAL_PROXY` â€” local UI/DB E2E proves portal path only |
| 5 | Admin handles lead/sale in VDB Digital 2.0 | Consumer of shared row | `BLOCKED_ON_STAGING` |
| 6 | Partner sees sale status in Portal **and** Mobile | Actor + Mobile | `BLOCKED_ON_STAGING` |
| 7 | Customer payment confirmed server-side | Dependent | `LOCAL_PROXY` â€” manual bank path in local finance tests |
| 8 | One shared commission record is created | Assert single commission id across clients | `LOCAL_PROXY` locally; shared assert `BLOCKED_ON_STAGING` |
| 9 | Payout status identical in Portal and Mobile | Actor + Mobile | `BLOCKED_ON_STAGING` |
| 10 | RLS blocks other usersâ€™ data | Actor | `LOCAL_PROXY` â€” JWT/RLS matrix **20/20 PASS** on local `vdb-partners` |

## Local proxies already proven in this repo

- DB business flow: onboarding â†’ payout â†’ refund (`tests/integration/business-flow.db.test.ts`)
- UI business flow: onboarding â†’ settlement â†’ commission UI (`tests/e2e/business-flow.spec.ts`)
- JWT/RLS matrix by role (`tests/integration/authenticated-rls-matrix.test.ts`)

These do **not** replace staging scenarios 1â€“3, 5â€“6, 8â€“9.

## Execution rules

1. Run cross-repo scenarios only against shared staging.
2. Do not stop sibling local containers to â€œfree portsâ€ for staging tests.
3. Use synthetic users (`@example.test`); never production identities.
4. Record `schemaVersion`, staging project ref, and git SHAs of all three clients in the test report.
