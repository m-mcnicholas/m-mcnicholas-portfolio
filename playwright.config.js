import { defineConfig, devices } from "@playwright/test";

// Set PLAYWRIGHT_CHANNEL=chrome to test against a locally installed Chrome
// instead of Playwright's bundled Chromium.
const chromiumChannel = process.env.PLAYWRIGHT_CHANNEL || "chromium";
const serverPort = Number(process.env.PLAYWRIGHT_PORT || 4173);

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  reporter: "line",
  expect: { timeout: process.env.CI ? 20000 : 5000 },
  use: {
    baseURL: `http://127.0.0.1:${serverPort}`,
    trace: "retain-on-failure",
    launchOptions: {
      // Headless browsers and CI runners have no GPU. ANGLE's SwiftShader
      // software backend lets the Three.js forest demo create a WebGL context.
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    }
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], browserName: "chromium", channel: chromiumChannel, viewport: { width: 1280, height: 720 } }
    }
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${serverPort}`,
    port: serverPort,
    reuseExistingServer: true
  }
});
