# Local development

## Prerequisites

- Node 20+
- pnpm
- Docker Desktop (for Supabase)

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with local Supabase keys from `pnpm db:status` / `npx supabase status`.

## Supabase

This project uses **offset ports** (`54421+`) in `supabase/config.toml` so it does not collide with other local VDB stacks that use default `54321/54322`.

```bash
pnpm db:start
pnpm db:reset   # applies migrations + seed
pnpm db:status
```

If port bind fails, stop the other local project first, or keep the offset ports.

**Note (2026-07-20):** starting this stack required temporarily stopping `vdb-digital-mobile-local` because it occupied `54322`. Restart that project separately when needed; after this repo uses `54422`, both can run side by side.

## App

```bash
pnpm dev
```

Open http://localhost:3000

### Owner bootstrap

Seed does **not** create auth users. Create a user in Studio Auth, then:

```sql
insert into public.user_roles (user_id, role)
values ('<auth-user-uuid>', 'owner');
```

## Tests

```bash
pnpm typecheck
pnpm lint
pnpm test
$env:SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54422/postgres"
pnpm test:integration
pnpm test:db
$env:BASE_URL="http://127.0.0.1:3000"
pnpm test:e2e
pnpm build
```

## Branding

Place official logo files under `public/brand/` (see README there). Without assets, text branding is used.
