import { can, type Action, type Role } from "@/lib/auth/roles";
import { getCurrentProfile } from "@/lib/auth/session";

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new AuthorizationError("Authentication required");
  return profile;
}

export async function requireRole(...roles: Role[]) {
  const profile = await requireAuth();
  if (!roles.includes(profile.role))
    throw new AuthorizationError("Insufficient role");
  return profile;
}

export async function requirePermission(action: Action) {
  const profile = await requireAuth();
  if (!can(action, profile.role))
    throw new AuthorizationError(`Permission denied: ${action}`);
  return profile;
}

/** Active partner only (Owner RC2 partner_profiles.status=ACTIVE). */
export async function requirePartnerApproved() {
  const profile = await requireRole("partner");
  if (!profile.partnerApproved)
    throw new AuthorizationError("Partner approval required");
  return profile;
}

/** @deprecated Use requirePartnerApproved — kept for local seller-domain call sites during migration. */
export async function requireSellerApproved() {
  return requirePartnerApproved();
}
