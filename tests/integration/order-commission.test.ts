import { describe, expect, it } from "vitest";
import { calculateCommission } from "@/lib/commissions/engine";
const db = !process.env.SUPABASE_DB_URL;
describe.skipIf(db)("order status and commission creation (requires Supabase)", () => {
  it("calculates a commission after a verified order", () => expect(calculateCommission({ saleAmount: 1000, vatAmount: 210, costAmount: 300, paymentFee: 20, orderCosts: 10, rule: { kind: "fixed", amount: 100 } }).status).toBe("calculated"));
});
