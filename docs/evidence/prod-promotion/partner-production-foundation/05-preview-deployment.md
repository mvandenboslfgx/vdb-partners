# Preview deployment

| Item | Value |
|------|-------|
| Deployment ID | `dpl_Cy1j1Vg9RzjuWWk4noPqQe7TVP3F` |
| URL | `https://vdb-partners-lny7u31j0-matthijs-projects-301cd812.vercel.app` |
| Environment | **Preview** (`target=preview`) |
| Git HEAD | `2ac2b1b207153c2bc08a8bcda7934c65aed26016` (`partner-rc3-preview`) |
| Contract | `vdb-backend-contract@0.2.0-rc.3` |
| Schema | `2026.07.25.messaging-support-appointments-rc3` |
| Intended Supabase | staging `qzekuvmgfekzsowdecyk` (Preview env for branch) |
| `partners.vdbdigital.nl` alias | **absent** |
| Production alias | **absent** |

## Runtime probes

| Check | Result |
|-------|--------|
| `GET /api/health` | 200 `{"ok":true,"service":"vdb-partner-portal","supabaseConfigured":true,"mollieConfigured":false}` |
| HTML contains production ref | false |
| HTML contains staging ref | false (server-side env) |
| Vercel SSO protection | disabled for probe |

## Staging matrix (equivalent smoke)

`npm run test:staging-rc3-smoke` → **55/55 PASS** (exit 0)  
Uses staging vault only — no production accounts.
