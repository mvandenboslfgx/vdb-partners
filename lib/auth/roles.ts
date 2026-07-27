import { can, permissionsFor, type Action } from "@/lib/permissions/matrix";
import {
  isSharedRole,
  sharedRoles,
  type SharedRole,
} from "@/lib/contract/roles";

export type Role = SharedRole;
export type { Action, SharedRole };
export const roles = sharedRoles;
export const isRole = isSharedRole;
export { can, permissionsFor };
