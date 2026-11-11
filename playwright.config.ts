import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:5199/kawa-diary/',
  },
  webServer: {
    command: 'npm run dev:fake',
    url: 'http://localhost:5199/kawa-diary/',
    reuseExistingServer: !process.env.CI,
  },
});
