import { defineConfig } from '@playwright/test';

const isAndroidTermux = Boolean(process.env.ANDROID_ROOT || process.env.ANDROID_DATA);

export default defineConfig({
  testDir: './tests',
  ...(isAndroidTermux
    ? { projects: [] }
    : {
        use: {
          browserName: 'chromium'
        }
      })
});
