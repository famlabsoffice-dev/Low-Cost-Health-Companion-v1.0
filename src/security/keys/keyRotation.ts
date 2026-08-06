export interface KeyRotationResult {
  previousKeyId: string;
  newKeyId: string;
  rotatedAt: number;
}

export class KeyRotation {
  createRotationRecord(previousKeyId: string, newKeyId: string): KeyRotationResult {
    return {
      previousKeyId,
      newKeyId,
      rotatedAt: Date.now(),
    };
  }
}
