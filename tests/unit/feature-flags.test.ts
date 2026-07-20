import { describe, expect, it } from "vitest";
import { featureFlagNames, featureFlags } from "@/lib/feature-flags";

it("exposes each feature via the typed lookup", () => {
  for (const flag of featureFlagNames) expect(typeof featureFlags[flag]).toBe("boolean");
});
