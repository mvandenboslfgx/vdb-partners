export interface CommissionReleaseInput {
  paymentVerifiedAt: Date | null; deliveredAt: Date | null; holdDays: number; now?: Date;
}
export function commissionReleaseAt(input: CommissionReleaseInput) {
  if (!input.paymentVerifiedAt || !input.deliveredAt) return null;
  if (!Number.isInteger(input.holdDays) || input.holdDays < 0) throw new Error("holdDays must be a non-negative integer");
  const base = new Date(Math.max(input.paymentVerifiedAt.getTime(), input.deliveredAt.getTime()));
  base.setUTCDate(base.getUTCDate() + input.holdDays);
  return base;
}
export function isCommissionAvailable(input: CommissionReleaseInput) {
  const releaseAt = commissionReleaseAt(input);
  return Boolean(releaseAt && releaseAt <= (input.now ?? new Date()));
}
