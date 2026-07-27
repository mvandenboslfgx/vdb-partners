import { describe, expect, it } from "vitest";
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
  assertNotProductionSupabaseUrl,
  assertStagingSupabaseUrl,
  extractSupabaseProjectRef,
} from "@/lib/contract/env";
import {
  mapBackendErrorMessage,
  userMessageForPartnerError,
} from "@/lib/contract/errors";
import pin from "@/contracts/vdb-backend-contract-0.2.0-rc.3/pin.json";

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
    expect(isOwnerContractTable("admin_roles")).toBe(true);
    expect(isOwnerContractTable("portal_conversations")).toBe(true);
    expect(isOwnerContractTable("portal_messages")).toBe(true);
    expect(isOwnerContractTable("portal_message_attachments")).toBe(true);
    expect(isOwnerContractTable("portal_support_tickets")).toBe(true);
    expect(isOwnerContractTable("portal_support_replies")).toBe(true);
    expect(isOwnerContractTable("portal_appointments")).toBe(true);
    expect(isLegacyAuthTable("user_roles")).toBe(true);
    expect(isOwnerContractTable("user_roles")).toBe(false);
    expect(isForbiddenParallelBaseTable("conversations")).toBe(true);
    expect(isForbiddenParallelBaseTable("support_messages")).toBe(true);
  });

  it("maps logical support_messages to portal_support_replies", () => {
    expect(mapLogicalTableToOwner("support_messages")).toBe(
      "portal_support_replies",
    );
    expect(mapLogicalTableToOwner("conversations")).toBe(
      "portal_conversations",
    );
    expect(mapLogicalTableToOwner("appointments")).toBe("portal_appointments");
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
  });
});

describe("concurrency + fail-closed flags", () => {
  it("retains RC2 concurrency codes", () => {
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

  it("defaults RC3 fail-closed flags to false", () => {
    for (const flag of RC3_FAIL_CLOSED_FLAGS) {
      expect(rc3FlagDefault(flag)).toBe(false);
    }
  });
});
