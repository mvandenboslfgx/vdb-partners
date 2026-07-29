import pin from "@/contracts/vdb-backend-contract-0.2.0-rc.5/pin.json";
import roles from "@/contracts/vdb-backend-contract-0.2.0-rc.5/roles.json";
import tables from "@/contracts/vdb-backend-contract-0.2.0-rc.5/tables.json";
import featureFlags from "@/contracts/vdb-backend-contract-0.2.0-rc.5/feature-flags.json";

export const CONTRACT_VERSION = pin.contractVersion;
export const SCHEMA_VERSION = pin.schemaVersion;
export const STAGING_PROJECT_REF = pin.stagingProjectRef;
/** Canonical production Supabase project — allowed only in explicit production deployment mode. */
export const PRODUCTION_PROJECT_REF = pin.productionProjectRef;
export const CANONICAL_PRODUCTION_URL = pin.canonicalProductionUrl;
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

/** Retained from financial-concurrency RC2 (still required on RC5). */
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

/**
 * Fail-closed feature flags from Owner RC5 (defaults false).
 * Includes RC3 messaging/support flags plus RC5 compliance fixtures.
 */
export const RC5_FAIL_CLOSED_FLAGS = [
  "mollie_checkout",
  "digital_product_checkout",
  "partner_payouts",
  "messaging_realtime",
  "support_internal_notes_rpc",
  "appointments_booking",
  "partner_compliance_fixtures",
] as const;

/** @deprecated Prefer RC5_FAIL_CLOSED_FLAGS — alias kept for RC3 call sites. */
export const RC3_FAIL_CLOSED_FLAGS = RC5_FAIL_CLOSED_FLAGS;

export type Rc5FailClosedFlag = (typeof RC5_FAIL_CLOSED_FLAGS)[number];
/** @deprecated Prefer Rc5FailClosedFlag */
export type Rc3FailClosedFlag = Rc5FailClosedFlag;

export function rc5FlagDefault(flag: Rc5FailClosedFlag): boolean {
  const entry = (
    featureFlags as Record<string, { default?: boolean | string }>
  )[flag];
  return entry?.default === true;
}

/** @deprecated Prefer rc5FlagDefault */
export function rc3FlagDefault(flag: Rc5FailClosedFlag): boolean {
  return rc5FlagDefault(flag);
}

export const RC5_ACTIVATION_BLOCK_CODES = [
  "PARTNER_TYPE_UNKNOWN",
  "PARTNER_SUSPENDED",
  "STAFF_APPROVAL_MISSING",
  "AGE_NOT_VERIFIED",
  "IDENTITY_NOT_VERIFIED",
  "BUSINESS_NOT_VERIFIED",
  "COMPANY_DETAILS_MISSING",
  "AGREEMENT_NOT_ACCEPTED",
  "PAYOUT_PROFILE_NOT_APPROVED",
  "UNKNOWN",
] as const;

export type Rc5ActivationBlockCode =
  (typeof RC5_ACTIVATION_BLOCK_CODES)[number];
