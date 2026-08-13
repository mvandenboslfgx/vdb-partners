import { describe, expect, it } from "vitest";
import {
  mapLegacyAccountTypeToPartnerType,
  resolvePartnerTypeFromChoice,
  isValidDutchKvk,
} from "@/lib/validation/partner-type";
import {
  partnerApplicationIntakeSchema,
  sanitizePartnerApplicationForSubmit,
} from "@/lib/validation/partner-application";
import { sellerOnboardingSchema } from "@/lib/validation/seller";
import {
  sellerAccountTypeSchema,
  sellerAccountTypes,
} from "@/lib/validation/account-type";

describe("partner type mapping", () => {
  it("maps legacy particular/sole_trader/company to Owner types", () => {
    expect(mapLegacyAccountTypeToPartnerType("particular")).toBe("INDIVIDUAL");
    expect(mapLegacyAccountTypeToPartnerType("sole_trader")).toBe("BUSINESS");
    expect(mapLegacyAccountTypeToPartnerType("company")).toBe("BUSINESS");
  });

  it("resolves explicit choices and rejects unknown", () => {
    expect(resolvePartnerTypeFromChoice("INDIVIDUAL")).toBe("INDIVIDUAL");
    expect(resolvePartnerTypeFromChoice("business")).toBe("BUSINESS");
    expect(resolvePartnerTypeFromChoice("particular")).toBe("INDIVIDUAL");
    expect(resolvePartnerTypeFromChoice("sole_trader")).toBe("BUSINESS");
    expect(resolvePartnerTypeFromChoice("")).toBeNull();
    expect(resolvePartnerTypeFromChoice("partnership")).toBeNull();
  });

  it("never treats KvK presence as a type signal", () => {
    // Type comes only from explicit choice — KvK helpers are format-only.
    expect(isValidDutchKvk("12345678")).toBe(true);
    expect(isValidDutchKvk("123")).toBe(false);
    expect(resolvePartnerTypeFromChoice(undefined)).toBeNull();
  });

  it("keeps legacy account-type enum for local compatibility", () => {
    expect(
      sellerAccountTypes.map((type) => sellerAccountTypeSchema.parse(type)),
    ).toHaveLength(3);
  });
});

describe("partner application intake", () => {
  it("allows INDIVIDUAL without companyName/KVK", () => {
    const parsed = partnerApplicationIntakeSchema.parse({
      partnerType: "INDIVIDUAL",
      legalName: "Jan Jansen",
      contactEmail: "jan@example.test",
    });
    const payload = sanitizePartnerApplicationForSubmit(parsed);
    expect(payload.partnerType).toBe("INDIVIDUAL");
    expect(payload.kvk).toBeNull();
    expect(payload.vat).toBeNull();
  });

  it("rejects INDIVIDUAL with KVK (hard reject)", () => {
    const result = partnerApplicationIntakeSchema.safeParse({
      partnerType: "INDIVIDUAL",
      legalName: "Jan Jansen",
      contactEmail: "jan@example.test",
      kvkNumber: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects BUSINESS without companyName", () => {
    const result = partnerApplicationIntakeSchema.safeParse({
      partnerType: "BUSINESS",
      legalName: "Vera Vertegenwoordiger",
      contactEmail: "biz@example.test",
      kvkNumber: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects BUSINESS without valid KVK", () => {
    const result = partnerApplicationIntakeSchema.safeParse({
      partnerType: "BUSINESS",
      legalName: "Vera Vertegenwoordiger",
      companyName: "Voorbeeld BV",
      contactEmail: "biz@example.test",
      kvkNumber: "123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts BUSINESS with company + 8-digit KVK", () => {
    const parsed = partnerApplicationIntakeSchema.parse({
      partnerType: "BUSINESS",
      legalName: "Vera Vertegenwoordiger",
      companyName: "Voorbeeld BV",
      contactEmail: "biz@example.test",
      kvkNumber: "12345678",
      businessSubtype: "sole_trader",
    });
    const payload = sanitizePartnerApplicationForSubmit(parsed);
    expect(payload.partnerType).toBe("BUSINESS");
    expect(payload.kvk).toBe("12345678");
    expect(payload.tradeName).toBe("Voorbeeld BV");
  });

  it("strips stale BUSINESS fields when switching to INDIVIDUAL", () => {
    const parsed = partnerApplicationIntakeSchema.parse({
      partnerType: "INDIVIDUAL",
      legalName: "Jan Jansen",
      contactEmail: "jan@example.test",
      companyName: undefined,
      kvkNumber: undefined,
    });
    // Simulate UI retaining hidden values then sanitizing for submit:
    const sanitized = sanitizePartnerApplicationForSubmit({
      ...parsed,
      companyName: "Old BV",
      kvkNumber: undefined,
      vatNumber: "NL123",
    });
    expect(sanitized.kvk).toBeNull();
    expect(sanitized.vat).toBeNull();
    expect(sanitized.partnerType).toBe("INDIVIDUAL");
  });

  it("sellerOnboardingSchema is type-conditional (no universal company/KVK)", () => {
    const individual = sellerOnboardingSchema.safeParse({
      firstName: "Jan",
      lastName: "Jansen",
      dateOfBirth: "1990-01-01",
      phone: "+31612345678",
      partnerType: "INDIVIDUAL",
      iban: "NL91ABNA0417164300",
      acceptAgreement: true,
    });
    expect(individual.success).toBe(true);

    const businessMissing = sellerOnboardingSchema.safeParse({
      firstName: "Vera",
      lastName: "V",
      dateOfBirth: "1990-01-01",
      phone: "+31612345678",
      partnerType: "BUSINESS",
      iban: "NL91ABNA0417164300",
      acceptAgreement: true,
    });
    expect(businessMissing.success).toBe(false);
  });
});
