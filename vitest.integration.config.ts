import { defineConfig } from "vitest/config";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", override: true });

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
