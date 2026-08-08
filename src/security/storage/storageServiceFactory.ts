import { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';
import { WebCryptoEngine } from '../crypto/webCryptoEngine';
import { DefaultCryptoPipeline, type CryptoPipeline } from '../crypto/cryptoPipeline';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { SecureStorage } from './secureStorage';
import { versionedStorageSchema } from '../../storage/schemas/storageSchemas';

export async function createCryptoPipeline(): Promise<CryptoPipeline> {
  const keyProvider = new PersistentStorageCryptoKeyProvider();
  const engine = new WebCryptoEngine(keyProvider);
  return new DefaultCryptoPipeline(engine);
}

export async function createStorageService(
  namespace = 'health_companion',
  cryptoPipeline?: CryptoPipeline,
): Promise<SecureStorage> {
  const pipeline = cryptoPipeline ?? await createCryptoPipeline();
  const repository = new IndexedDbStorageRepository(
    versionedStorageSchema,
    pipeline,
  );

  return new SecureStorage(repository, namespace);
}
