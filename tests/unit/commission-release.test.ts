import { describe, expect, it } from "vitest";
import { commissionReleaseAt, isCommissionAvailable } from "@/lib/commissions/release";

describe("commission release", () => {
  const input = { paymentVerifiedAt: new Date("2026-01-01T00:00:00Z"), deliveredAt: new Date("2026-01-03T00:00:00Z"), holdDays: 7 };
  it("uses the later payment/delivery time plus the hold", () => expect(commissionReleaseAt(input)?.toISOString()).toBe("2026-01-10T00:00:00.000Z"));
  it("is unavailable before the release instant", () => expect(isCommissionAvailable({ ...input, now: new Date("2026-01-09T23:59:59Z") })).toBe(false));
});
