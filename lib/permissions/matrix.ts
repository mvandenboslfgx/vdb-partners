export const actions = [
  "approve_seller",
  "manage_products",
  "view_costs",
  "confirm_payment",
  "confirm_delivery",
  "release_commission",
  "process_payout",
  "view_audit",
  "manage_admins",
  "create_order",
  "view_own_orders",
  "manage_own_profile",
  "view_sellers",
  "manage_sales_status",
  "view_support",
  "export_reports",
] as const;

export type Action = (typeof actions)[number];
export type Role =
  "owner" | "admin" | "staff" | "partner" | "partner_pending" | "customer";

/**
 * Fail-closed permission matrix mapped to Owner RC2 shared roles.
 * staff ≈ SUPPORT/CONTENT; admin ≈ ADMIN; partner ≈ ACTIVE partner_profiles.
 */
const allowed: Record<Role, readonly Action[]> = {
  owner: actions,
  admin: [
    "approve_seller",
    "manage_products",
    "view_costs",
    "confirm_payment",
    "confirm_delivery",
    "release_commission",
    "process_payout",
    "view_audit",
    "view_sellers",
    "manage_sales_status",
    "view_support",
    "export_reports",
  ],
  staff: [
    "view_support",
    "confirm_delivery",
    "view_sellers",
    "manage_sales_status",
    "view_audit",
  ],
  partner: ["create_order", "view_own_orders", "manage_own_profile"],
  partner_pending: ["manage_own_profile"],
  customer: [],
};

export function can(action: Action, role: Role) {
  return allowed[role].includes(action);
}

export const permissionsFor = (role: Role) => allowed[role];
