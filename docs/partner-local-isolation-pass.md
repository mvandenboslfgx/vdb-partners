# Partner local isolation verification

**Status target:** `VDB PARTNER SHARED BACKEND AND LOCAL ISOLATION PASS`

## Verified local identity

| Item | Required | Actual |
|------|----------|--------|
| `REPOSITORY_ROLE` | `PARTNER_CLIENT` | `PARTNER_CLIENT` |
| `project_id` | `vdb-partners` | `vdb-partners` |
| API | `54421` | `http://127.0.0.1:54421` |
| DB | `54422` | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio | `54423` | `http://127.0.0.1:54423` |
| Mail | `54424` | `http://127.0.0.1:54424` |
| Analytics (local only) | offset from Digital `54327` | `54427` |
| Shadow DB | own | `54420` |
| Container prefix | `supabase_*_vdb-partners` | confirmed |

## Sibling stacks (read-only awareness — do not manage)

| Stack | `project_id` | Ports |
|-------|--------------|-------|
| VDB Digital 2.0 | `vdbdigital2` | API `54321`, DB `54322`, Studio `54323`, Mail `54324`, Analytics `54327` |
| VDB Digital Mobile | `vdb-digital-mobile-local` | API `54521`, DB `54522`, Studio `54523`, Mail `54524` |
| **This repo** | `vdb-partners` | API `54421`, DB `54422`, Studio `54423`, Mail `54424`, Analytics `54427` |

## Isolation rules

- Agents may only run `npx supabase …` inside `c:\Users\XXX\vdb-partners`.
- Never stop/rm containers that are not `*_vdb-partners`.
- Never claim `54321–54324` or `54521–54524`.
- Local migrations here are proposals; remote apply is owned by VDB Digital 2.0.

## Confirmation

| Check | Result |
|-------|--------|
| Sibling resources changed | **NO** |
| Remote actions | **NONE** |
| Shared staging/production applied | **NO** |
| Canonical backend owner | VDB Digital 2.0 (`vdbdigital2`) |

## Contract pin

| Item | Value |
|------|-------|
| Contract | `vdb-backend-contract@0.1.0` |
| `schemaVersion` | `2026.07.22.freeze` |

## Acceptance line

```text
VDB PARTNER SHARED BACKEND AND LOCAL ISOLATION PASS
```
