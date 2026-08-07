import { defineConfig, devices } from '@playwright/test';

const isTermux = Boolean(process.env.TERMUX_VERSION || process.env.ANDROID_ROOT || process.env.PREFIX?.includes('com.termux'));

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  reporter: [['list']],
  projects: isTermux
    ? []
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'mobile-chrome',
          use: { ...devices['Pixel 5'] },
        },
      ],
});
