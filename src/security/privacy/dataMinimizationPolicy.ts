export type DataMinimizationPurpose = 'local-analysis' | 'external-ai' | 'backup' | 'sync';

export interface DataMinimizationRule {
  readonly dataClass: string;
  readonly purpose: DataMinimizationPurpose;
  readonly allowedFields: readonly string[];
}

export class DataMinimizationPolicy {
  private readonly rules: ReadonlyMap<string, ReadonlySet<string>>;

  constructor(rules: readonly DataMinimizationRule[]) {
    const entries = new Map<string, ReadonlySet<string>>();
    for (const rule of rules) {
      if (!rule.dataClass || !rule.purpose || rule.allowedFields.length === 0) {
        throw new Error('Invalid data minimization rule');
      }
      if (rule.allowedFields.some((field) => !field)) {
        throw new Error('Invalid data minimization field');
      }
      const key = `${rule.purpose}:${rule.dataClass}`;
      if (entries.has(key)) {
        throw new Error(`Duplicate data minimization rule: ${key}`);
      }
      entries.set(key, new Set(rule.allowedFields));
    }
    this.rules = entries;
  }

  minimize<T extends Record<string, unknown>>(
    dataClass: string,
    purpose: DataMinimizationPurpose,
    value: T,
  ): Partial<T> {
    if (!dataClass || !value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Invalid data minimization input');
    }

    const allowedFields = this.rules.get(`${purpose}:${dataClass}`);
    if (!allowedFields) {
      throw new Error(`No data minimization rule for ${purpose}:${dataClass}`);
    }

    const minimized: Partial<T> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(value, field)) {
        minimized[field as keyof T] = value[field as keyof T];
      }
    }
    return minimized;
  }
}
