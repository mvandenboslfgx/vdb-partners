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
export type Role = "owner" | "finance_admin" | "sales_admin" | "support_admin" | "seller";

/**
 * Fail-closed permission matrix.
 * Sales admin must NOT see costs/margins or execute payouts.
 * Support admin must NOT mutate financial data.
 * Finance admin must NOT promote owners/admins or rewrite agreements.
 */
const allowed: Record<Role, readonly Action[]> = {
  owner: actions,
  finance_admin: [
    "view_costs",
    "confirm_payment",
    "release_commission",
    "process_payout",
    "view_audit",
    "export_reports",
    "view_sellers",
  ],
  sales_admin: [
    "approve_seller",
    "view_sellers",
    "manage_sales_status",
    "confirm_delivery",
    "view_support",
    "view_audit",
  ],
  support_admin: ["view_support", "confirm_delivery", "view_sellers", "manage_sales_status"],
  seller: ["create_order", "view_own_orders", "manage_own_profile"],
};

export function can(action: Action, role: Role) {
  return allowed[role].includes(action);
}

export const permissionsFor = (role: Role) => allowed[role];
