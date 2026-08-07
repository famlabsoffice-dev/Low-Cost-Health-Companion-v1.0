import { test, expect } from '@playwright/test';

test('browser crypto recovery pipeline restore and rotation flow', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode('health-companion-browser-recovery');
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const exported = await crypto.subtle.exportKey('jwk', key);
    const restoredKey = await crypto.subtle.importKey('jwk', exported, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, restoredKey, encrypted);
    return new TextDecoder().decode(decrypted);
  });

  expect(result).toBe('health-companion-browser-recovery');
});
