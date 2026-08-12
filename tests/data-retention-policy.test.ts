import { describe, expect, test } from 'vitest';
import { DataRetentionPolicy } from '../src/security/privacy/dataRetentionPolicy';

describe('DataRetentionPolicy', () => {
  const policy = new DataRetentionPolicy([{ dataClass: 'symptom', retentionMs: 1_000 }]);

  test('expires records at the retention boundary', () => {
    expect(policy.isExpired({ dataClass: 'symptom', createdAt: 1_000 }, 1_999)).toBe(false);
    expect(policy.isExpired({ dataClass: 'symptom', createdAt: 1_000 }, 2_000)).toBe(true);
  });

  test('leaves data classes without a configured policy untouched', () => {
    expect(policy.isExpired({ dataClass: 'measurement', createdAt: 1_000 }, 100_000)).toBe(false);
  });

  test('filters only expired records', () => {
    expect(policy.filterExpired([
      { dataClass: 'symptom', createdAt: 1_000 },
      { dataClass: 'symptom', createdAt: 2_000 },
    ], 2_500)).toEqual([{ dataClass: 'symptom', createdAt: 1_000 }]);
  });

  test('rejects invalid policy configuration', () => {
    expect(() => new DataRetentionPolicy([{ dataClass: '', retentionMs: 1 }])).toThrow('Invalid retention policy');
    expect(() => new DataRetentionPolicy([{ dataClass: 'symptom', retentionMs: -1 }])).toThrow('Invalid retention policy');
  });

  test('rejects invalid timestamps', () => {
    expect(() => policy.isExpired({ dataClass: 'symptom', createdAt: Number.NaN }, 1)).toThrow('Invalid retention timestamp');
  });
});
