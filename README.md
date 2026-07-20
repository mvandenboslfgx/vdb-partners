# VDB Partner Portal

Partnerplatform voor **VDB Digital Software** (`partners.vdbdigital.nl`).

## Harde betaalregel

Klanten betalen altijd rechtstreeks aan VDB Digital Software.  
Verkopers ontvangen uitsluitend commissie via VDB (bank of contant).

## Stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS + Radix/shadcn-style UI
- Supabase (Postgres, Auth, RLS, Storage)
- Mollie / Resend / identity provider abstractions (fail-closed)
- Vitest + Playwright

## Lokale start

```bash
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm db:reset
pnpm dev
```

Owner-account: maak een Auth-user in Studio, koppel daarna:

```sql
insert into public.user_roles (user_id, role) values ('<auth-user-uuid>', 'owner');
```

## Scripts

| Script | Doel |
|--------|------|
| `pnpm dev` | Ontwikkelserver |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Integratietests (vereist `SUPABASE_DB_URL` voor DB-afhankelijke suites) |
| `pnpm test:db` | Migratiecontracttests |
| `pnpm test:e2e` | Playwright (vereist `BASE_URL`) |
| `pnpm build` | Productiebuild |

## Documentatie

Zie `docs/`, met name:

- `docs/initial-repository-audit.md`
- `docs/local-development.md`
- `docs/implementation-reality-audit.md`
- `docs/production-readiness.md`

## Branding-asset

Plaats het officiële logo in `public/brand/` (zie `public/brand/README.md`).  
Zonder asset: tekstbranding alleen.

## Status

```text
LOCAL INTEGRATION PASS — EXTERNAL PROVIDERS NOT ACTIVATED
```

Geen productieclaims zonder geconfigureerde providers, DNS en smoke tests.
