import { defineConfig, devices } from "@playwright/test";

const chromiumChannel = process.env.PLAYWRIGHT_CHANNEL || "chromium";
const serverPort = Number(process.env.PLAYWRIGHT_PORT || 4173);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: `http://127.0.0.1:${serverPort}`,
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebRTC"]
    }
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], browserName: "chromium", channel: chromiumChannel, viewport: { width: 1280, height: 720 } }
    },
    {
      name: "mobile-chromium",
      testMatch: "**/archive.spec.js",
      use: { ...devices["iPhone 13"], browserName: "chromium", channel: chromiumChannel }
    }
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${serverPort}`,
    port: serverPort,
    reuseExistingServer: true
  }
});
