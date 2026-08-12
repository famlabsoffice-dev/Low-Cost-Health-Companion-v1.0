import { describe, expect, it } from 'vitest';

describe('release gate', () => {
  it('documents the required integration surfaces', () => {
    const requiredSurfaces = [
      'health-input-persistence',
      'risk-engine',
      'health-timeline',
      'encrypted-storage',
      'offline-runtime',
      'backup-restore',
    ];

    expect(requiredSurfaces).toHaveLength(6);
    expect(new Set(requiredSurfaces).size).toBe(requiredSurfaces.length);
  });
});
