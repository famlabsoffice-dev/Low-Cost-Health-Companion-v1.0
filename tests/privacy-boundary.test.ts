import { describe, expect, test } from 'vitest';
import { PrivacyBoundary } from '../src/security/privacy/privacyBoundary';

describe('PrivacyBoundary', () => {
  const boundary = new PrivacyBoundary();
  const dataClasses = ['symptom', 'measurement'];

  test('allows local analysis without external consent', () => {
    expect(boundary.evaluate({
      purpose: 'local-analysis',
      dataClasses,
      consent: { granted: false, purposes: [] },
    })).toEqual({ allowed: true, reason: 'local-processing' });
  });

  test('denies external AI without explicit consent', () => {
    expect(boundary.evaluate({
      purpose: 'external-ai',
      dataClasses,
      consent: { granted: false, purposes: [] },
    })).toEqual({ allowed: false, reason: 'explicit-consent-required' });
  });

  test('requires consent for the requested purpose', () => {
    expect(boundary.evaluate({
      purpose: 'sync',
      dataClasses,
      consent: { granted: true, purposes: ['backup'] },
    })).toEqual({ allowed: false, reason: 'purpose-not-consented' });
  });

  test('rejects expired consent', () => {
    expect(boundary.evaluate({
      purpose: 'external-ai',
      dataClasses,
      consent: { granted: true, purposes: ['external-ai'], expiresAt: 1000 },
      now: 1000,
    })).toEqual({ allowed: false, reason: 'consent-expired' });
  });

  test('rejects requests without data classes', () => {
    expect(boundary.evaluate({
      purpose: 'local-analysis',
      dataClasses: [],
      consent: { granted: false, purposes: [] },
    })).toEqual({ allowed: false, reason: 'empty-data-class' });
  });

  test('assertAllowed throws on denied processing', () => {
    expect(() => boundary.assertAllowed({
      purpose: 'external-ai',
      dataClasses,
      consent: { granted: false, purposes: [] },
    })).toThrow('Privacy boundary denied external-ai: explicit-consent-required');
  });
});
