# ONBOARDING_VALIDATION_MATRIX

| Case                                      | Expected                                     | Result             |
| ----------------------------------------- | -------------------------------------------- | ------------------ |
| INDIVIDUAL without company/KVK            | accept client schema; sanitize kvk=null      | PASS (unit)        |
| INDIVIDUAL with KVK                       | reject                                       | PASS (unit)        |
| BUSINESS without companyName              | reject                                       | PASS (unit)        |
| BUSINESS with invalid KVK                 | reject                                       | PASS (unit)        |
| BUSINESS with company + 8-digit KVK       | accept                                       | PASS (unit)        |
| Type switch strips stale BUSINESS fields  | sanitize drops kvk/vat                       | PASS (unit)        |
| Legacy particular/sole_trader/company map | only INDIVIDUAL\|BUSINESS                    | PASS (unit)        |
| Explicit type required in UI              | radio required; submit disabled until chosen | PASS (code review) |
| No auto type from KvK                     | resolvePartnerTypeFromChoice ignores fields  | PASS (unit)        |
| Server remains authoritative              | RPC errors mapped; no client self-activate   | PASS               |
| Submit ⇒ PENDING not ACTIVE               | Owner handoff + staging pending fixture      | PASS (staging)     |

Tests: `tests/unit/partner-application-rc5.test.ts`, `tests/unit/account-type-validation.test.ts`
