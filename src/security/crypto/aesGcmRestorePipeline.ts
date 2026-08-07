export interface BackupEnvelope {
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
  algorithm: 'AES-GCM';
}

export async function importAesGcmKey(rawKey: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function restoreAesGcmBackup(
  envelope: BackupEnvelope,
  key: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: envelope.iv },
    key,
    envelope.ciphertext
  );
}
