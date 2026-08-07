import { defineConfig } from '@playwright/test';

<<<<<<< HEAD
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
=======
const isTermux =
  Boolean(process.env.TERMUX_VERSION) ||
  Boolean(process.env.ANDROID_ROOT) ||
  Boolean(process.env.PREFIX?.includes('com.termux'));

export default defineConfig({
  testDir: './tests',
  projects: isTermux
    ? []
    : [
        {
          name: 'chromium',
          use: {
            browserName: 'chromium',
          },
        },
      ],
>>>>>>> 38d1292 (test: execute indexeddb restore browser validation)
});
