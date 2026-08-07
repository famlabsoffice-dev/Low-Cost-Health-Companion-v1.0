import { PersistentStorageCryptoKeyProvider } from './persistentStorageCryptoKeyProvider';
import { IndexedDbSecureStorage } from './indexedDbSecureStorage';

export function createStorageService() {
  const keyProvider = new PersistentStorageCryptoKeyProvider();
  const storage = new IndexedDbSecureStorage();

  return { storage, keyProvider };
}
