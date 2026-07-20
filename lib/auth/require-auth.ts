import { can, type Action, type Role } from "@/lib/auth/roles";
import { getCurrentProfile } from "@/lib/auth/session";

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") { super(message); this.name = "AuthorizationError"; }
}

export async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new AuthorizationError("Authentication required");
  return profile;
}
export async function requireRole(...roles: Role[]) {
  const profile = await requireAuth();
  if (!roles.includes(profile.role)) throw new AuthorizationError("Insufficient role");
  return profile;
}
export async function requirePermission(action: Action) {
  const profile = await requireAuth();
  if (!can(action, profile.role)) throw new AuthorizationError(`Permission denied: ${action}`);
  return profile;
}
export async function requireSellerApproved() {
  const profile = await requireRole("seller");
  if (!profile.sellerApproved) throw new AuthorizationError("Seller approval required");
  return profile;
}
