import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["@testing-library/jest-dom/vitest"],
    include: [
      "src/test/identity*.test.*",
      "src/test/profileSettings.test.tsx",
      "src/test/emailVerificationPanel.test.tsx",
    ],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
