import { describe, expect, it } from "vitest";
import {
  assertExpectedSupabaseEnvironment,
  assertNotProductionSupabaseUrl,
  assertPartnerSupabaseEnvironment,
  assertStagingSupabaseUrl,
  extractSupabaseProjectRef,
  resolveDeploymentEnvironment,
} from "@/lib/contract/env";
import {
  CONTRACT_VERSION,
  PRODUCTION_PROJECT_REF,
  RC2_CONCURRENCY_ERROR_CODES,
  RC3_FAIL_CLOSED_FLAGS,
  SCHEMA_VERSION,
  STAGING_PROJECT_REF,
  isRc2ConcurrencyErrorCode,
  rc3FlagDefault,
} from "@/lib/contract/pin";
import {
  isForbiddenParallelBaseTable,
  isLegacyAuthTable,
  isOwnerContractTable,
  mapLogicalTableToOwner,
} from "@/lib/contract/surfaces";
import {
  mapBackendErrorMessage,
  userMessageForPartnerError,
} from "@/lib/contract/errors";
import pin from "@/contracts/vdb-backend-contract-0.2.0-rc.3/pin.json";

const stagingUrl = `https://${STAGING_PROJECT_REF}.supabase.co`;
const productionUrl = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;

describe("contract pin RC3", () => {
  it("pins vdb-backend-contract@0.2.0-rc.3 and messaging-support schema", () => {
    expect(CONTRACT_VERSION).toBe("vdb-backend-contract@0.2.0-rc.3");
    expect(SCHEMA_VERSION).toBe(
      "2026.07.25.messaging-support-appointments-rc3",
    );
    expect(pin.contractVersion).toBe(CONTRACT_VERSION);
    expect(pin.schemaVersion).toBe(SCHEMA_VERSION);
    expect(STAGING_PROJECT_REF).toBe("qzekuvmgfekzsowdecyk");
    expect(PRODUCTION_PROJECT_REF).toBe("nhsrdnjfsxfikfbdmdfj");
  });

  it("allowlists partner_* and portal_* RC3 surfaces", () => {
    expect(isOwnerContractTable("partner_profiles")).toBe(true);
    expect(isOwnerContractTable("portal_conversations")).toBe(true);
    expect(isLegacyAuthTable("user_roles")).toBe(true);
    expect(isOwnerContractTable("user_roles")).toBe(false);
    expect(isForbiddenParallelBaseTable("conversations")).toBe(true);
    expect(mapLogicalTableToOwner("support_messages")).toBe(
      "portal_support_replies",
    );
  });
});

describe("assertExpectedSupabaseEnvironment", () => {
  it("production + production-ref → PASS", () => {
    expect(
      assertExpectedSupabaseEnvironment({
        deploymentEnvironment: "production",
        actualSupabaseUrl: productionUrl,
      }).projectRef,
    ).toBe(PRODUCTION_PROJECT_REF);
  });

  it("production + staging-ref → BLOCK", () => {
    expect(() =>
      assertExpectedSupabaseEnvironment({
        deploymentEnvironment: "production",
        actualSupabaseUrl: stagingUrl,
      }),
    ).toThrow(/Production requires/);
  });

  it("production + missing ref → BLOCK", () => {
    expect(() =>
      assertExpectedSupabaseEnvironment({
        deploymentEnvironment: "production",
        actualSupabaseUrl: undefined,
      }),
    ).toThrow(/Missing Supabase URL/);
  });

  it("preview + staging-ref → PASS", () => {
    expect(
      assertExpectedSupabaseEnvironment({
        deploymentEnvironment: "preview",
        actualSupabaseUrl: stagingUrl,
      }).projectRef,
    ).toBe(STAGING_PROJECT_REF);
  });

  it("preview + production-ref → BLOCK", () => {
    expect(() =>
      assertExpectedSupabaseEnvironment({
        deploymentEnvironment: "preview",
        actualSupabaseUrl: productionUrl,
      }),
    ).toThrow(/refused in preview/);
  });

  it("staging + staging-ref → PASS", () => {
    expect(assertStagingSupabaseUrl(stagingUrl)).toBe(STAGING_PROJECT_REF);
  });

  it("local/development + production-ref → BLOCK", () => {
    expect(() =>
      assertExpectedSupabaseEnvironment({
        deploymentEnvironment: "development",
        actualSupabaseUrl: productionUrl,
      }),
    ).toThrow(/refused in development/);
    expect(() => assertNotProductionSupabaseUrl(productionUrl)).toThrow(
      /refused in development/,
    );
  });

  it("unknown environment → BLOCK", () => {
    expect(() =>
      assertExpectedSupabaseEnvironment({
        deploymentEnvironment: "canary",
        actualSupabaseUrl: stagingUrl,
      }),
    ).toThrow(/Unknown deployment environment/);
  });

  it("resolveDeploymentEnvironment respects APP_ENV and Vercel", () => {
    expect(
      resolveDeploymentEnvironment({
        APP_ENV: "production",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("production");
    expect(
      resolveDeploymentEnvironment({
        VERCEL_ENV: "preview",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("preview");
    expect(
      resolveDeploymentEnvironment({} as unknown as NodeJS.ProcessEnv),
    ).toBe("development");
  });

  it("assertPartnerSupabaseEnvironment uses resolved deployment env", () => {
    expect(() =>
      assertPartnerSupabaseEnvironment(productionUrl, {
        APP_ENV: "production",
      } as unknown as NodeJS.ProcessEnv),
    ).not.toThrow();
    expect(() =>
      assertPartnerSupabaseEnvironment(productionUrl, {
        APP_ENV: "preview",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/refused in preview/);
  });

  it("extracts staging ref", () => {
    expect(extractSupabaseProjectRef(stagingUrl)).toBe(STAGING_PROJECT_REF);
  });
});

describe("concurrency + fail-closed flags", () => {
  it("retains RC2 concurrency codes", () => {
    expect(RC2_CONCURRENCY_ERROR_CODES).toContain(
      "PARTNER_LEAD_ALREADY_CONVERTED",
    );
    expect(isRc2ConcurrencyErrorCode("PARTNER_INSUFFICIENT_LIABILITY")).toBe(
      true,
    );
    expect(mapBackendErrorMessage("PARTNER_INSUFFICIENT_LIABILITY")).toBe(
      "PARTNER_INSUFFICIENT_LIABILITY",
    );
    expect(
      userMessageForPartnerError("PARTNER_LEAD_ALREADY_CONVERTED"),
    ).toMatch(/lead/i);
  });

  it("defaults RC3 fail-closed flags to false", () => {
    for (const flag of RC3_FAIL_CLOSED_FLAGS) {
      expect(rc3FlagDefault(flag)).toBe(false);
    }
  });
});
