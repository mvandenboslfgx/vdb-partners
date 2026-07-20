import { beforeEach, describe, expect, it, vi } from "vitest";
const db = !process.env.SUPABASE_DB_URL;
describe.skipIf(db)("payment webhook idempotency (requires Supabase)", () => {
  beforeEach(() => vi.resetModules());

  it("does not fetch or update a duplicate provider event", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    const getPayment = vi.fn();
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({ from: () => ({ insert }) }),
    }));
    vi.doMock("@/lib/payments/mollie", () => ({ mollie: { getPayment } }));
    const { processMollieWebhook } = await import("@/lib/payments/webhook");

    await expect(processMollieWebhook("tr_1", "evt_1")).resolves.toEqual({
      processed: false,
      reason: "duplicate",
    });
    expect(getPayment).not.toHaveBeenCalled();
  });
});
