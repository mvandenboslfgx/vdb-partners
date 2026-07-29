import {
  RC5_ACTIVATION_BLOCK_CODES,
  type Rc5ActivationBlockCode,
} from "@/lib/contract/pin";
import type { PartnerType } from "@/lib/validation/partner-type";

export type ActivationChecklist = {
  canActivate: boolean;
  missing: string[];
  checks: Record<string, unknown>;
};

export type PartnerFacingStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "in_review"
  | "compliance_incomplete"
  | "active"
  | "rejected"
  | "suspended"
  | "reverification_required"
  | "unknown_safe";

const APPLICATION_STATUS_MAP: Record<string, PartnerFacingStatus> = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  IN_REVIEW: "in_review",
  APPROVED: "compliance_incomplete",
  REJECTED: "rejected",
  WITHDRAWN: "not_started",
};

const PROFILE_STATUS_MAP: Record<string, PartnerFacingStatus> = {
  PENDING: "in_review",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  REVOKED: "suspended",
};

export const ACTIVATION_CHECK_COPY: Record<
  Rc5ActivationBlockCode | string,
  { title: string; body: string; selfService: boolean }
> = {
  PARTNER_TYPE_UNKNOWN: {
    title: "Partnertype",
    body: "Uw partnertype is nog niet vastgelegd. VDB neemt contact op.",
    selfService: false,
  },
  PARTNER_SUSPENDED: {
    title: "Schorsing",
    body: "Uw partneraccount is geschorst. Neem contact op met VDB Partner Support.",
    selfService: false,
  },
  STAFF_APPROVAL_MISSING: {
    title: "Beoordeling door VDB",
    body: "Uw aanvraag wacht nog op goedkeuring door VDB.",
    selfService: false,
  },
  AGE_NOT_VERIFIED: {
    title: "Leeftijdsverificatie",
    body: "Leeftijdsverificatie (18+) is nog niet afgerond. VDB neemt contact met u op.",
    selfService: false,
  },
  IDENTITY_NOT_VERIFIED: {
    title: "Identiteitsverificatie",
    body: "Identiteitsverificatie is nog niet beschikbaar. Publieke onboarding is nog niet volledig geopend.",
    selfService: false,
  },
  BUSINESS_NOT_VERIFIED: {
    title: "Bedrijfsverificatie",
    body: "Bedrijfsverificatie is nog niet afgerond. VDB neemt contact met u op.",
    selfService: false,
  },
  COMPANY_DETAILS_MISSING: {
    title: "Bedrijfsgegevens",
    body: "Bedrijfsnaam of KvK ontbreekt voor uw zakelijke aanvraag.",
    selfService: false,
  },
  AGREEMENT_NOT_ACCEPTED: {
    title: "Partnerovereenkomst",
    body: "De actuele partnerovereenkomst is nog niet geaccepteerd. Juridische teksten zijn nog niet vrijgegeven.",
    selfService: false,
  },
  PAYOUT_PROFILE_NOT_APPROVED: {
    title: "Payoutprofiel",
    body: "Uw uitbetalingsgegevens zijn nog niet goedgekeurd. Uitbetalingen blijven uitgeschakeld.",
    selfService: false,
  },
  UNKNOWN: {
    title: "Onbekende stap",
    body: "Er ontbreekt een activatiestap die niet veilig kan worden weergegeven. Neem contact op met VDB.",
    selfService: false,
  },
};

export function isKnownActivationBlockCode(
  code: string,
): code is Rc5ActivationBlockCode {
  return (RC5_ACTIVATION_BLOCK_CODES as readonly string[]).includes(code);
}

/**
 * Derive partner-facing status. Unknown Owner statuses never map to active.
 * Staff approval alone never implies ACTIVE.
 */
