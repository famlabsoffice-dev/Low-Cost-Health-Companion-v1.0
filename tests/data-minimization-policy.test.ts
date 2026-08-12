import { describe, expect, test } from 'vitest';
import { DataMinimizationPolicy } from '../src/security/privacy/dataMinimizationPolicy';

describe('DataMinimizationPolicy', () => {
  const policy = new DataMinimizationPolicy([
    {
      dataClass: 'health-record',
      purpose: 'external-ai',
      allowedFields: ['id', 'symptom', 'severity'],
    },
    {
      dataClass: 'health-record',
      purpose: 'local-analysis',
      allowedFields: ['id', 'symptom', 'severity', 'createdAt', 'updatedAt'],
    },
  ]);

  test('removes fields not explicitly allowlisted for the processing purpose', () => {
    expect(policy.minimize('health-record', 'external-ai', {
      id: 'record-1',
      symptom: 'headache',
      severity: 3,
      createdAt: '2026-08-12T10:00:00.000Z',
      privateNote: 'unrelated sensitive detail',
    })).toEqual({ id: 'record-1', symptom: 'headache', severity: 3 });
  });

  test('applies a separate allowlist per purpose', () => {
    expect(policy.minimize('health-record', 'local-analysis', {
      id: 'record-1',
      symptom: 'headache',
      severity: 3,
      createdAt: '2026-08-12T10:00:00.000Z',
      privateNote: 'unrelated sensitive detail',
    })).toEqual({
      id: 'record-1',
      symptom: 'headache',
      severity: 3,
      createdAt: '2026-08-12T10:00:00.000Z',
    });
  });

  test('does not mutate the source value', () => {
    const source = { id: 'record-1', symptom: 'headache', privateNote: 'secret' };
    policy.minimize('health-record', 'external-ai', source);
    expect(source).toEqual({ id: 'record-1', symptom: 'headache', privateNote: 'secret' });
  });

  test('rejects duplicate rules', () => {
    expect(() => new DataMinimizationPolicy([
      { dataClass: 'health-record', purpose: 'backup', allowedFields: ['id'] },
      { dataClass: 'health-record', purpose: 'backup', allowedFields: ['id'] },
    ])).toThrow('Duplicate data minimization rule');
  });

  test('rejects missing rules instead of transmitting unminimized data', () => {
    expect(() => policy.minimize('health-record', 'sync', { id: 'record-1' }))
      .toThrow('No data minimization rule for sync:health-record');
  });
});
