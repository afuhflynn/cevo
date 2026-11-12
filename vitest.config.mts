import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    env: {
      NODE_ENV: "test",
    },
  },
});
