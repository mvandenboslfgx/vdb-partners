# STAGING_MATRIX

- **Project:** `qzekuvmgfekzsowdecyk` only
- **Production:** `nhsrdnjfsxfikfbdmdfj` untouched (denylist asserted)
- **Contract:** `vdb-backend-contract@0.2.0-rc.5`
- **schemaVersion:** `2026.07.29.partner-identity-directory-rc5`
- **Script:** `scripts/staging-partner-rc5-validate.mjs`
- **Raw:** `staging-matrix-raw.json`
- **Run:** 2026-07-29T07:19Z / re-run with ID redaction — **22/22 PASS**

| Case                                                   | OK  |
| ------------------------------------------------------ | --- |
| env_ref_guard                                          | yes |
| local_contract_pin RC5                                 | yes |
| production_denylist                                    | yes |
| login_partner_a ACTIVE + catalog 11                    | yes |
| catalog_product_count = 11                             | yes |
| login_partner_b ACTIVE + catalog 11                    | yes |
| login_partner_pending PENDING + catalog/lead FORBIDDEN | yes |
| login_customer_a no partner caps                       | yes |
| login_staff                                            | yes |
| login_admin                                            | yes |
| suspended_fixture (+ login/relogin/capability denies)  | yes |
| account_session_isolation                              | yes |
| anon_partner_leads_deny                                | yes |
| anon_catalog_deny                                      | yes |

## Partnertype / onboarding

- Unit + schema: INDIVIDUAL without company/KVK; BUSINESS requires company + valid KVK — PASS (`partner-application-rc5`, `account-type-validation`)
- Staging legacy ACTIVE fixtures remain `partner_type=null` (Owner grandfathering) — not a FAIL
- Live ephemeral typed signup against staging not forced (email-confirm / fixture pollution); covered by unit + Owner gate

## Not executed as live UI clickability suite

Browser clickability of every portal control was **not** re-run as Playwright in this resume gate → reported separately as non-FAIL residual (code paths gated; no empty KYC CTA introduced). See OPEN_BLOCKERS residual note.
