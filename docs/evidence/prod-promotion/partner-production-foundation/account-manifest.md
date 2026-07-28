# Account manifest (non-secret)

Source vault (outside Git): `C:\Users\XXX\.vdb-vault\partner-production-auth-smoke.env`  
ACL: local user `(R,W)` + `SYSTEM:(F)` (Windows may also attach ephemeral LogonSession RX).

## Auth user counts

| Moment | Count |
|--------|-------|
| Preflight inventory | 9 |
| After partner provisioning | 12 |

Delta: +3 synthetic partner smoke users (`prod-smoke-partner-a/b/pending`).

## Partners (masked)

| Alias | User ID | Partner ID | Role/status | Org/partner |
|-------|---------|------------|-------------|-------------|
| prod-smoke-partner-a | `0185bb84…` | `7ca28b9c…` | partner / ACTIVE | partner_profiles |
| prod-smoke-partner-b | `d71180a7…` | `4d35f26b…` | partner / ACTIVE | partner_profiles |
| prod-smoke-partner-pending | `2ab57632…` | `a794a308…` | partner_pending / PENDING | partner_profiles |

`payout_eligible=false` on all three. Synthetic emails `@vdbdigital.invalid`.

## Handoff (Owner production smoke — same project)

Aliases present in partner vault via secure local handoff (no passwords in this file):

- cust_a, cust_b, staff, admin, owner

Marker: `PARTNER_PROD_SMOKE_RC3` / Owner `PROD_SMOKE_RC3`.
