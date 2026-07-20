import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

describe("database migration contract", () => {
  it("contains core tables, RLS, and append-only ledger protections", () => {
    const dir = path.resolve(process.cwd(), "supabase/migrations");
    const sql = readdirSync(dir)
      .map((file) => readFileSync(path.join(dir, file), "utf8"))
      .join("\n");
    for (const table of [
      "seller_profiles",
      "orders",
      "payments",
      "commissions",
      "ledger_entries",
      "payouts",
      "payout_batches",
      "cash_receipts",
      "audit_logs",
      "feature_flags",
    ]) {
      expect(sql).toMatch(new RegExp(`create table public\\.${table}`, "i"));
    }
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).not.toMatch(/ledger_entries[\s\S]{0,200}using\s*\(\s*true\s*\)/i);
    expect(sql).toMatch(/ledger_entries_no_update|append-only|prevent.*update.*ledger/i);
  });
});
