import { describe, expect, it } from 'vitest';
import { KeyManager } from '../../src/security/keys/keyManager';

describe('KeyManager', () => {
  it('creates key manager instance', () => {
    expect(new KeyManager()).toBeDefined();
  });

  it('exposes key lifecycle methods', () => {
    const manager = new KeyManager();
    expect(typeof manager.generate).toBe('function');
    expect(typeof manager.export).toBe('function');
    expect(typeof manager.import).toBe('function');
  });
});
