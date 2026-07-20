import { describe, expect, it } from "vitest";
import { calculateCommission } from "@/lib/commissions/engine";

it("derives net margin before commission from sale, VAT and costs", () => {
  expect(calculateCommission({ saleAmount: 1_000, vatAmount: 210, costAmount: 300, paymentFee: 20, orderCosts: 10, rule: { kind: "fixed", amount: 100 } })).toMatchObject({ netMarginBeforeCommission: 460, vdbMargin: 360 });
});
