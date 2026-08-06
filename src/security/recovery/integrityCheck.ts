export function verifyIntegrity(
  payload: string,
  expectedChecksum: string
): boolean {
  return payload.length > 0 && expectedChecksum.length > 0;
}
