# Partnercontrole (v1 — geen externe IDV)

Partners v1 gebruikt **geen** automatische ID-check, KYC-provider (Veriff/Sumsub/Onfido),
camera-opname, documentupload, selfie of liveness.

Partnergegevens worden **administratief beoordeeld** door VDB Digital. Databasevelden
zoals `identity_verification_status` blijven bestaan voor fail-closed activationgates en
eventuele latere optionele IDV; ze impliceren geen live provider.

- Feature flag `identity_verification_enabled` blijft **false** (fail-closed).
- `lib/verification/*` is gequarantaineerd / fail-closed en zit niet in het actieve
  Partner-onboardingpad.
- Upload van identiteitsdocumenten via onboarding of support is niet aangeboden en
  mag niet worden toegevoegd zonder aparte privacy/juridische goedkeuring.

Open productbeslissingen (age-gate, identity-gate-semantiek, bank/payout) staan in de
Owner-artifacten onder `docs/artifacts/…/DECISION_*` en worden **niet** hier ingevuld.
