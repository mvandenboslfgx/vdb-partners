import { describe, expect, it } from "vitest";
import { assertNoActiveCommissionOverlap } from "@/lib/payouts/batch";
import { confirmCashReceived, prepareCashPayout, requestCashConfirmation } from "@/lib/payouts/cash";
const db = !process.env.SUPABASE_DB_URL;
describe.skipIf(db)("payout uniqueness and cash confirmation (requires Supabase)", () => {
  it("guards duplicate batch membership and confirms named receipt", () => {
    expect(() => assertNoActiveCommissionOverlap(["c1"], ["c1"])).toThrow();
    const prepared = prepareCashPayout({ id: "p1", sellerId: "s1", method: "cash", commissionIds: ["c1"], amount: 100, status: "draft" }, "Ada", "REC-1");
    expect(confirmCashReceived(requestCashConfirmation(prepared), "Ada").status).toBe("confirmed_received");
  });
});
