import { WebCryptoEngine } from '../security/crypto/webCryptoEngine';
import { StaticCryptoKeyProvider } from '../security/crypto/cryptoKeyProvider';
import { EncryptedRepository } from '../security/storage/encryptedRepository';
import { MemorySecureStorage } from '../security/storage/secureStorage';
import { HealthRecordRepository } from './healthRecordRepository';

async function createCryptoEngine() {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );

  return new WebCryptoEngine(new StaticCryptoKeyProvider(key));
}

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const secureStorage = new MemorySecureStorage();
  const cryptoEngine = await createCryptoEngine();
  const encryptedRepository = new EncryptedRepository(secureStorage, cryptoEngine);

  return new HealthRecordRepository(encryptedRepository);
}
