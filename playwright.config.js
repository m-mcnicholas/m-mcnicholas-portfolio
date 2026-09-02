import { defineConfig, devices } from "@playwright/test";

const chromiumChannel = process.env.PLAYWRIGHT_CHANNEL || "chromium";
const serverPort = Number(process.env.PLAYWRIGHT_PORT || 4173);

// CI runners have no GPU. Point Chromium at ANGLE's SwiftShader software
// backend so the Three.js desktop scene can still create a WebGL context and
// reach `webgl-ready`; without this every desktop-scene spec times out.
const chromiumArgs = ["--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebRTC"];
if (process.env.CI) {
  chromiumArgs.push("--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader");
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  reporter: "line",
  // The scene runs a full-size warm-up render before adding `webgl-ready`; on
  // the software renderer that comfortably exceeds the 5s default.
  expect: { timeout: process.env.CI ? 20000 : 5000 },
  use: {
    baseURL: `http://127.0.0.1:${serverPort}`,
    trace: "retain-on-failure",
    launchOptions: {
      args: chromiumArgs
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
