import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("partner support actions contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "app/actions/support.ts"),
    "utf8",
  );

  it("creates on Owner portal_support_tickets mapping, not legacy support_tickets insert", () => {
    expect(source).toMatch(/mapLogicalTableToOwner\("support_tickets"\)/);
    expect(source).not.toMatch(/\.from\("support_tickets"\)\.insert/);
    expect(source).toMatch(/status:\s*"NEW"/);
    expect(source).toMatch(/support_own_tickets/);
  });

  it("replies via reply_portal_support_ticket and never writes internal notes", () => {
    expect(source).toMatch(/reply_portal_support_ticket/);
    expect(source).not.toMatch(/add_portal_support_internal_note/);
    expect(source).not.toMatch(/is_internal:\s*true/);
  });

  it("rate-limits create and reply server-side", () => {
    expect(source).toMatch(/support:create/);
    expect(source).toMatch(/support:reply/);
    expect(source).toMatch(/rateLimit\(/);
  });
});
