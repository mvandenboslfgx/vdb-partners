# Partner Staging Auth Routing RC2 Remediation Evidence

Date: 2026-07-27  
Repository: `vdb-partners` (`REPOSITORY_ROLE=PARTNER_CLIENT`)  
Authorized scope: LOCAL + STAGING VALIDATION ONLY

## Verdict

```text
PARTNER STAGING AUTH ROUTING RC2 REMEDIATION PASS
```

## Pins

| Item                                     | Value                                  |
| ---------------------------------------- | -------------------------------------- |
| Contract                                 | `vdb-backend-contract@0.2.0-rc.2`      |
| schemaVersion                            | `2026.07.27.financial-concurrency-rc2` |
| Staging                                  | `qzekuvmgfekzsowdecyk`                 |
| Production denylist                      | `nhsrdnjfsxfikfbdmdfj`                 |
| Checkout / Mollie / partner_payouts      | fail-closed (`enabled=false`)          |
| RC3                                      | out of scope                           |
| Push / merge / deploy / owner migrations | not executed                           |

## Root cause

`destinationForUser` / `getCurrentProfile` queried local proposal tables `user_roles` and `seller_profiles`. Against Owner staging those relations do not exist → generic login config error.

## Object mapping matrix

| component              | previous                                     | classification      | RC2 surface                                                   | change                                                            |
| ---------------------- | -------------------------------------------- | ------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `destinationForUser`   | `user_roles` + `seller_profiles`             | legacy              | `admin_roles` + `partner_profiles` (+ `organization_members`) | rewritten via `resolvePartnerIdentity` + `destinationForIdentity` |
| `getCurrentProfile`    | `user_roles` + `seller_profiles`             | legacy              | same                                                          | rewritten                                                         |
| `registerPartner`      | `user_roles` upsert seller                   | legacy              | `submit_partner_application` RPC                              | rewritten                                                         |
| dashboard loaders      | `seller_profiles` / `orders` / `commissions` | legacy              | `partner_*` + `partner_financial_summary`                     | rewritten                                                         |
| admin overview         | `seller_profiles` / `orders` / `payouts`     | legacy              | `partner_profiles` / `partner_sales` / `partner_payouts`      | rewritten                                                         |
| local seller workflows | `seller_profiles`                            | local proposal only | gated off remote/staging                                      | `assertLocalLegacySellerDomainAllowed`                            |

## Role → route matrix (staging smoke)

| account               | expected        | destination                 | result |
| --------------------- | --------------- | --------------------------- | ------ |
| part_a                | partner ACTIVE  | `/dashboard`                | PASS   |
| part_b                | partner ACTIVE  | `/dashboard`                | PASS   |
| part_pending          | partner_pending | `/onboarding`               | PASS   |
| cust_a                | customer        | `/geen-toegang?reden=klant` | PASS   |
| staff_s               | staff           | `/admin`                    | PASS   |
| admin_a               | admin           | `/admin`                    | PASS   |
| owner_o               | owner           | `/admin`                    | PASS   |
| anon                  | —               | no partner rows             | PASS   |
| part_b vs part_a lead | isolation       | empty/deny                  | PASS   |

## Commands

| command                                       | exit | notes                                    |
| --------------------------------------------- | ---- | ---------------------------------------- |
| `npm test`                                    | 0    | 46 tests / 19 files                      |
| `npx tsc --noEmit`                            | 0    |                                          |
| `npx eslint .`                                | 0    | warnings only in pre-existing unit files |
| prettier (remediation paths)                  | 0    |                                          |
| `node scripts/staging-partner-auth-smoke.mjs` | 0    | 33/33 PASS — evidence JSON below         |

## Evidence artifacts

- `docs/evidence/staging-auth-routing-rc2/staging-partner-auth-smoke.json`
- Contract snapshot: `contracts/vdb-backend-contract-0.2.0-rc.2/`

No secrets committed. Staging credentials remain in operator vault (sibling preflight `.vault`, gitignored).
