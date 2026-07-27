import pin from "@/contracts/vdb-backend-contract-0.2.0-rc.3/pin.json";
import roles from "@/contracts/vdb-backend-contract-0.2.0-rc.3/roles.json";
import tables from "@/contracts/vdb-backend-contract-0.2.0-rc.3/tables.json";
import featureFlags from "@/contracts/vdb-backend-contract-0.2.0-rc.3/feature-flags.json";

export const CONTRACT_VERSION = pin.contractVersion;
export const SCHEMA_VERSION = pin.schemaVersion;
export const STAGING_PROJECT_REF = pin.stagingProjectRef;
export const PRODUCTION_PROJECT_REF = pin.productionProjectRefDenylist[0];
export const REPOSITORY_ROLE = pin.repositoryRole;
export const CONTRACT_BUNDLE_SHA256 = pin.bundleSha256;

export const SHARED_ROLES = roles.sharedRoles;
export const ROLE_ENCODING = roles.encoding;

export const PARTNER_OWNER_TABLES = tables.partnerTables as readonly string[];
export const CUSTOMER_PORTAL_TABLES =
  tables.customerPortalTables as readonly string[];
export const MOBILE_CLIENT_TABLE_MAPPING =
  tables.mobileClientTableMapping as Record<string, string>;
export const FORBIDDEN_PARALLEL_BASE_TABLES =
  tables.forbiddenParallelBaseTables as readonly string[];

/** Retained from financial-concurrency RC2 (still required on RC3 staging). */
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

/** RC3 fail-closed feature flags (defaults false in owner contract). */
export const RC3_FAIL_CLOSED_FLAGS = [
  "mollie_checkout",
  "digital_product_checkout",
  "partner_payouts",
  "messaging_realtime",
  "support_internal_notes_rpc",
  "appointments_booking",
] as const;

export type Rc3FailClosedFlag = (typeof RC3_FAIL_CLOSED_FLAGS)[number];

export function rc3FlagDefault(flag: Rc3FailClosedFlag): boolean {
  const entry = (
    featureFlags as Record<string, { default?: boolean | string }>
  )[flag];
  return entry?.default === true;
}
