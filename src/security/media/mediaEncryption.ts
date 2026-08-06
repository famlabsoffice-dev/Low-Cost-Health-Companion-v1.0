export interface EncryptedMediaPayload {
  iv: string;
  data: ArrayBuffer;
}

export async function encryptMedia(blob: Blob, key: CryptoKey): Promise<EncryptedMediaPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    await blob.arrayBuffer()
  );

  return { iv: btoa(String.fromCharCode(...iv)), data };
}

export async function decryptMedia(payload: EncryptedMediaPayload, key: CryptoKey): Promise<Blob> {
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    payload.data
  );

  return new Blob([data]);
}
