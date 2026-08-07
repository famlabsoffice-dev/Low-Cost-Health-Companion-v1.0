import { defineConfig } from '@playwright/test';

const isAndroidTermux = Boolean(process.env.ANDROID_ROOT || process.env.ANDROID_DATA);
const skipBrowser = isAndroidTermux && !process.env.PLAYWRIGHT_ANDROID_BROWSER;

export default defineConfig({
  testDir: './tests',
  ...(skipBrowser
    ? { projects: [] }
    : {
        projects: [
          {
            name: 'chromium',
            use: {
              browserName: 'chromium'
            }
          }
        ]
      })
});
