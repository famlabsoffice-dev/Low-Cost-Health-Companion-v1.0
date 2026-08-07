import { EncryptedRepository } from '../security/storage/encryptedRepository';
import { MemorySecureStorage } from '../security/storage/secureStorage';
import { HealthRecordRepository } from './healthRecordRepository';

export function createHealthRecordRepository(): HealthRecordRepository {
  const secureStorage = new MemorySecureStorage();
  const encryptedRepository = new EncryptedRepository(secureStorage);

  return new HealthRecordRepository(encryptedRepository);
}
