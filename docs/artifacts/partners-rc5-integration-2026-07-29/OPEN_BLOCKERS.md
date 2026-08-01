# OPEN_BLOCKERS

## Hard blockers for this PASS gate

**None.** Suspended staging fixture is available and tested.

## Residual / non-blocking (product & ops)

1. **Externe IDV/KYC-provider** — **de-scoped voor v1**. Geen Veriff/Sumsub/Onfido.
   Portal toont administratieve partnercontrole-copy (geen automatische ID-check).
   Activation checklist / identity-statusvelden blijven ongewijzigd tot aparte
   contractsemantiek is goedgekeurd.
2. **Juridische Partnerovereenkomsten niet definitief** — `legal_review_status=REQUIRED`; no binding acceptance simulated.
3. **Fiscale behandeling niet definitief** — Owner legal/fiscal decisions; portal does not invent fiscal processing.
4. **Payoutprovider/bankverificatie niet geïmplementeerd** — payout execution + Mollie remain fail-closed.
5. **Publieke Partner-onboarding niet geautoriseerd** — intake/capability work is staging-gated; no public open.
6. **Dual lockfile drift** — both `package-lock.json` and `pnpm-lock.yaml` present; canonical tooling remains npm scripts (`npx`/`npm test`); no lockfile deleted or rewritten in this freeze.
7. **Legacy staging partners `partner_type=null`** — Owner grandfathering; new intake collects explicit type.
8. **Full Playwright clickability sweep** — not re-executed in resume gate; capability/RPC matrix covers security-critical actions.
9. **Mobile live AAL2 on device** — out of Partners scope (phone not attached per gate).
