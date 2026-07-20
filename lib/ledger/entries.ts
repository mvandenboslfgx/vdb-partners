import { randomUUID } from "crypto";
import type { JournalLine, LedgerEntry } from "@/lib/ledger/types";

export function buildEntries(lines: readonly JournalLine[], metadata: Omit<LedgerEntry, "id" | "account" | "debit" | "credit" | "occurredAt"> & { occurredAt?: Date }): LedgerEntry[] {
  if (!metadata.idempotencyKey) throw new Error("An idempotency key is required");
  const debit = lines.reduce((sum, line) => sum + (line.debit ?? 0), 0), credit = lines.reduce((sum, line) => sum + (line.credit ?? 0), 0);
  if (debit !== credit || debit <= 0) throw new Error("Journal entries must balance with a positive total");
  return lines.map((line) => {
    const lineDebit = line.debit ?? 0, lineCredit = line.credit ?? 0;
    if (!Number.isSafeInteger(lineDebit) || !Number.isSafeInteger(lineCredit) || (lineDebit > 0 && lineCredit > 0)) throw new Error("Invalid journal line");
    return { id: randomUUID(), account: line.account, debit: lineDebit, credit: lineCredit, currency: metadata.currency, idempotencyKey: metadata.idempotencyKey, referenceType: metadata.referenceType, referenceId: metadata.referenceId, occurredAt: metadata.occurredAt ?? new Date() };
  });
}
export const hasIdempotencyKey = (entries: readonly LedgerEntry[], key: string) => entries.some((entry) => entry.idempotencyKey === key);
