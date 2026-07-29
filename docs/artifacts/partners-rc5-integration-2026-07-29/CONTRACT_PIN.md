# CONTRACT_PIN

| Field          | Value                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Contract       | `vdb-backend-contract@0.2.0-rc.5`                                                                       |
| schemaVersion  | `2026.07.29.partner-identity-directory-rc5`                                                             |
| Bundle SHA-256 | `304f83cdc7ff98a525854d6be1a17bb8b5723c1dbcb2c44a5f35451a1cbd9f54`                                      |
| Source         | Owner `contracts/releases/vdb-backend-contract-0.2.0-rc.5` @ `8264893c25ba6438393c0469fcc623c68fbfa93d` |
| Vendored path  | `contracts/vdb-backend-contract-0.2.0-rc.5/`                                                            |
| Runtime import | `lib/contract/pin.ts`                                                                                   |
| Staging        | `qzekuvmgfekzsowdecyk`                                                                                  |
| Production     | `nhsrdnjfsxfikfbdmdfj` (not applied / not deployed by this gate)                                        |

## Fail-closed

- Contract / schemaVersion drift via env assert helpers
- Wrong Supabase project ref
- Missing capabilities for non-ACTIVE partners
- Missing RPCs surface as errors (not silently ignored)
- Partner sales actions require Owner `ACTIVE`

## Staging proof

`partner_activation_checklist` returned `schema_version: 2026.07.29.partner-identity-directory-rc5` for ACTIVE and PENDING fixtures.
