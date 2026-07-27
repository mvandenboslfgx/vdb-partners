import type { PartnerIdentity } from "@/lib/auth/identity";
import { PartnerPortalError } from "@/lib/contract/errors";

export type DestinationReason =
  | "admin"
  | "partner_dashboard"
  | "partner_pending"
  | "partner_blocked"
  | "customer_denied"
  | "incomplete";

export type DestinationResult = {
  path: string;
  reason: DestinationReason;
};

/**
 * Post-login routing derived solely from Owner RC2 identity surfaces.
 * Never reads user_roles / seller_profiles.
 */
export function destinationForIdentity(
  identity: PartnerIdentity,
): DestinationResult {
  if (identity.partnerBlocked) {
    return { path: "/geen-toegang?reden=geschorst", reason: "partner_blocked" };
  }

  if (
    identity.primaryRole === "owner" ||
    identity.primaryRole === "admin" ||
    identity.primaryRole === "staff"
  ) {
    return { path: "/admin", reason: "admin" };
  }

  if (identity.primaryRole === "partner") {
    return { path: "/dashboard", reason: "partner_dashboard" };
  }

  if (identity.primaryRole === "partner_pending") {
    return { path: "/onboarding", reason: "partner_pending" };
  }

  if (identity.primaryRole === "customer" || identity.isCustomerMember) {
    return { path: "/geen-toegang?reden=klant", reason: "customer_denied" };
  }

  return { path: "/geen-toegang?reden=onvolledig", reason: "incomplete" };
}

export function assertRoutableIdentity(
  identity: PartnerIdentity,
): DestinationResult {
  const destination = destinationForIdentity(identity);
  if (destination.reason === "incomplete") {
    throw new PartnerPortalError(
      "IDENTITY_INCOMPLETE",
      "Account has no routable partner or staff role",
    );
  }
  return destination;
}
