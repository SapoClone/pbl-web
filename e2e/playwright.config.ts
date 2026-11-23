import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests of the tenant web app against a real local backend (the docker compose stack behind the
 * KrakenD gateway). Every test is recorded on video; open `npm run report` to watch them.
 *
 *   E2E_GATEWAY_URL  gateway of the stack under test (default http://localhost:18080)
 *   E2E_WEB_PORT     port of the vite dev server this config starts (default 5173: the only localhost origin
 *                    besides :3000 the gateway's CORS allows)
 */
const gateway = process.env.E2E_GATEWAY_URL ?? "http://localhost:18080"
const webPort = Number(process.env.E2E_WEB_PORT ?? 5173)

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  outputDir: "./reports/artifacts",
  // The tests share one store (created by the first spec), so they run in order, one at a time
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/html", open: "never" }],
  ],
  use: {
    baseURL: `http://localhost:${webPort}`,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    viewport: { width: 1366, height: 820 },
    video: { mode: "on", size: { width: 1366, height: 820 } },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 820 } } }],
  webServer: {
    command: `npx vite --port ${webPort} --strictPort`,
    cwd: "..",
    url: `http://localhost:${webPort}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      VITE_API_URL: `${gateway}/platform/api/v1`,
      VITE_GATEWAY_URL: gateway,
    },
  },
})
