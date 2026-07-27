# Partner RC3 Staging UI Validation Evidence

Date: 2026-07-27  
Repository: `vdb-partners` (`REPOSITORY_ROLE=PARTNER_CLIENT`)

## Verdict

```text
PARTNER RC3 STAGING UI VALIDATION PASS
```

## Prerequisite

`OWNER RC3 STAGING AND WEBSITE VALIDATION PASS` confirmed (staging 46 / tip `20260725120300`).

## Pins

| Item                | Value                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Contract            | `vdb-backend-contract@0.2.0-rc.3`                                                    |
| schemaVersion       | `2026.07.25.messaging-support-appointments-rc3`                                      |
| Staging             | `qzekuvmgfekzsowdecyk`                                                               |
| Production denylist | `nhsrdnjfsxfikfbdmdfj`                                                               |
| Auth surfaces       | `admin_roles` + `partner_profiles` + `organization_members` (unchanged from RC2 fix) |

## Object mapping

| Surface       | Owner object                                                  |
| ------------- | ------------------------------------------------------------- |
| identity      | `admin_roles`, `partner_profiles`, `organization_members`     |
| finance       | `partner_*` + `partner_available_liability_cents`             |
| conversations | `portal_conversations`                                        |
| messages      | `portal_messages` (public only)                               |
| attachments   | `portal_message_attachments`                                  |
| support       | `portal_support_tickets` / `portal_support_replies`           |
| appointments  | `portal_appointments` + fail-closed `book_portal_appointment` |

No parallel messaging/support/appointment tables.

## Commands

| command                                      | exit | notes          |
| -------------------------------------------- | ---- | -------------- |
| `npm test`                                   | 0    | 48 tests       |
| `npx tsc --noEmit`                           | 0    |                |
| eslint (remediation paths)                   | 0    |                |
| `node scripts/staging-partner-rc3-smoke.mjs` | 0    | **55/55 PASS** |

## Fail-closed

`mollie_checkout`, `digital_product_checkout`, `partner_payouts`, `messaging_realtime`, `support_internal_notes_rpc`, `appointments_booking` all `enabled=false`. Booking RPC returns `FEATURE_DISABLED`.

## Note

Owner RPC `partner_financial_summary` returns SQL `42702` ambiguous `partner_id` on staging. Partner client validates ledger via `partner_ledger_entries` + `partner_available_liability_cents` (no Partner migration).

## Evidence

`docs/evidence/staging-rc3-ui/staging-partner-rc3-smoke.json`
