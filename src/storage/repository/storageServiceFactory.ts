import { IndexedDbStorageRepository } from "./storageRepository";
import { SecureStorage } from "../secureStorage";
import { storageEntitySchema } from "../schemas/storageSchemas";

export function createStorageService(namespace = "health_companion") {
  const repository = new IndexedDbStorageRepository(storageEntitySchema);

  return new SecureStorage(repository, namespace);
}
