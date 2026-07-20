export const formatDocumentNumber = (prefix: "ORD" | "PAY" | "PAYOUT" | "REC", sequence: number, year = new Date().getUTCFullYear()) => {
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("sequence must be a positive integer");
  return `VDB-${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
};
export const formatOrderNumber = (sequence: number, year?: number) => formatDocumentNumber("ORD", sequence, year);
export const formatPayoutNumber = (sequence: number, year?: number) => formatDocumentNumber("PAYOUT", sequence, year);
