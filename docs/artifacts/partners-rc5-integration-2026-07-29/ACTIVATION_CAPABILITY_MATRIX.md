# ACTIVATION_CAPABILITY_MATRIX

Authorization boundary: Owner `partner_profiles.status` + RPCs. Client UI is UX-only.

| Capability                            | ACTIVE                                     | PENDING     | SUSPENDED                   | Customer / Anon     |
| ------------------------------------- | ------------------------------------------ | ----------- | --------------------------- | ------------------- |
| view_catalog (`list_partner_catalog`) | 11 products                                | `FORBIDDEN` | `FORBIDDEN`                 | `FORBIDDEN` / empty |
| create_lead                           | gated (fake product → `PRODUCT_NOT_FOUND`) | `FORBIDDEN` | `FORBIDDEN`                 | `FORBIDDEN`         |
| confirm_sale                          | `FORBIDDEN` (staff-only RPC)               | deny        | `FORBIDDEN`                 | deny                |
| claim_commission / financial          | own summary allowed when ACTIVE            | deny        | `FORBIDDEN`                 | deny                |
| payout_action                         | `FEATURE_NOT_CONFIGURED` (fail-closed)     | deny        | deny                        | deny                |
| support_own_tickets                   | allowed                                    | allowed     | allowed (no internal notes) | n/a                 |
| manage_profile                        | allowed                                    | allowed     | allowed                     | n/a                 |
| admin / owner routes                  | n/a for partner JWT                        | n/a         | deny                        | n/a                 |

## Activation rules proven

- Staff approval alone ≠ ACTIVE (checklist still lists missing codes for grandfathered ACTIVE fixtures).
- `can_activate: false` for suspended; missing includes `PARTNER_SUSPENDED`.
- No client self-activation path in Partner portal RC5 work.
- Unit: `tests/unit/activation-capabilities-rc5.test.ts` — PASS.
