import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "@/lib/orders/status-machine";
import {
  assertNoActiveCommissionOverlap,
  createPayoutBatch,
} from "@/lib/payouts/batch";
import {
  confirmCashReceived,
  prepareCashPayout,
  requestCashConfirmation,
} from "@/lib/payouts/cash";
import { buildEntries, hasIdempotencyKey } from "@/lib/ledger/entries";
import { computeBalance } from "@/lib/ledger/balance";

describe("order status machine", () => {
  it("allows payment_verified → fulfilment_pending", () => {
    expect(canTransition("payment_verified", "fulfilment_pending")).toBe(true);
  });

  it("forbids awaiting_payment → delivered", () => {
    expect(canTransition("awaiting_payment", "delivered")).toBe(false);
    expect(() => assertTransition("awaiting_payment", "delivered")).toThrow(/Invalid order transition/);
  });
});

describe("payout batching", () => {
  const commissions = [
    { id: "c1", sellerId: "s1", status: "available" as const, amount: 1500 },
    { id: "c2", sellerId: "s1", status: "available" as const, amount: 2500 },
  ];

  it("builds a draft batch with summed amounts", () => {
    const batch = createPayoutBatch("s1", "bank_transfer", commissions);
    expect(batch.amount).toBe(4000);
    expect(batch.status).toBe("draft");
  });

  it("rejects commission already in an active batch", () => {
    expect(() => assertNoActiveCommissionOverlap(["c1"], ["c1", "c9"])).toThrow(/already attached/);
  });
});

describe("cash payout confirmation", () => {
  it("requires confirmation before marking received", () => {
    const prepared = prepareCashPayout(
      {
        id: "b1",
        sellerId: "s1",
        method: "cash",
        commissionIds: ["c1"],
        amount: 2500,
        status: "draft",
      },
      "Test Seller",
      "VDB-CASH-1",
    );
    const awaiting = requestCashConfirmation(prepared);
    const confirmed = confirmCashReceived(awaiting, "Test Seller");
    expect(confirmed.status).toBe("confirmed_received");
  });
});

describe("ledger append-only helpers", () => {
  it("requires balanced journals and idempotency keys", () => {
    const entries = buildEntries(
      [
        { account: "seller_payable", debit: 1000 },
        { account: "bank", credit: 1000 },
      ],
      { currency: "EUR", idempotencyKey: "payout-1", referenceType: "payout", referenceId: "p1" },
    );
    expect(entries).toHaveLength(2);
    expect(hasIdempotencyKey(entries, "payout-1")).toBe(true);
    expect(computeBalance(entries, "seller_payable")).toBe(1000);
  });
});
