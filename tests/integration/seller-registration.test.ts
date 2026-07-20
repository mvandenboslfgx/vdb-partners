import { describe, expect, it } from "vitest";
import { sellerOnboardingSchema } from "@/lib/validation/seller";
const db = !process.env.SUPABASE_DB_URL;
describe.skipIf(db)("seller registration flow (requires Supabase)", () => {
  it("accepts a complete seller registration payload before persistence", () => expect(sellerOnboardingSchema.safeParse({ firstName: "Ada", lastName: "Lovelace", dateOfBirth: "1990-01-01", phone: "0612345678", companyName: "VDB Partner", kvkNumber: "12345678", iban: "NL91ABNA0417164300", acceptAgreement: true }).success).toBe(true));
});
