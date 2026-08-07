import { WebCryptoEngine } from '../security/crypto/webCryptoEngine';
import { DefaultCryptoPipeline } from '../security/crypto/cryptoPipeline';
import { StaticCryptoKeyProvider } from '../security/crypto/staticCryptoKeyProvider';
import { EncryptedRepository } from '../security/storage/encryptedRepository';
import { MemorySecureStorage } from '../security/storage/secureStorage';
import { HealthRecordRepository } from './healthRecordRepository';

async function createCryptoPipeline() {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );

  const engine = new WebCryptoEngine(new StaticCryptoKeyProvider(key));

  return new DefaultCryptoPipeline(engine);
}

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const secureStorage = new MemorySecureStorage();
  const cryptoPipeline = await createCryptoPipeline();
  const encryptedRepository = new EncryptedRepository(secureStorage, cryptoPipeline);

  return new HealthRecordRepository(encryptedRepository);
}
