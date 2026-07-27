import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSION,
  PRODUCTION_PROJECT_REF,
  RC2_CONCURRENCY_ERROR_CODES,
  SCHEMA_VERSION,
  STAGING_PROJECT_REF,
  isRc2ConcurrencyErrorCode,
} from "@/lib/contract/pin";
import { isLegacyAuthTable, isRc2OwnerTable } from "@/lib/contract/surfaces";
import {
  assertNotProductionSupabaseUrl,
  assertStagingSupabaseUrl,
  extractSupabaseProjectRef,
} from "@/lib/contract/env";
import {
  mapBackendErrorMessage,
  userMessageForPartnerError,
} from "@/lib/contract/errors";
import pin from "@/contracts/vdb-backend-contract-0.2.0-rc.2/pin.json";

describe("contract pin", () => {
  it("pins vdb-backend-contract@0.2.0-rc.2 and financial-concurrency schema", () => {
    expect(CONTRACT_VERSION).toBe("vdb-backend-contract@0.2.0-rc.2");
    expect(SCHEMA_VERSION).toBe("2026.07.27.financial-concurrency-rc2");
    expect(pin.contractVersion).toBe(CONTRACT_VERSION);
    expect(pin.schemaVersion).toBe(SCHEMA_VERSION);
    expect(STAGING_PROJECT_REF).toBe("qzekuvmgfekzsowdecyk");
    expect(PRODUCTION_PROJECT_REF).toBe("nhsrdnjfsxfikfbdmdfj");
  });

  it("allowlists owner partner surfaces and rejects legacy auth tables", () => {
    expect(isRc2OwnerTable("partner_profiles")).toBe(true);
    expect(isRc2OwnerTable("admin_roles")).toBe(true);
    expect(isRc2OwnerTable("partner_leads")).toBe(true);
    expect(isLegacyAuthTable("user_roles")).toBe(true);
    expect(isLegacyAuthTable("seller_profiles")).toBe(true);
    expect(isRc2OwnerTable("user_roles")).toBe(false);
    expect(isRc2OwnerTable("seller_profiles")).toBe(false);
  });
});

describe("environment denylist", () => {
  it("extracts staging ref and denylists production", () => {
    expect(
      extractSupabaseProjectRef(`https://${STAGING_PROJECT_REF}.supabase.co`),
    ).toBe(STAGING_PROJECT_REF);
    expect(
      assertStagingSupabaseUrl(`https://${STAGING_PROJECT_REF}.supabase.co`),
    ).toBe(STAGING_PROJECT_REF);
    expect(() =>
      assertNotProductionSupabaseUrl(
        `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
      ),
    ).toThrow(/denylisted/);
    expect(() =>
      assertStagingSupabaseUrl(`https://${PRODUCTION_PROJECT_REF}.supabase.co`),
    ).toThrow(/denylisted/);
  });
});

describe("concurrency error codes", () => {
  it("recognizes financial-concurrency RC2 codes", () => {
    expect(RC2_CONCURRENCY_ERROR_CODES).toContain(
      "PARTNER_LEAD_ALREADY_CONVERTED",
    );
    expect(RC2_CONCURRENCY_ERROR_CODES).toContain(
      "PARTNER_INSUFFICIENT_LIABILITY",
    );
    expect(isRc2ConcurrencyErrorCode("PARTNER_LEAD_ALREADY_CONVERTED")).toBe(
      true,
    );
    expect(mapBackendErrorMessage("PARTNER_INSUFFICIENT_LIABILITY")).toBe(
      "PARTNER_INSUFFICIENT_LIABILITY",
    );
    expect(
      userMessageForPartnerError("PARTNER_LEAD_ALREADY_CONVERTED"),
    ).toMatch(/lead/i);
  });
});
