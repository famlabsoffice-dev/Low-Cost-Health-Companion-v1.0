import { describe, expect, it } from 'vitest';
import { RecoveryLayer } from '../../../src/security/recovery/recoveryLayer';

describe('RecoveryLayer', () => {
  it('restores valid snapshots', () => {
    const layer = new RecoveryLayer();
    const snapshot = layer.create('health-data');
    expect(layer.restore(snapshot)).toBe('health-data');
  });

  it('rejects corrupted snapshots', () => {
    const layer = new RecoveryLayer();
    const snapshot = layer.create('health-data');
    snapshot.payload = 'modified';
    expect(() => layer.restore(snapshot)).toThrow();
  });
});
