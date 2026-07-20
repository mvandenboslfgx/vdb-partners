import type { CommissionInput, CommissionResult, CommissionRule } from "@/lib/commissions/types";

const cents = (value: number) => Math.round(value);
const nonNegativeInteger = (name: string, value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer in cents`);
};
function rawCommission(rule: CommissionRule, sale: number, margin: number) {
  switch (rule.kind) {
    case "fixed": return rule.amount;
    case "percent_sale": return sale * rule.percent / 100;
    case "percent_margin": return margin * rule.percent / 100;
    case "combo": return rule.fixedAmount + sale * rule.salePercent / 100 + margin * rule.marginPercent / 100;
  }
}
export function calculateCommission(input: CommissionInput): CommissionResult {
  for (const [name, value] of Object.entries(input)) if (typeof value === "number" && name !== "maxPercentOfMargin") nonNegativeInteger(name, value);
  const margin = input.saleAmount - input.vatAmount - input.costAmount - input.paymentFee - input.orderCosts;
  let commission = Math.max(0, cents(rawCommission(input.rule, input.saleAmount, margin)));
  if (input.min !== undefined) commission = Math.max(commission, input.min);
  if (input.max !== undefined) commission = Math.min(commission, input.max);
  if (input.maxPercentOfMargin !== undefined && margin > 0) commission = Math.min(commission, cents(margin * input.maxPercentOfMargin / 100));
  if (commission > margin) return { netMarginBeforeCommission: margin, commission, vdbMargin: margin - commission, status: "needs_manual_review", reason: "Commission exceeds available margin" };
  return { netMarginBeforeCommission: margin, commission, vdbMargin: margin - commission, status: "calculated" };
}
