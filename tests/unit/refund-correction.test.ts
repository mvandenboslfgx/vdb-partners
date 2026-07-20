import { describe, expect, it } from "vitest";
import { buildEntries } from "@/lib/ledger/entries";
import { computeBalance } from "@/lib/ledger/balance";

it("represents a refund correction as compensating balanced entries", () => {
  const entries = buildEntries([{ account: "cash", credit: 500 }, { account: "payouts_payable", debit: 500 }], { currency: "EUR", idempotencyKey: "refund-1", referenceType: "refund", referenceId: "r1" });
  expect(computeBalance(entries)).toBe(0);
  expect(() => buildEntries([{ account: "cash", debit: 500 }], { currency: "EUR", idempotencyKey: "bad", referenceType: "refund", referenceId: "r1" })).toThrow("balance");
});
