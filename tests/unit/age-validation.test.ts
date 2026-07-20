import { describe, expect, it } from "vitest";
import { isAdult, sellerOnboardingSchema } from "@/lib/validation/seller";

describe("seller age validation", () => {
  it("accepts exactly 18-year-old sellers", () => expect(isAdult(new Date(2008, 6, 20), new Date(2026, 6, 20))).toBe(true));
  it("rejects underage onboarding", () => {
    const result = sellerOnboardingSchema.safeParse({ firstName: "A", lastName: "B", dateOfBirth: "2010-01-01", phone: "0612345678", companyName: "VDB", kvkNumber: "12345678", iban: "NL91ABNA0417164300", acceptAgreement: true });
    expect(result.success).toBe(false);
  });
});
