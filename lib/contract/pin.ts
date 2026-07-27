import pin from "@/contracts/vdb-backend-contract-0.2.0-rc.2/pin.json";
import roles from "@/contracts/vdb-backend-contract-0.2.0-rc.2/roles.json";
import tables from "@/contracts/vdb-backend-contract-0.2.0-rc.2/tables.json";

export const CONTRACT_VERSION = pin.contractVersion;
export const SCHEMA_VERSION = pin.schemaVersion;
export const STAGING_PROJECT_REF = pin.stagingProjectRef;
export const PRODUCTION_PROJECT_REF = pin.productionProjectRefDenylist[0];
export const REPOSITORY_ROLE = pin.repositoryRole;

export const SHARED_ROLES = roles.sharedRoles;
export const ROLE_ENCODING = roles.encoding;

export const PARTNER_OWNER_TABLES = tables.partnerTables as readonly string[];
export const CUSTOMER_PORTAL_TABLES =
  tables.customerPortalTables as readonly string[];

/** Concurrency error codes introduced by financial-concurrency RC2. */
export const RC2_CONCURRENCY_ERROR_CODES = [
  "PARTNER_LEAD_ALREADY_CONVERTED",
  "PARTNER_INSUFFICIENT_LIABILITY",
] as const;

export type Rc2ConcurrencyErrorCode =
  (typeof RC2_CONCURRENCY_ERROR_CODES)[number];

export function isRc2ConcurrencyErrorCode(
  value: unknown,
): value is Rc2ConcurrencyErrorCode {
  return (
    typeof value === "string" &&
    (RC2_CONCURRENCY_ERROR_CODES as readonly string[]).includes(value)
  );
}
