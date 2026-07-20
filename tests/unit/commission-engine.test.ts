import { describe, expect, it } from "vitest";
import { calculateCommission } from "@/lib/commissions/engine";

const base = { saleAmount: 12_100, vatAmount: 2_100, costAmount: 4_000, paymentFee: 300, orderCosts: 200 };
describe("commission engine", () => {
  it("calculates fixed and percentage commissions in cents", () => {
    expect(calculateCommission({ ...base, rule: { kind: "fixed", amount: 1_000 } }).commission).toBe(1_000);
    expect(calculateCommission({ ...base, rule: { kind: "percent_sale", percent: 10 } }).commission).toBe(1_210);
  });
  it("caps a commission to a configured share of margin", () => expect(calculateCommission({ ...base, rule: { kind: "fixed", amount: 5_000 }, maxPercentOfMargin: 50 }).commission).toBe(2_750));
  it("blocks a commission that exceeds margin", () => expect(calculateCommission({ ...base, rule: { kind: "fixed", amount: 6_000 } }).status).toBe("needs_manual_review"));
});
