# Production readiness

## Current status

```text
VDB PARTNER PORTAL LOCAL INTEGRATION PASS
PRODUCTION NOT ACTIVATED
EXTERNAL PROVIDERS NOT ACTIVATED
FULL BUSINESS E2E VALIDATION INCOMPLETE
```

## What must be true before production activation

1. Dedicated production Supabase project (isolated from other VDB products).
2. Production env vars on Vercel (never commit secrets).
3. Mollie live/test keys + webhook URL verified.
4. Resend domain verified + transactional templates checked.
5. Identity provider contract signed **or** mandatory manual review policy accepted.
6. Partner agreement reviewed by Dutch lawyer + accountant labels cleared.
7. DNS `partners.vdbdigital.nl` → Vercel project + SSL.
8. MFA enforced for owner/finance/sales/support admins.
9. Full E2E scenarios 1–7 green against staging.
10. Security review (headers, RLS spot-checks, storage buckets).

## Explicit non-claims

- Not production activated.
- Not payment-live.
- Not KYC-live.
- Not legally finalized.
