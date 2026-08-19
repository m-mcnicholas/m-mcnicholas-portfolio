import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], browserName: "chromium", channel: "chromium", viewport: { width: 1280, height: 720 } }
    },
    {
      name: "mobile-chromium",
      testMatch: "**/archive.spec.js",
      use: { ...devices["iPhone 13"], browserName: "chromium", channel: "chromium" }
    }
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: true
  }
});
