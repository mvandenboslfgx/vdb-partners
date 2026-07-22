# VDB Partner Portal

Partnerplatform voor **VDB Digital Software** (`partners.vdbdigital.nl`).

`REPOSITORY_ROLE=PARTNER_CLIENT` â€” aparte frontend-repo; deelt uiteindelijk Auth/DB met VDB Digital 2.0 en Mobile. Canonieke backend-eigenaar: **VDB Digital 2.0**. Zie `docs/shared-backend-architecture.md`.

## Harde betaalregel

Klanten betalen altijd rechtstreeks aan VDB Digital Software.
Verkopers ontvangen uitsluitend commissie via VDB (bank of contant).

## Stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS + Radix/shadcn-style UI
- Supabase (Postgres, Auth, RLS, Storage) â€” lokaal geÃ¯soleerd; staging/productie gedeeld (nog niet geactiveerd)
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
| Analytics | `http://127.0.0.1:54427` |

**Niet** `54321`/`54322`/`54323` (Digital 2.0) of `54521`/`54522`/`54523` (Mobile) gebruiken.
Agents mogen **geen** sibling-containers stoppen. Isolatie-pass: `docs/partner-local-isolation-pass.md`.

Owner-account: Auth-user in Studio (`54423`), daarna:

```sql
insert into public.user_roles (user_id, role) values ('<auth-user-uuid>', 'owner');
```

Zie `docs/local-development.md` en `docs/environment-matrix.md`.

## Multi-repo docs

| Document | Inhoud |
|----------|--------|
| `docs/shared-backend-architecture.md` | EÃ©n backend, drie clients |
| `docs/repository-responsibilities.md` | Wat deze repo wel/niet mag |
| `docs/environment-matrix.md` | Local / staging / production |
| `docs/backend-contract.md` | `vdb-backend-contract@0.1.0` / `schemaVersion` `2026.07.22.freeze` |
| `docs/financial-single-source-of-truth.md` | Finance is platform-owned, not portal-authoritative |
| `docs/partner-local-isolation-pass.md` | Isolation acceptance checklist |
| `docs/staging-integration-plan.md` | Gedeelde staging |
| `docs/cross-repository-test-plan.md` | Scenarioâ€™s 1â€“10 |
| `docs/migration-ownership.md` | Alleen VDB Digital 2.0 remote |

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

Plaats het officiÃ«le logo in `public/brand/` (zie `public/brand/README.md`).
Zonder asset: tekstbranding alleen.

## Status

```text
VDB PARTNER SHARED BACKEND AND LOCAL ISOLATION PASS
REPOSITORY_ROLE=PARTNER_CLIENT
CANONICAL_BACKEND_OWNER=VDB Digital 2.0 (vdbdigital2 / 54321)
LOCAL_PROJECT_ID=vdb-partners
LOCAL_API=54421
LOCAL_DB=54422
LOCAL_STUDIO=54423
LOCAL_MAIL=54424
LOCAL_ANALYTICS=54427
CONTRACT=vdb-backend-contract@0.1.0
SCHEMA_VERSION=2026.07.22.freeze
SIBLING_RESOURCES_CHANGED=NO
REMOTE_ACTIONS=NONE
PRODUCTION_NOT_ACTIVATED
EXTERNAL_PROVIDERS_NOT_ACTIVATED
```
