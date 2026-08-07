import { test, expect } from '@playwright/test';

test('browser crypto performance benchmark profiles', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const payload = new Uint8Array(1024 * 1024);
    crypto.getRandomValues(payload);
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const start = performance.now();
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
    return { milliseconds: performance.now() - start, bytes: payload.byteLength };
  });

  expect(result.bytes).toBe(1048576);
  expect(result.milliseconds).toBeGreaterThan(0);
});
