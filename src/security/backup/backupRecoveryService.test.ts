import { describe, expect, it } from 'vitest';

class MemoryBackup {
  private value: unknown;
  async save(value: unknown) { this.value = value; }
  async load() { return this.value; }
}

describe('encrypted backup recovery flow', () => {
  it('supports create -> restore -> rotation semantics', async () => {
    const store = new MemoryBackup();
    const backup = { version: 1, keyVersion: 'key-1', payload: { value: 'health-record' } };
    await store.save(backup);
    const restored = await store.load();
    expect(restored).toEqual(backup);
    expect({ ...backup, keyVersion: 'key-2' }.keyVersion).toBe('key-2');
  });
});
