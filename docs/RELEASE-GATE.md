# Release Gate

A release is permitted only when all mandatory checks pass.

## Mandatory
- TypeScript typecheck passes.
- Unit tests pass.
- Chromium browser tests pass.
- Mobile Chrome browser tests pass.
- Offline startup and reload pass.
- Encrypted storage migration passes without plaintext persistence.
- Backup restore reproduces validated health data.
- Key rotation preserves decryptability of retained backups.
- Health Input → Risk Engine → Timeline integration passes.
- Production build succeeds.

## Security
- No plaintext health payload is written to persistent storage.
- Encryption keys are not persisted as application data.
- Retired keys cannot decrypt newly created data.
- Service-worker caches contain no sensitive runtime payloads.
- Restore failures are atomic and do not corrupt existing data.

## Release decision
PASS only if every mandatory check succeeds. Any failure blocks release.
