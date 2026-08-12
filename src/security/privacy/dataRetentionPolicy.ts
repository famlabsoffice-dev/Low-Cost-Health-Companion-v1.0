export interface RetentionPolicy {
  readonly dataClass: string;
  readonly retentionMs: number;
}

export interface RetentionRecord {
  readonly dataClass: string;
  readonly createdAt: number;
}

export class DataRetentionPolicy {
  constructor(private readonly policies: readonly RetentionPolicy[]) {
    for (const policy of policies) {
      if (!policy.dataClass || !Number.isFinite(policy.retentionMs) || policy.retentionMs < 0) {
        throw new Error('Invalid retention policy');
      }
    }
  }

  isExpired(record: RetentionRecord, now: number): boolean {
    const policy = this.policies.find((candidate) => candidate.dataClass === record.dataClass);
    if (!policy) return false;
    if (!Number.isFinite(record.createdAt) || !Number.isFinite(now)) {
      throw new Error('Invalid retention timestamp');
    }
    return now >= record.createdAt + policy.retentionMs;
  }

  filterExpired(records: readonly RetentionRecord[], now: number): RetentionRecord[] {
    return records.filter((record) => this.isExpired(record, now));
  }
}
