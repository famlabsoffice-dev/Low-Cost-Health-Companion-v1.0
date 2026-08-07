import { PersistentStorageCryptoKeyProvider } from './persistentStorageCryptoKeyProvider';
import { MemorySecureStorage } from './secureStorage';

export function createStorageService() {
  const keyProvider = new PersistentStorageCryptoKeyProvider();
  const storage = new MemorySecureStorage();

  return { storage, keyProvider };
}
