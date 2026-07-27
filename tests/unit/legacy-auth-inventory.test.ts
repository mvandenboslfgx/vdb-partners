import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("auth runtime legacy inventory", () => {
  it("does not query user_roles or seller_profiles in auth/session/destination loaders", () => {
    const files = [
      "app/actions/auth.ts",
      "lib/auth/session.ts",
      "lib/auth/identity.ts",
      "lib/auth/destination.ts",
      "lib/partners/loaders.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(/from\(["']user_roles["']\)/);
      expect(source, file).not.toMatch(/from\(["']seller_profiles["']\)/);
    }
  });

  it("identity loader queries admin_roles and partner_profiles", () => {
    const source = read("lib/auth/identity.ts");
    expect(source).toMatch(/admin_roles/);
    expect(source).toMatch(/partner_profiles/);
    expect(source).toMatch(/organization_members/);
  });
});
