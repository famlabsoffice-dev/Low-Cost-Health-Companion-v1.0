import { test, expect } from '@playwright/test';

for (const profile of ['desktop', 'mobile']) {
  test(`${profile} browser storage crypto performance`, async ({ page }) => {
    await page.goto('/');

    const metrics = await page.evaluate(async () => {
      const payload = new Uint8Array(1024 * 1024);
      const entropyChunkSize = 65536;
      for (let offset = 0; offset < payload.byteLength; offset += entropyChunkSize) {
        crypto.getRandomValues(payload.subarray(offset, Math.min(offset + entropyChunkSize, payload.byteLength)));
      }
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const start = performance.now();
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
      const encryptionMs = performance.now() - start;
      return { encryptionMs, bytes: encrypted.byteLength };
    });

    expect(metrics.bytes).toBeGreaterThan(0);
    expect(metrics.encryptionMs).toBeLessThan(10000);
  });
}
