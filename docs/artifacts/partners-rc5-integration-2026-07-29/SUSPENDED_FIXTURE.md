# SUSPENDED_FIXTURE

## Status: PASS

Owner-provisioned shared staging fixture consumed via local vault only.

| Field                   | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| Fixture kind            | `SUSPENDED_PARTNER_RC5`                                     |
| Staging project         | `qzekuvmgfekzsowdecyk`                                      |
| Fingerprint             | `099764f54e18`                                              |
| Partner ID masked       | `3754b24d…`                                                 |
| Status                  | `SUSPENDED`                                                 |
| `payout_eligible`       | `false`                                                     |
| Vault                   | `C:\Users\XXX\.vdb-vault\partner-staging-suspended-rc5.env` |
| Credentials in evidence | **none**                                                    |
| Production              | untouched                                                   |

## Probes (`scripts/staging-partner-rc5-validate.mjs`)

| Check                                  | Result                                       |
| -------------------------------------- | -------------------------------------------- |
| Login                                  | PASS                                         |
| Session present before logout          | PASS                                         |
| Relogin still `SUSPENDED`              | PASS                                         |
| Catalog                                | `FORBIDDEN`                                  |
| Lead create                            | `FORBIDDEN`                                  |
| Sale confirm                           | `FORBIDDEN`                                  |
| Payout request                         | denied (`FEATURE_NOT_CONFIGURED` / no write) |
| Financial summary                      | `FORBIDDEN`                                  |
| Internal notes visible                 | no                                           |
| Internal-note RPC                      | `FORBIDDEN`                                  |
| Cross-partner profile rows             | 0                                            |
| Checklist includes `PARTNER_SUSPENDED` | yes                                          |
| `can_activate`                         | false                                        |
| schemaVersion                          | `2026.07.29.partner-identity-directory-rc5`  |

ACTIVE fixtures `partner_a` / `partner_b` were **not** mutated.
