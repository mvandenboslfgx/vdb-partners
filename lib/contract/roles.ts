export const sharedRoles = [
  "customer",
  "partner_pending",
  "partner",
  "staff",
  "admin",
  "owner",
] as const;

export type SharedRole = (typeof sharedRoles)[number];

export type AdminRole = "OWNER" | "ADMIN" | "SUPPORT" | "CONTENT";
export type PartnerProfileStatus =
  "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";

export function isSharedRole(value: unknown): value is SharedRole {
  return (
    typeof value === "string" &&
    (sharedRoles as readonly string[]).includes(value)
  );
}

/** Highest privilege first — matches Owner RC2 shared role model. */
export const ROLE_PRIORITY: readonly SharedRole[] = [
  "owner",
  "admin",
  "staff",
  "partner",
  "partner_pending",
  "customer",
] as const;

export function mapAdminRoleToShared(
  role: string | null | undefined,
): SharedRole | null {
  switch ((role ?? "").toUpperCase()) {
    case "OWNER":
      return "owner";
    case "ADMIN":
      return "admin";
    case "SUPPORT":
    case "CONTENT":
      return "staff";
    default:
      return null;
  }
}

export function mapPartnerStatusToShared(
  status: string | null | undefined,
): SharedRole | null {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "partner";
    case "PENDING":
      return "partner_pending";
    case "SUSPENDED":
    case "REVOKED":
      return null;
    default:
      return null;
  }
}

export function pickPrimaryRole(
  roles: readonly SharedRole[],
): SharedRole | null {
  return ROLE_PRIORITY.find((candidate) => roles.includes(candidate)) ?? null;
}
