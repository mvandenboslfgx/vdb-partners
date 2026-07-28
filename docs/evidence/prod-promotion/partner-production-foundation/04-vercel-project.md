# Vercel project + environments

| Item | Value |
|------|-------|
| Project | `vdb-partners` |
| Project ID | `prj_o5KSI7m7TldChUDpL0SgmdEl0pdq` |
| Team | `matthijs-projects-301cd812` |
| Linked Owner project | **No** (separate from `vdbdigital2-0`) |
| Framework | Next.js (detected) |
| Node | 24.x |
| Install | `npm ci` |
| Build | `npm run build` |
| Ignore production auto-deploy | `ignoreCommand` skips when `VERCEL_ENV===production` |
| Git | connected to `mvandenboslfgx/vdb-partners` |

## Env presence (names only — values encrypted / not shown)

### Production
`VDB_DEPLOYMENT_ENVIRONMENT`, `APP_ENV`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKEND_CONTRACT_VERSION`, `VDB_BACKEND_CONTRACT`, `VDB_SCHEMA_VERSION`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAIN_SITE_URL`, `ENCRYPTION_KEY`, `CRON_SECRET`, fail-closed flags (`mollie_payments_enabled`, payout/registration flags, …) = present

Intended ref: `nhsrdnjfsxfikfbdmdfj`

### Preview (`partner-rc3-preview` branch)
Same contract/schema pins + Supabase keys + fail-closed flags = present  
Intended ref: `qzekuvmgfekzsowdecyk`

### Development
Staging-oriented keys present; production ref not used.

## Domain / DNS

| Item | Status |
|------|--------|
| Canonical | `partners.vdbdigital.nl` |
| DNS provider (parent) | mijndomein.nl (`nsn1`/`nsn2`) |
| Required record | `A partners.vdbdigital.nl → 76.76.21.21` (or Vercel CNAME) |
| DNS mutation this gate | **Not applied** (no mijndomein API; NXDOMAIN remains) |
| SSL | N/A until DNS verifies |
| Production alias | **Not active** (removed after accidental CLI deploys) |

## Production deploy status

**NOT AUTHORIZED.** Accidental CLI production deploys occurred and were **removed**:

- `dpl_89LifDpagWzN94c23hxwBri8HAKR` — removed; `partners.vdbdigital.nl` alias removed
- `dpl_A6nJWs7qFRHWDxrNBKcyTWpqFm1g` — removed; alias removed

Git production attempts canceled by `ignoreCommand`.
