export type CommissionRule =
  | { kind: "fixed"; amount: number }
  | { kind: "percent_sale"; percent: number }
  | { kind: "percent_margin"; percent: number }
  | { kind: "combo"; fixedAmount: number; salePercent: number; marginPercent: number };
export interface CommissionInput {
  saleAmount: number; vatAmount: number; costAmount: number; paymentFee: number; orderCosts: number;
  rule: CommissionRule; min?: number; max?: number; maxPercentOfMargin?: number;
}
export type CommissionStatus = "calculated" | "needs_manual_review";
export interface CommissionResult {
  netMarginBeforeCommission: number; commission: number; vdbMargin: number; status: CommissionStatus; reason?: string;
}
