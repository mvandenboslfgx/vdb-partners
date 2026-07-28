# Environment guard

## Change

Replaced production denylist (`assertNotProductionSupabaseUrl`) with fail-closed:

`assertExpectedSupabaseEnvironment({ deploymentEnvironment, actualSupabaseUrl, stagingProjectRef, productionProjectRef })`

Runtime: `assertPartnerSupabaseEnvironment()`.

## Contract

| Environment | Allowed Supabase ref | Denied |
|-------------|----------------------|--------|
| production | `nhsrdnjfsxfikfbdmdfj` | staging / missing / unknown |
| preview / staging | `qzekuvmgfekzsowdecyk` | production |
| development | local or staging | production |
| missing / unknown env | — | always block |

## Tests (`tests/unit/contract-pin.test.ts`)

Matrix covered: production+prod PASS; production+staging BLOCK; production+missing BLOCK; preview+staging PASS; preview+prod BLOCK; staging+staging PASS; local+prod BLOCK; unknown env BLOCK.

`npm test` → **57/57 PASS** (exit 0).

## Commits

- `0a6ec90` `fix: enforce explicit partner deployment environments`
- tag `partner-rc3-production-ready` → `0a6ec90`
- `1b5738e` `chore: configure vercel nextjs build and skip production auto-deploys`
