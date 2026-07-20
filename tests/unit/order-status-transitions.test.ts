import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "@/lib/orders/status-machine";

it("permits the paid fulfilment path and rejects skipped states", () => {
  expect(canTransition("awaiting_payment", "payment_received")).toBe(true);
  expect(canTransition("payment_verified", "fulfilment_pending")).toBe(true);
  expect(() => assertTransition("awaiting_payment", "delivered")).toThrow("Invalid");
});
