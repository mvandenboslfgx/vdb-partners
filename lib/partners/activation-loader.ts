import { createClient } from "@/lib/supabase/server";
import { assertOwnerContractTable } from "@/lib/contract/surfaces";
import {
  derivePartnerFacingStatus,
  parseActivationChecklist,
  type ActivationChecklist,
  type PartnerFacingStatus,
} from "@/lib/partners/activation";
import type { PartnerType } from "@/lib/validation/partner-type";

export type PartnerActivationView = {
  partnerId: string | null;
  profileStatus: string | null;
  applicationStatus: string | null;
  partnerType: PartnerType | null;
  typeClassificationStatus: string | null;
  displayName: string | null;
  legalName: string | null;
  legacyGrandfathered: boolean;
  payoutProfileStatus: string | null;
  requiredAgreementType: string | null;
  requiredAgreementVersion: string | null;
  agreementLegalReviewStatus: string | null;
  agreementIsCurrent: boolean | null;
  agreementAcceptedAt: string | null;
  facingStatus: PartnerFacingStatus;
  checklist: ActivationChecklist | null;
  identityVerificationStatus: string | null;
  ageVerificationStatus: string | null;
  businessVerificationStatus: string | null;
  staffApprovedAt: string | null;
};

type PartnerProfileRow = {
  id: string;
  status: string | null;
  display_name: string | null;
  legal_name: string | null;
  partner_type: string | null;
  type_classification_status: string | null;
  age_verification_status: string | null;
  identity_verification_status: string | null;
  business_verification_status: string | null;
  payout_profile_status: string | null;
  staff_approved_at: string | null;
  legacy_activation_grandfathered: boolean | null;
  activation_block_codes: string[] | null;
  required_agreement_type: string | null;
  required_agreement_version: string | null;
};

function asPartnerType(value: unknown): PartnerType | null {
  if (value === "INDIVIDUAL" || value === "BUSINESS") return value;
  return null;
}

/**
 * Load Owner RC5 activation view for the signed-in partner.
 * Checklist is diagnostic only — never an authorization source for mutations.
 */
export async function loadPartnerActivationView(
  userId: string,
): Promise<PartnerActivationView> {
  assertOwnerContractTable("partner_profiles");
  assertOwnerContractTable("partner_applications");
  assertOwnerContractTable("partner_agreement_versions");
  assertOwnerContractTable("partner_agreement_acceptances");

  const supabase = await createClient();
  const { data: partnerRaw, error } = await supabase
    .from("partner_profiles")
    .select(
      "id, status, display_name, legal_name, partner_type, type_classification_status, age_verification_status, identity_verification_status, business_verification_status, payout_profile_status, staff_approved_at, legacy_activation_grandfathered, activation_block_codes, required_agreement_type, required_agreement_version",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  const partner = partnerRaw as PartnerProfileRow | null;

  if (!partner) {
    return {
      partnerId: null,
      profileStatus: null,
      applicationStatus: null,
      partnerType: null,
      typeClassificationStatus: null,
      displayName: null,
      legalName: null,
      legacyGrandfathered: false,
      payoutProfileStatus: null,
      requiredAgreementType: null,
      requiredAgreementVersion: null,
      agreementLegalReviewStatus: null,
      agreementIsCurrent: null,
      agreementAcceptedAt: null,
      facingStatus: "not_started",
      checklist: null,
      identityVerificationStatus: null,
      ageVerificationStatus: null,
      businessVerificationStatus: null,
      staffApprovedAt: null,
    };
  }

  const [
    { data: application },
    checklistResult,
    agreementVersionResult,
    acceptanceResult,
  ] = await Promise.all([
    supabase
      .from("partner_applications")
      .select("status, partner_type")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase.rpc("partner_activation_checklist", {
      p_partner_id: partner.id,
    }),
    partner.required_agreement_type
      ? supabase
          .from("partner_agreement_versions")
          .select(
            "id, version, agreement_type, is_current, legal_review_status",
          )
          .eq("agreement_type", partner.required_agreement_type)
          .eq("is_current", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("partner_agreement_acceptances")
      .select("accepted_at, agreement_version_id")
      .eq("partner_id", partner.id)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const checklist =
    parseActivationChecklist(checklistResult.data) ??
    (Array.isArray(partner.activation_block_codes)
      ? {
          canActivate: false,
          missing: partner.activation_block_codes,
          checks: {},
        }
      : null);

  const facingStatus = derivePartnerFacingStatus({
    profileStatus: partner.status,
    applicationStatus:
      (application as { status?: string } | null)?.status ?? null,
    legacyGrandfathered: partner.legacy_activation_grandfathered === true,
    canActivate: checklist?.canActivate ?? false,
    missing: checklist?.missing ?? null,
  });

  if (facingStatus === "unknown_safe") {
    console.info(
      JSON.stringify({
        event: "partner_status_unknown_safe",
        profileStatus: partner.status ?? null,
        applicationStatus:
          (application as { status?: string } | null)?.status ?? null,
        partnerIdPrefix: String(partner.id).slice(0, 8),
      }),
    );
  }

  const agreementRow = agreementVersionResult.data as {
    legal_review_status?: string | null;
    is_current?: boolean | null;
  } | null;
  const acceptanceRow = acceptanceResult.data as {
    accepted_at?: string | null;
  } | null;

  return {
    partnerId: partner.id,
    profileStatus: partner.status ?? null,
    applicationStatus:
      (application as { status?: string } | null)?.status ?? null,
    partnerType: asPartnerType(
      partner.partner_type ??
        (application as { partner_type?: string } | null)?.partner_type,
    ),
    typeClassificationStatus: partner.type_classification_status ?? null,
    displayName: partner.display_name ?? null,
    legalName: partner.legal_name ?? null,
    legacyGrandfathered: partner.legacy_activation_grandfathered === true,
    payoutProfileStatus: partner.payout_profile_status ?? null,
    requiredAgreementType: partner.required_agreement_type ?? null,
    requiredAgreementVersion: partner.required_agreement_version ?? null,
    agreementLegalReviewStatus: agreementRow?.legal_review_status ?? null,
    agreementIsCurrent: agreementRow?.is_current ?? null,
    agreementAcceptedAt: acceptanceRow?.accepted_at ?? null,
    facingStatus,
    checklist,
    identityVerificationStatus: partner.identity_verification_status ?? null,
    ageVerificationStatus: partner.age_verification_status ?? null,
    businessVerificationStatus: partner.business_verification_status ?? null,
    staffApprovedAt: partner.staff_approved_at ?? null,
  };
}
