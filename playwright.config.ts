import { defineConfig, devices } from '@playwright/test';

// The app is built for the same sub-path GitHub Pages serves it from, so the smoke test
// also catches a broken BASE_PATH.
const PORT = 4173;
const BASE = '/tricking-art/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
    // Set PW_CHROMIUM_PATH to use an already-installed Chromium instead of `playwright install`.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    env: { BASE_PATH: BASE }, // must reach both the build and `vite preview`
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
