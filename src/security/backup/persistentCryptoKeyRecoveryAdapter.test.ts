import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';
import { PersistentCryptoKeyRecoveryAdapter } from './persistentCryptoKeyRecoveryAdapter';

function createProvider(databaseName: string): PersistentCryptoKeyProvider {
  return new PersistentCryptoKeyProvider(undefined);
}

describe('persistent crypto key recovery adapter', () => {
  it('recovers a real AES-GCM key after provider recreation', async () => {
    const keyId = `recovery-${crypto.randomUUID()}`;
    const firstProvider = new PersistentCryptoKeyProvider();
    const firstAdapter = new PersistentCryptoKeyRecoveryAdapter(firstProvider, keyId);
    const originalKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );

    await firstAdapter.saveCryptoKey('1', originalKey);

    const recoveredAdapter = new PersistentCryptoKeyRecoveryAdapter(
      new PersistentCryptoKeyProvider(),
      keyId,
    );
    const recoveredKey = await recoveredAdapter.importCryptoKey('1');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('persistent-key-recovery');
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      recoveredKey,
      plaintext,
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      recoveredKey,
      ciphertext,
    );

    expect(new TextDecoder().decode(decrypted)).toBe('persistent-key-recovery');
    expect(await recoveredAdapter.load('1')).toMatchObject({ kty: 'oct', alg: 'A256GCM' });
  });

  it('rejects invalid and conflicting recovery versions', async () => {
    const keyId = `recovery-${crypto.randomUUID()}`;
    const adapter = new PersistentCryptoKeyRecoveryAdapter(
      new PersistentCryptoKeyProvider(),
      keyId,
    );
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    const otherKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );

    await expect(adapter.saveCryptoKey('0', key)).rejects.toThrow('Invalid crypto key version: 0');
    await adapter.saveCryptoKey('1', key);
    await expect(adapter.saveCryptoKey('1', otherKey)).rejects.toThrow('Crypto key version conflict');
  });

  it('removes the current recovery key and leaves no recoverable key', async () => {
    const keyId = `recovery-${crypto.randomUUID()}`;
    const adapter = new PersistentCryptoKeyRecoveryAdapter(
      new PersistentCryptoKeyProvider(),
      keyId,
    );
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );

    await adapter.saveCryptoKey('1', key);
    await adapter.remove('1');

    await expect(adapter.importCryptoKey('1')).rejects.toThrow('Crypto key version was not found');
  });
});
