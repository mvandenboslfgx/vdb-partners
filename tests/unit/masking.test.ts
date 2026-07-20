import { describe, expect, it } from "vitest";
import { maskEmail, maskIban, maskSensitive } from "@/lib/security/masking";

it("masks direct and object-contained personal data", () => {
  expect(maskIban("NL91ABNA0417164300")).toMatch(/^NL91.*4300$/);
  expect(maskEmail("seller@example.com")).toContain("@example.com");
  expect(maskSensitive({ email: "seller@example.com", nested: { phone: "0612345678" } })).toEqual({ email: "•••", nested: { phone: "•••" } });
});
