import { describe, expect, it } from "vitest";
import { generateSellerCode, referralLink } from "@/lib/referrals/codes";

it("generates valid codes and builds encoded links", () => {
  expect(generateSellerCode()).toMatch(/^VDB-[A-Z0-9]{6}$/);
  expect(referralLink("VDB-ABC123")).toContain("partner=VDB-ABC123");
});
