import {
  PARTNER_OWNER_TABLES,
  CUSTOMER_PORTAL_TABLES,
} from "@/lib/contract/pin";

/** Owner RC2 tables Partner Portal may query at runtime. */
export const RC2_OWNER_TABLES = new Set<string>([
  ...PARTNER_OWNER_TABLES,
  ...CUSTOMER_PORTAL_TABLES,
  "admin_roles",
]);

/** Legacy local proposal tables — never used for auth/routing identity. */
export const LEGACY_AUTH_TABLES = ["user_roles", "seller_profiles"] as const;

export function isRc2OwnerTable(table: string): boolean {
  return RC2_OWNER_TABLES.has(table);
}

export function assertRc2OwnerTable(table: string): string {
  if (!isRc2OwnerTable(table)) {
    throw new Error(`CONTRACT_SURFACE_UNAVAILABLE:${table}`);
  }
  return table;
}

export function isLegacyAuthTable(table: string): boolean {
  return (LEGACY_AUTH_TABLES as readonly string[]).includes(table);
}
