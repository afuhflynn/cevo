import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
    },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      // Local runs have no public IP, so the Arcjet SDK cannot build a
      // fingerprint without this. Production on Vercel has real client IPs
      // and does not need it. Test environment only, never shipped code.
      ARCJET_ENV: "development",
      // The e2e mail assertions read Mailpit, so the server under test must
      // deliver there regardless of what the developer's own .env points at.
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
      SMTP_USER: "",
      SMTP_PASS: "",
    },
  },
});
