export async function reEncryptBackup(
  data: ArrayBuffer,
  oldKey: CryptoKey,
  newKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, oldKey, data);
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv }, newKey, decrypted);
}

export async function rotateLargeBackup(
  chunks: ArrayBuffer[],
  oldKey: CryptoKey,
  newKey: CryptoKey
): Promise<ArrayBuffer[]> {
  const result: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    result.push(await reEncryptBackup(chunk, oldKey, newKey));
  }
  return result;
}
