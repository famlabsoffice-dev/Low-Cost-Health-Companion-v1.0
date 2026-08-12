# Release Gate

The release gate covers the complete local-first health data path:

1. normalized health input
2. persisted health input
3. risk evaluation
4. health timeline persistence/query
5. encrypted storage
6. offline runtime
7. encrypted backup/restore
8. key rotation and recovery
9. cleartext-to-encrypted migration

A release candidate is valid only when the complete test suite and browser/offline suites pass on the same commit.

Required commands:

```text
pnpm test -- --run
pnpm exec tsc --noEmit
pnpm exec playwright test --project=chromium --project=mobile-chrome --reporter=line
```

CI is the authoritative release evidence. Local success alone does not qualify a release candidate.
