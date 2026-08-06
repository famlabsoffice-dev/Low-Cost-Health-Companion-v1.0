import { describe, expect, it } from 'vitest';
import { createRecoverySnapshot } from '../../src/security/recovery/recoverySnapshot';

describe('Recovery Snapshot', () => {
  it('creates encrypted recovery metadata', () => {
    const snapshot = createRecoverySnapshot('encrypted', 'checksum');

    expect(snapshot.encryptedPayload).toBe('encrypted');
    expect(snapshot.checksum).toBe('checksum');
    expect(snapshot.version).toBe(1);
  });
});
