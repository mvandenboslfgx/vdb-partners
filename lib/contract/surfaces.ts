import {
  PARTNER_OWNER_TABLES,
  CUSTOMER_PORTAL_TABLES,
  FORBIDDEN_PARALLEL_BASE_TABLES,
  MOBILE_CLIENT_TABLE_MAPPING,
} from "@/lib/contract/pin";

/** Owner RC3 tables Partner Portal may query at runtime. */
export const OWNER_CONTRACT_TABLES = new Set<string>([
  ...PARTNER_OWNER_TABLES,
  ...CUSTOMER_PORTAL_TABLES,
  "admin_roles",
]);

/** Legacy local proposal tables — never used for auth/routing identity. */
export const LEGACY_AUTH_TABLES = ["user_roles", "seller_profiles"] as const;

/** @deprecated Prefer isOwnerContractTable — alias kept for RC2 call sites. */
export const RC2_OWNER_TABLES = OWNER_CONTRACT_TABLES;

export function isOwnerContractTable(table: string): boolean {
  return OWNER_CONTRACT_TABLES.has(table);
}

/** @deprecated Prefer isOwnerContractTable */
export function isRc2OwnerTable(table: string): boolean {
  return isOwnerContractTable(table);
}

export function assertOwnerContractTable(table: string): string {
  if (!isOwnerContractTable(table)) {
    throw new Error(`CONTRACT_SURFACE_UNAVAILABLE:${table}`);
  }
  return table;
}

/** @deprecated Prefer assertOwnerContractTable */
export function assertRc2OwnerTable(table: string): string {
  return assertOwnerContractTable(table);
}

export function isLegacyAuthTable(table: string): boolean {
  return (LEGACY_AUTH_TABLES as readonly string[]).includes(table);
}

export function isForbiddenParallelBaseTable(table: string): boolean {
  return (FORBIDDEN_PARALLEL_BASE_TABLES as readonly string[]).includes(table);
}

/** Map logical client names to owner portal_* / partner_* tables. */
export function mapLogicalTableToOwner(logicalOrOwner: string): string {
  const mapped = MOBILE_CLIENT_TABLE_MAPPING[logicalOrOwner] ?? logicalOrOwner;
  if (mapped.startsWith("DO_NOT_USE_")) {
    throw new Error(`CONTRACT_SURFACE_UNAVAILABLE:${logicalOrOwner}`);
  }
  if (
    isForbiddenParallelBaseTable(logicalOrOwner) &&
    logicalOrOwner !== mapped
  ) {
    return assertOwnerContractTable(mapped);
  }
  return assertOwnerContractTable(mapped);
}