export function derivePartnerFacingStatus(input: {
  profileStatus?: string | null;
  applicationStatus?: string | null;
  legacyGrandfathered?: boolean | null;
  canActivate?: boolean | null;
  missing?: string[] | null;
}): PartnerFacingStatus {
  const profile = (input.profileStatus ?? "").toUpperCase();
  const application = (input.applicationStatus ?? "").toUpperCase();

  if (!profile && !application) return "not_started";

  if (profile === "SUSPENDED" || profile === "REVOKED") return "suspended";
  if (profile === "ACTIVE") {
    if (input.legacyGrandfathered) return "active";
    return "active";
  }

  if (application === "REJECTED") return "rejected";
  if (application === "DRAFT") return "draft";
  if (application === "SUBMITTED") return "submitted";
  if (application === "IN_REVIEW") return "in_review";

  if (profile === "PENDING") {
    const missing = input.missing ?? [];
    if (
      missing.includes("IDENTITY_NOT_VERIFIED") ||
      missing.includes("AGE_NOT_VERIFIED") ||
      missing.includes("BUSINESS_NOT_VERIFIED") ||
      missing.includes("AGREEMENT_NOT_ACCEPTED") ||
      missing.includes("PAYOUT_PROFILE_NOT_APPROVED") ||
      missing.includes("COMPANY_DETAILS_MISSING")
    ) {
      if (
        application === "APPROVED" ||
        missing.includes("STAFF_APPROVAL_MISSING") === false
      ) {
        return "compliance_incomplete";
      }
    }
    if (PROFILE_STATUS_MAP[profile]) return PROFILE_STATUS_MAP[profile];
  }

  if (APPLICATION_STATUS_MAP[application]) {
    return APPLICATION_STATUS_MAP[application];
  }

  if (profile && !PROFILE_STATUS_MAP[profile]) {
    return "unknown_safe";
  }

  if (application && !APPLICATION_STATUS_MAP[application]) {
    return "unknown_safe";
  }

  return profile ? "in_review" : "unknown_safe";
}

export const PARTNER_FACING_STATUS_COPY: Record<
  PartnerFacingStatus,
  { title: string; body: string }
> = {
  not_started: {
    title: "Aanvraag nog niet gestart",
    body: "Start uw partneraanvraag om toegang tot het Partner Portal aan te vragen.",
  },
  draft: {
    title: "Conceptaanvraag",
    body: "Uw aanvraag is opgeslagen als concept en nog niet ingediend.",
  },
  submitted: {
    title: "Aanvraag ingediend",
    body: "Uw aanvraag is ontvangen. Indienen activeert uw account niet automatisch.",
  },
  in_review: {
    title: "In beoordeling",
    body: "VDB beoordeelt uw aanvraag. Verkoopfunctionaliteit blijft geblokkeerd tot uw status ACTIVE is.",
  },
  compliance_incomplete: {
    title: "Compliance incompleet",
    body: "Goedkeuring alleen is niet voldoende. Rond de ontbrekende verificatie- en overeenkomststappen af voordat activatie mogelijk is.",
  },
  active: {
    title: "Actief",
    body: "Uw partnerprofiel is ACTIVE. Catalogus- en leadfunctionaliteit zijn beschikbaar volgens uw rechten.",
  },
  rejected: {
    title: "Aanvraag afgewezen",
    body: "Uw partneraanvraag is afgewezen. Neem contact op met VDB Partner Support.",
  },
  suspended: {
    title: "Account geschorst",
    body: "Uw partnerprofiel is geschorst of ingetrokken. Verkoopacties zijn geblokkeerd.",
  },
  reverification_required: {
    title: "Herverificatie vereist",
    body: "Er is opnieuw verificatie nodig voordat uw account volledig actief kan blijven.",
  },
  unknown_safe: {
    title: "Status niet beschikbaar",
    body: "Uw partnerstatus kon niet veilig worden bepaald. Behandel dit account als niet-actief en neem contact op met VDB.",
  },
};

export function agreementFamilyForPartnerType(
  partnerType: PartnerType | null | undefined,
): "INDIVIDUAL_PARTNER" | "BUSINESS_PARTNER" | null {
  if (partnerType === "INDIVIDUAL") return "INDIVIDUAL_PARTNER";
  if (partnerType === "BUSINESS") return "BUSINESS_PARTNER";
  return null;
}

export function parseActivationChecklist(
  raw: unknown,
): ActivationChecklist | null {
  if (!raw || typeof raw !== "object") return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const missing = Array.isArray(record.missing)
    ? record.missing.filter((item): item is string => typeof item === "string")
    : [];
  return {
    canActivate: record.can_activate === true || record.canActivate === true,
    missing,
    checks:
      record.checks && typeof record.checks === "object"
        ? (record.checks as Record<string, unknown>)
        : {},
  };
}
