import { describe, expect, it } from "vitest";
import { createPayoutBatch } from "@/lib/payouts/batch";

const commissions = [{ id: "c1", sellerId: "seller", amount: 400, status: "available" as const }, { id: "c2", sellerId: "seller", amount: 600, status: "available" as const }];
it("sums eligible seller commissions into a draft payout", () => expect(createPayoutBatch("seller", "bank", commissions)).toMatchObject({ amount: 1_000, status: "draft" }));
it("rejects duplicate commission assignments", () => expect(() => createPayoutBatch("seller", "bank", [commissions[0], commissions[0]])).toThrow("once"));
