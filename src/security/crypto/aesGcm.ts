const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encoder.encode(data)
  );

  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...result));
}

export async function decryptData(
  encrypted: string,
  key: CryptoKey
): Promise<string> {
  const data = Uint8Array.from(
    atob(encrypted),
    c => c.charCodeAt(0)
  );

  const iv = data.slice(0, 12);
  const payload = data.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    payload
  );

  return decoder.decode(decrypted);
}
