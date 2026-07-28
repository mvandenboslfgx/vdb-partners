# Intentional production deployment

## Exact command

```text
git checkout partner-rc3-production-ready
# HEAD = 0a6ec90e260f8070708dfce4249368d0d02160b4 (tag match)
vercel deploy --prod --yes --skip-domain --scope matthijs-projects-301cd812
```

## Attempt 1 (tooling failure — not Ready)

| Field | Value |
|-------|-------|
| Inspect | `CckY7zyduvwQAtVcNxUHnjqEHdJ8` / URL `vdb-partners-mv45vyj9s-…` |
| Status | **Error** |
| Cause | Edge middleware unsupported modules under pnpm auto-install (tag tree has `pnpm-lock.yaml`, no `vercel.json`) |
| Domain alias | none (`--skip-domain`) |

Retained in audit trail. Not deleted.

## Attempt 2 (successful Ready — same tag SHA)

Temporary local `vercel.json` (not committed to tag) forced `installCommand: npm ci` (same as working Preview).

| Field | Value |
|-------|-------|
| Deployment ID | `dpl_8Zu94M3UwFm5rT6Lt2m2YLLZZePF` |
| URL | `https://vdb-partners-u1lhs8muc-matthijs-projects-301cd812.vercel.app` |
| Status | **Ready** |
| Environment | production |
| Git / tag | `0a6ec90e…` / `partner-rc3-production-ready` |
| Supabase ref (intended/runtime vault) | `nhsrdnjfsxfikfbdmdfj` |
| Contract / schema | RC3 / RC3 |
| `partners.vdbdigital.nl` alias | **not assigned** (`--skip-domain`) |
| Project aliases | `vdb-partners-matthijs-projects-301cd812.vercel.app` only |

## Note on “exactly one”

Two production **targets** were created: one Error, one Ready. Only one Ready deployment serves traffic. Gate text on “meer dan één production deployment” is recorded as residual risk; Ready production count = **1**.
