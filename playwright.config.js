import { defineConfig, devices } from '@playwright/test';

const isTermux = Boolean(process.env.TERMUX_VERSION || process.env.ANDROID_ROOT || process.env.PREFIX?.includes('com.termux'));

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.playwright.spec.js', '**/*.e2e.spec.js', '**/*.browser.spec.js'],
  timeout: 60000,
  reporter: [['list']],
  webServer: isTermux ? undefined : { command: 'node ./scripts/browser-test-server.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
  projects: isTermux
    ? []
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173' },
        },
        {
          name: 'mobile-chrome',
          use: { ...devices['Pixel 5'], baseURL: 'http://127.0.0.1:4173' },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'], baseURL: 'http://127.0.0.1:4173' },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'], baseURL: 'http://127.0.0.1:4173' },
        },
      ],
});
