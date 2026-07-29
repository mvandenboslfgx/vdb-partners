import type { PartnerFacingStatus } from "@/lib/partners/activation";
import type { PartnerProfileStatus } from "@/lib/contract/roles";

/**
 * Commercial capabilities for the Partner Portal.
 * Authorization boundary is Owner status ACTIVE + server RPCs — never client UI alone.
 */
export const partnerCapabilities = [
  "view_catalog",
  "create_lead",
  "confirm_sale",
  "claim_commission",
  "referral_action",
  "marketing_action",
  "payout_action",
  "support_own_tickets",
  "manage_profile",
] as const;

export type PartnerCapability = (typeof partnerCapabilities)[number];

export type CapabilityDecision = {
  allowed: boolean;
  reason:
    | "active"
    | "pending"
    | "suspended"
    | "rejected"
    | "compliance_incomplete"
    | "unknown_status"
    | "payout_disabled"
    | "not_partner";
};

const ALWAYS_SAFE: readonly PartnerCapability[] = [
  "manage_profile",
  "support_own_tickets",
];

const ACTIVE_ONLY: readonly PartnerCapability[] = [
  "view_catalog",
  "create_lead",
  "confirm_sale",
  "claim_commission",
  "referral_action",
  "marketing_action",
];

/**
 * Fail-closed capability gate. Unknown / non-ACTIVE never grants sales actions.
 * Payout execution stays disabled regardless of ACTIVE.
 */
export function decidePartnerCapability(
  capability: PartnerCapability,
  input: {
    profileStatus?: PartnerProfileStatus | string | null;
    facingStatus?: PartnerFacingStatus | null;
  },
): CapabilityDecision {
  const status = (input.profileStatus ?? "").toUpperCase();
  const facing = input.facingStatus;

  if (capability === "payout_action") {
    return { allowed: false, reason: "payout_disabled" };
  }

  if (ALWAYS_SAFE.includes(capability)) {
    if (
      status === "SUSPENDED" ||
      status === "REVOKED" ||
      facing === "suspended"
    ) {
      // Support remains policy-allowed for suspended partners; profile view ok.
      if (
        capability === "support_own_tickets" ||
        capability === "manage_profile"
      ) {
        return { allowed: true, reason: "suspended" };
      }
    }
    if (!status && facing === "not_started") {
      return { allowed: false, reason: "not_partner" };
    }
    return {
      allowed: true,
      reason: status === "ACTIVE" ? "active" : "pending",
    };
  }

  if (status === "ACTIVE" && facing !== "unknown_safe") {
    if (ACTIVE_ONLY.includes(capability)) {
      return { allowed: true, reason: "active" };
    }
  }

  if (
    status === "SUSPENDED" ||
    status === "REVOKED" ||
    facing === "suspended"
  ) {
    return { allowed: false, reason: "suspended" };
  }

  if (facing === "rejected") {
    return { allowed: false, reason: "rejected" };
  }

  if (facing === "compliance_incomplete") {
    return { allowed: false, reason: "compliance_incomplete" };
  }

  if (
    status === "PENDING" ||
    facing === "submitted" ||
    facing === "in_review" ||
    facing === "draft"
  ) {
    return { allowed: false, reason: "pending" };
  }

  if (
    facing === "unknown_safe" ||
    (status && status !== "ACTIVE" && status !== "PENDING")
  ) {
    return { allowed: false, reason: "unknown_status" };
  }

  return { allowed: false, reason: "not_partner" };
}

export function requireActivePartnerCapability(
  capability: PartnerCapability,
  profileStatus: string | null | undefined,
): void {
  const decision = decidePartnerCapability(capability, {
    profileStatus,
  });
  if (!decision.allowed) {
    throw new Error(`CAPABILITY_DENIED:${capability}:${decision.reason}`);
  }
}
