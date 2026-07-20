import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("RLS migration policy documentation", () => {
  it("enables RLS and avoids unconditional policies for sensitive tables", () => {
    const sql = readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20260720000002_rls_policies.sql"),
      "utf8",
    );
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/ledger_entries/);
    expect(sql).not.toMatch(/create policy[\s\S]{0,120}ledger_entries[\s\S]{0,120}using\s*\(\s*true\s*\)/i);
    expect(sql).toMatch(/product_costs/);
    expect(sql).toMatch(/seller_profiles/);
  });
});
