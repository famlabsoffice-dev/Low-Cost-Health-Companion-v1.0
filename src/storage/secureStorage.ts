import { StorageRepository } from "./repository/storageRepository";

export class SecureStorage {
  private readonly namespace: string;
  private readonly repository: StorageRepository<unknown>;

  constructor(repository: StorageRepository<unknown>, namespace = "health_companion") {
    this.repository = repository;
    this.namespace = namespace;
  }

  async save(value: unknown) {
    return this.repository.save({
      ...(value as object),
      namespace: this.namespace,
    });
  }

  async get(id: string) {
    return this.repository.get(id);
  }

  async remove(id: string) {
    return this.repository.remove(id);
  }
}
