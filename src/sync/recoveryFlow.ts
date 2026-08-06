export interface RecoveryState {
  lastSuccessfulSync: number;
  failedItems: string[];
}

export class SyncRecoveryFlow {
  private state: RecoveryState = { lastSuccessfulSync: 0, failedItems: [] };

  markFailure(id: string) {
    this.state.failedItems.push(id);
  }

  markRecovered() {
    this.state = { lastSuccessfulSync: Date.now(), failedItems: [] };
  }

  getState(): RecoveryState {
    return this.state;
  }
}
