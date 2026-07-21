# Production readiness

## Current status

```text
VDB PARTNER PORTAL LOCAL AUTHORIZATION PASS
PRODUCTION NOT ACTIVATED
EXTERNAL PROVIDERS NOT ACTIVATED
FULL BUSINESS DB FLOW VALIDATED LOCALLY
UI BUSINESS FLOW VALIDATED IN BROWSER
JWT RLS MATRIX VALIDATED LOCALLY
MFA PROVIDERS EXPORTS PRODUCTION STILL OPEN
```

## What must be true before production activation

1. Dedicated production Supabase project (isolated from other VDB products).
2. Production env vars on Vercel (never commit secrets).
3. Mollie live/test keys + webhook URL verified.
4. Resend domain verified + transactional templates checked.
5. Identity provider contract signed **or** mandatory manual review policy accepted.
6. Partner agreement reviewed by Dutch lawyer + accountant labels cleared.
7. DNS `partners.vdbdigital.nl` → Vercel project + SSL.
8. MFA enforced for owner/finance/sales/support admins (**next gate**).
9. Report exports validated.
10. Security review beyond local JWT/RLS matrix (headers, storage buckets, staging).

## Explicit non-claims

- Not production activated.
- Not payment-live.
- Not KYC-live.
- Not MFA-enforced.
- Not legally finalized.
