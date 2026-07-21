# Local development

## Prerequisites

- Node 20+
- pnpm
- Docker Desktop (for Supabase)

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm db:start
npx supabase status
```

Copy keys from `npx supabase status` into `.env.local`. A reference `.env.local` for this machine should target **only** the `vdb-partners` ports below.

## Canonical local ports (`vdb-partners`)

| Service | URL / connection |
|---------|------------------|
| API / Kong | `http://127.0.0.1:54421` |
| Database | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio | `http://127.0.0.1:54423` |
| Mailpit | `http://127.0.0.1:54424` |

These values are defined in `supabase/config.toml` and must match `.env.local`.

**Do not use `54321` / `54322` / `54323` for this project.** Those defaults belong to other local stacks (for example `vdb-digital-mobile-local`). Mixing them causes tests and the app to hit the wrong database.

### Port conflict history (resolved)

On 2026-07-20 the first local start still used default ports `54321+` before `config.toml` was offset. The eindrapport briefly mentioned Studio on `54323` from that earlier run. As of **2026-07-21** the active `vdb-partners` stack was re-verified with:

```bash
npx supabase status
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Containers named `supabase_*_vdb-partners` bind **54421–54424** only.

## Commands

```bash
pnpm db:start
pnpm db:reset   # migrations + seed against DB on 54422
pnpm db:status
pnpm dev        # http://127.0.0.1:3000
```

### Owner bootstrap

Seed does **not** create auth users. Create a user in Studio (`http://127.0.0.1:54423`) Auth, then:

```sql
insert into public.user_roles (user_id, role)
values ('<auth-user-uuid>', 'owner');
```

### Commission release tests

Local business-flow tests set `commission_hold_days` to `0` so a delivered order can be released immediately. Restore the normal local default after ad-hoc experiments when needed:

```sql
update public.system_settings set value = '7'::jsonb where key = 'commission_hold_days';
```

## Tests

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration   # loads .env.local; requires stack on 54421/54422
pnpm test:db
$env:BASE_URL="http://127.0.0.1:3000"
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"   # when Next already runs on :3000
pnpm test:e2e
# or only the UI business flow:
pnpm exec playwright test tests/e2e/business-flow.spec.ts
pnpm build
```

`tests/integration/business-flow.db.test.ts` sets `commission_hold_days` to `0` so commissions can become `available` immediately after delivery in local validation.

`tests/e2e/business-flow.spec.ts` covers browser UI: seller onboarding → owner approve → sale → local settlement → commission visibility. Requires healthy API on **54421** and matching `.env.local` keys.

`tests/integration/authenticated-rls-matrix.test.ts` requires `NEXT_PUBLIC_SUPABASE_ANON_KEY` plus the service role for fixtures only. See `docs/jwt-rls-validation-matrix.md`.

`ENCRYPTION_KEY` must be 64 hex characters (32 bytes) or valid base64 for 32 bytes.

## Branding

Place official logo files under `public/brand/` (see README there). Without assets, text branding is used.
