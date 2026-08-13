import { describe, expect, it } from "vitest";
import {
  sellerAccountTypeSchema,
  sellerAccountTypes,
} from "@/lib/validation/account-type";
import { mapLegacyAccountTypeToPartnerType } from "@/lib/validation/partner-type";

describe("seller account types", () => {
  it("allows supported account types", () =>
    expect(
      sellerAccountTypes.map((type) => sellerAccountTypeSchema.parse(type)),
    ).toHaveLength(3));
  it("rejects an unknown account type", () =>
    expect(() => sellerAccountTypeSchema.parse("partnership")).toThrow());
  it("maps legacy types onto Owner INDIVIDUAL|BUSINESS only", () => {
    const mapped = sellerAccountTypes.map(mapLegacyAccountTypeToPartnerType);
    expect(new Set(mapped)).toEqual(new Set(["INDIVIDUAL", "BUSINESS"]));
  });
});
