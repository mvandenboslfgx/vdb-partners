# Environment matrix

## Overview

| Environment | Website | Mobile | Partner Portal | Supabase | Data |
|-------------|---------|--------|----------------|----------|------|
| Local | Own stack | Own stack | Own stack (`vdb-partners`) | Three isolated projects | Disposable local seeds |
| Staging | Shared | Shared | Shared | **One** VDB staging project | Anonymized / synthetic only |
| Production | Shared | Shared | Shared | **One** VDB production project | Real customers â€” protected |

**Local apart, staging and production together.**

## This repository â€” local

| Item | Value |
|------|-------|
| `project_id` | `vdb-partners` |
| Config | `supabase/config.toml` |
| API | `http://127.0.0.1:54421` |
| DB | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio | `http://127.0.0.1:54423` |
| Mailpit | `http://127.0.0.1:54424` |
| Analytics | `http://127.0.0.1:54427` (not Digitalâ€™s `54327`) |
| Shadow DB | `54420` |
| App (Next) | `http://127.0.0.1:3000` (do not steal sibling app ports without coordination) |
| Container prefix | `supabase_*_vdb-partners` |

Do **not** use Digital ports `54321`â€“`54324` / `54327` or Mobile ports `54521`â€“`54524`.
Isolation checklist: `docs/partner-local-isolation-pass.md`.

## Staging (planned â€” not activated)

All three clients:

```env
APP_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=<shared-staging-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<shared-staging-publishable-key>
BACKEND_CONTRACT_VERSION=<pinned-version>
```

Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, Mollie, Resend, encryption) stay in each hostâ€™s secure env â€” never in the mobile app binary.

Status today: **NOT PROVISIONED** from this repository.

## Production (planned â€” not activated)

Same pattern as staging with production URL/keys.
Status today: **NOT ACTIVATED**. No remote migration or push from Partner Portal agents without explicit owner approval.

## Verification commands (local only)

```powershell
cd c:\Users\XXX\vdb-partners
npx supabase status
docker ps --format "{{.Names}}" | Select-String "vdb-partners"
```

If you see `supabase_*_vdbdigital2` or mobile containers, leave them alone.
