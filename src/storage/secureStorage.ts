export class SecureStorage {
  private readonly namespace: string;

  constructor(namespace = "health_companion") {
    this.namespace = namespace;
  }
}
