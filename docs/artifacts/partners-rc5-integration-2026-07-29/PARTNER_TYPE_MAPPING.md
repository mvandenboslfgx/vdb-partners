# PARTNER_TYPE_MAPPING

## Owner canonical

| Owner        | NL label    |
| ------------ | ----------- |
| `INDIVIDUAL` | Particulier |
| `BUSINESS`   | Zakelijk    |

No third top-level type.

## Legacy → Owner

| Legacy UI     | Owner        |
| ------------- | ------------ |
| `particular`  | `INDIVIDUAL` |
| `sole_trader` | `BUSINESS`   |
| `company`     | `BUSINESS`   |

Optional UI-only `businessSubtype` (`sole_trader` \| `company`) may be collected for BUSINESS; it is **never** sent as `p_partner_type`.

## Rules implemented

- Explicit radio choice required on `/register`
- Type never inferred from companyName / KvK / trade name
- `sanitizePartnerApplicationForSubmit` strips KvK/VAT for INDIVIDUAL
- INDIVIDUAL + any KvK → validation reject
- BUSINESS requires companyName + exact 8-digit KvK

## Code

- `lib/validation/partner-type.ts`
- `lib/validation/partner-application.ts`
- `components/forms/auth-forms.tsx`
- `app/actions/auth.ts` → typed `submit_partner_application`
