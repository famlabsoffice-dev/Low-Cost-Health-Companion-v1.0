export type ProcessingPurpose = 'local-analysis' | 'external-ai' | 'backup' | 'sync';

export interface ConsentState {
  granted: boolean;
  purposes: readonly ProcessingPurpose[];
  grantedAt?: number;
  expiresAt?: number;
}

export interface PrivacyRequest {
  purpose: ProcessingPurpose;
  dataClasses: readonly string[];
  consent: ConsentState;
  now?: number;
}

export interface PrivacyDecision {
  allowed: boolean;
  reason: 'local-processing' | 'explicit-consent-required' | 'consent-expired' | 'purpose-not-consented' | 'empty-data-class';
}

export class PrivacyBoundary {
  evaluate(request: PrivacyRequest): PrivacyDecision {
    if (request.dataClasses.length === 0) {
      return { allowed: false, reason: 'empty-data-class' };
    }

    if (request.purpose === 'local-analysis') {
      return { allowed: true, reason: 'local-processing' };
    }

    if (!request.consent.granted) {
      return { allowed: false, reason: 'explicit-consent-required' };
    }

    if (!request.consent.purposes.includes(request.purpose)) {
      return { allowed: false, reason: 'purpose-not-consented' };
    }

    const now = request.now ?? Date.now();
    if (request.consent.expiresAt !== undefined && now >= request.consent.expiresAt) {
      return { allowed: false, reason: 'consent-expired' };
    }

    return { allowed: true, reason: 'local-processing' };
  }

  assertAllowed(request: PrivacyRequest): void {
    const decision = this.evaluate(request);
    if (!decision.allowed) {
      throw new Error(`Privacy boundary denied ${request.purpose}: ${decision.reason}`);
    }
  }
}
