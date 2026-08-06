import { describe, expect, it } from 'vitest';
import { IndexedDbSecureStorage } from '../../src/security/storage/indexedDbSecureStorage';

describe('IndexedDbSecureStorage', () => {
  it('exports storage implementation', () => {
    const storage = new IndexedDbSecureStorage();
    expect(storage).toBeDefined();
  });

  it('exposes persistence operations', () => {
    const storage = new IndexedDbSecureStorage();
    expect(typeof storage.set).toBe('function');
    expect(typeof storage.get).toBe('function');
    expect(typeof storage.remove).toBe('function');
  });
});
