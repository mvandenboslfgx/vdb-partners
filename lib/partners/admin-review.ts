/**
 * Partners v1 — administrative partner review status labels.
 * identity_verification_status=VERIFIED means administrative review completed,
 * not automatic ID-check / KYC / document / selfie.
 */

export const ADMIN_REVIEW_OUTCOMES = [
  "NOT_STARTED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "MANUAL_REVIEW",
  "EXPIRED",
] as const;

export type AdminReviewOutcome = (typeof ADMIN_REVIEW_OUTCOMES)[number];

export const ADMIN_REVIEW_REASON_CODES = [
  "PROFILE_DATA_REVIEWED",
  "CORRECTION_REQUIRED",
  "DATA_INCONSISTENT",
  "DUPLICATE_ACCOUNT_REVIEW",
  "MANUAL_REVIEW_REQUIRED",
  "ADMINISTRATIVE_REVIEW_REJECTED",
] as const;

export type AdminReviewReasonCode = (typeof ADMIN_REVIEW_REASON_CODES)[number];

export const ADMIN_REVIEW_STATUS_COPY: Record<
  string,
  { title: string; body: string }
> = {
  NOT_STARTED: {
    title: "Administratieve partnercontrole niet gestart",
    body: "VDB heeft de administratieve partnercontrole nog niet gestart. Er is geen automatische ID-check of documentupload.",
  },
  PENDING: {
    title: "Administratieve partnercontrole in beoordeling",
    body: "Uw gegevens worden administratief beoordeeld door VDB. Geen camera-, document- of selfiecontrole.",
  },
  MANUAL_REVIEW: {
    title: "Aanpassing vereist",
    body: "VDB vraagt een correctie of nadere administratieve controle. Upload geen identiteitsdocumenten via dit portaal.",
  },
  VERIFIED: {
    title: "Administratieve partnercontrole afgerond",
    body: "De administratieve partnercontrole is afgerond door bevoegd VDB-personeel. Dit bewijst geen document-, biometrische of externe ID-verificatie.",
  },
  REJECTED: {
    title: "Administratieve partnercontrole afgewezen",
    body: "De administratieve partnercontrole is afgewezen. Neem contact op met VDB. Er is geen automatische ID-check.",
  },
  EXPIRED: {
    title: "Administratieve partnercontrole verlopen",
    body: "De eerdere administratieve controle is niet meer geldig. VDB start indien nodig een nieuwe beoordeling.",
  },
};

export function adminReviewStatusCopy(status: string | null | undefined) {
  const key = (status ?? "NOT_STARTED").toUpperCase();
  return (
    ADMIN_REVIEW_STATUS_COPY[key] ?? {
      title: "Administratieve partnercontrole",
      body: "Status kon niet veilig worden weergegeven. Geen automatische ID-check.",
    }
  );
}

/** Staff actions allowed from Partners admin UI (outcome + default reason). */
export const ADMIN_REVIEW_STAFF_ACTIONS: Array<{
  outcome: "VERIFIED" | "REJECTED" | "MANUAL_REVIEW" | "NOT_STARTED";
  reasonCode: AdminReviewReasonCode;
  label: string;
}> = [
  {
    outcome: "VERIFIED",
    reasonCode: "PROFILE_DATA_REVIEWED",
    label: "Markeer administratieve controle afgerond",
  },
  {
    outcome: "MANUAL_REVIEW",
    reasonCode: "CORRECTION_REQUIRED",
    label: "Vraag aanpassing (correctie)",
  },
  {
    outcome: "REJECTED",
    reasonCode: "ADMINISTRATIVE_REVIEW_REJECTED",
    label: "Wijs administratieve controle af",
  },
  {
    outcome: "NOT_STARTED",
    reasonCode: "CORRECTION_REQUIRED",
    label: "Reset naar niet gestart",
  },
];
