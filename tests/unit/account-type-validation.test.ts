import { describe, expect, it } from "vitest";
import { sellerAccountTypeSchema, sellerAccountTypes } from "@/lib/validation/account-type";

describe("seller account types", () => {
  it("allows supported account types", () => expect(sellerAccountTypes.map((type) => sellerAccountTypeSchema.parse(type))).toHaveLength(3));
  it("rejects an unknown account type", () => expect(() => sellerAccountTypeSchema.parse("partnership")).toThrow());
});
