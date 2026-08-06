export interface RecoverySnapshot {
  version: number;
  createdAt: number;
  checksum: string;
  payload: string;
}

export class RecoveryLayer {
  create(payload: string): RecoverySnapshot {
    return {
      version: 1,
      createdAt: Date.now(),
      checksum: this.hash(payload),
      payload,
    };
  }

  restore(snapshot: RecoverySnapshot): string {
    if (this.hash(snapshot.payload) !== snapshot.checksum) {
      throw new Error('Recovery integrity check failed');
    }
    return snapshot.payload;
  }

  private hash(value: string): string {
    let hash = 0;
    for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return hash.toString(16);
  }
}
