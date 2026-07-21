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
npx supabase status   # verify ports below
pnpm db:reset
pnpm dev
```

### Canonical local Supabase ports (`vdb-partners` only)

| Service | Port / URL |
|---------|------------|
| API | `http://127.0.0.1:54421` |
| Database | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio | `http://127.0.0.1:54423` |
| Mailpit | `http://127.0.0.1:54424` |

**Niet** `54321`/`54322`/`54323` gebruiken — die zijn voor andere lokale VDB-projecten.

Owner-account: Auth-user in Studio (`54423`), daarna:

```sql
insert into public.user_roles (user_id, role) values ('<auth-user-uuid>', 'owner');
```

Zie `docs/local-development.md` voor details.

## Scripts

| Script | Doel |
|--------|------|
| `pnpm dev` | Ontwikkelserver |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Integratietests (vereist `SUPABASE_DB_URL` op **54422**) |
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
VDB PARTNER PORTAL LOCAL INTEGRATION PASS
PRODUCTION NOT ACTIVATED
EXTERNAL PROVIDERS NOT ACTIVATED
FULL BUSINESS E2E VALIDATION INCOMPLETE
```
