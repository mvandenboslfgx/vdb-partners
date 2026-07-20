import { can, permissionsFor, type Action, type Role } from "@/lib/permissions/matrix";

export type { Action, Role };
export const roles = ["owner", "finance_admin", "sales_admin", "support_admin", "seller"] as const;
export const isRole = (value: unknown): value is Role => typeof value === "string" && roles.includes(value as Role);
export { can, permissionsFor };
