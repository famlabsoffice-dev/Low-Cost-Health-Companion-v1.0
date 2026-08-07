import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbCryptoKeyRecoveryAdapter } from './indexedDbCryptoKeyRecoveryAdapter';

describe('IndexedDB crypto key recovery adapter', () => {
  it('stores, reloads, imports, and removes a real AES-GCM CryptoKey', async () => {
    const adapter = new IndexedDbCryptoKeyRecoveryAdapter(`test-key-recovery-${crypto.randomUUID()}`);
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

    await adapter.saveCryptoKey('key-v2', key);

    const jwk = await adapter.load('key-v2');
    expect(jwk?.kty).toBe('oct');
    expect(jwk?.alg).toBe('A256GCM');

    const restoredKey = await adapter.importCryptoKey('key-v2');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('indexeddb-crypto-key-recovery');
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, restoredKey, plaintext);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, restoredKey, ciphertext);

    expect(new TextDecoder().decode(decrypted)).toBe('indexeddb-crypto-key-recovery');

    await adapter.remove('key-v2');
    expect(await adapter.load('key-v2')).toBeUndefined();
  });
});
