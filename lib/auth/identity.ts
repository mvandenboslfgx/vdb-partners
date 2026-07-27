import type { SupabaseClient } from "@supabase/supabase-js";
import { PartnerPortalError } from "@/lib/contract/errors";
import {
  mapAdminRoleToShared,
  mapPartnerStatusToShared,
  pickPrimaryRole,
  type PartnerProfileStatus,
  type SharedRole,
} from "@/lib/contract/roles";
import { assertRc2OwnerTable } from "@/lib/contract/surfaces";

export type PartnerIdentity = {
  userId: string;
  email: string | null;
  roles: SharedRole[];
  primaryRole: SharedRole | null;
  adminRole: string | null;
  partnerProfileId: string | null;
  partnerStatus: PartnerProfileStatus | null;
  partnerDisplayName: string | null;
  isCustomerMember: boolean;
  partnerBlocked: boolean;
};

type IdentityClient = Pick<SupabaseClient, "from">;

function isMissingRelationError(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

export async function resolvePartnerIdentity(
  client: IdentityClient,
  userId: string,
  email: string | null = null,
): Promise<PartnerIdentity> {
  assertRc2OwnerTable("admin_roles");
  assertRc2OwnerTable("partner_profiles");
  assertRc2OwnerTable("organization_members");

  const [adminResult, partnerResult, memberResult] = await Promise.all([
    client
      .from("admin_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("partner_profiles")
      .select("id, status, display_name")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .limit(1),
  ]);

  for (const result of [adminResult, partnerResult, memberResult]) {
    if (result.error && isMissingRelationError(result.error)) {
      throw new PartnerPortalError(
        "IDENTITY_LOOKUP_FAILED",
        "Owner RC2 identity surfaces are unavailable in this environment",
      );
    }
    if (result.error) {
      throw new PartnerPortalError(
        "IDENTITY_LOOKUP_FAILED",
        result.error.message,
      );
    }
  }

  const roles: SharedRole[] = [];
  const adminRole = adminResult.data?.role
    ? String(adminResult.data.role)
    : null;
  const sharedAdmin = mapAdminRoleToShared(adminRole);
  if (sharedAdmin) roles.push(sharedAdmin);

  const partnerStatus =
    (partnerResult.data?.status as PartnerProfileStatus | null) ?? null;
  const partnerBlocked =
    partnerStatus === "SUSPENDED" || partnerStatus === "REVOKED";
  const sharedPartner = mapPartnerStatusToShared(partnerStatus);
  if (sharedPartner) roles.push(sharedPartner);

  const isCustomerMember =
    Array.isArray(memberResult.data) && memberResult.data.length > 0;
  if (isCustomerMember) roles.push("customer");

  return {
    userId,
    email,
    roles: [...new Set(roles)],
    primaryRole: pickPrimaryRole(roles),
    adminRole,
    partnerProfileId: partnerResult.data?.id
      ? String(partnerResult.data.id)
      : null,
    partnerStatus,
    partnerDisplayName: partnerResult.data?.display_name
      ? String(partnerResult.data.display_name)
      : null,
    isCustomerMember,
    partnerBlocked,
  };
}
