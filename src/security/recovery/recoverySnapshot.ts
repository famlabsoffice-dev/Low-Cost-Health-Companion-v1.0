export interface RecoverySnapshot {
  id: string;
  createdAt: number;
  checksum: string;
  encryptedPayload: string;
  version: number;
}

export function createRecoverySnapshot(
  encryptedPayload: string,
  checksum: string
): RecoverySnapshot {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    checksum,
    encryptedPayload,
    version: 1,
  };
}
