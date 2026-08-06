import { IndexedDbStorageRepository } from "./storageRepository";
import { SecureStorage } from "../secureStorage";
import { versionedStorageSchema } from "../schemas/storageSchemas";

export function createStorageService(namespace = "health_companion") {
  const repository = new IndexedDbStorageRepository(versionedStorageSchema);

  return new SecureStorage(repository, namespace);
}
