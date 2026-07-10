import { defineConfig, devices } from '@playwright/test';

const PORT = 8080;
const baseURL = `http://localhost:${PORT}`;
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const hasRealBackend = Boolean(
  process.env.E2E_SUPABASE_URL &&
  process.env.E2E_SUPABASE_ANON_KEY &&
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY &&
  process.env.E2E_TEST_USER_EMAIL &&
  process.env.E2E_TEST_USER_PASSWORD
);

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/real-backend.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExecutablePath
          ? { launchOptions: { executablePath: chromiumExecutablePath } }
          : {}),
      },
    },
    {
      name: 'real-backend',
      testMatch: '**/real-backend.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExecutablePath
          ? { launchOptions: { executablePath: chromiumExecutablePath } }
          : {}),
      },
    },
  ],
  webServer: {
    command: hasRealBackend ? 'npm run dev -- --mode e2e-real-backend' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: hasRealBackend
      ? {
          VITE_SUPABASE_URL: process.env.E2E_SUPABASE_URL!,
          VITE_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_SUPABASE_ANON_KEY!,
        }
      : undefined,
  },
});
