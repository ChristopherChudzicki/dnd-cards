import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // Auto-restore vi.spyOn mocks between tests so spies in one file
    // don't leak into another. Pairs with the manual vi.unstubAllEnvs()
    // calls already in DEV-mode tests.
    restoreMocks: true,
  },
});
