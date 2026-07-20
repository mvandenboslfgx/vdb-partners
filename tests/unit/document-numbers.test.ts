import { describe, expect, it } from "vitest";
import { formatDocumentNumber, formatOrderNumber } from "@/lib/documents/numbers";

it("formats stable document numbers and rejects invalid sequences", () => {
  expect(formatOrderNumber(7, 2026)).toBe("VDB-ORD-2026-000007");
  expect(() => formatDocumentNumber("PAY", 0, 2026)).toThrow("positive");
});
