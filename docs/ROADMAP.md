# Low Cost Health Companion — Post-MVP Roadmap

## Execution order

1. Release Gate & Integration Regression
   - Validate health input normalization and persistence.
   - Validate risk evaluation against persisted health input.
   - Validate timeline persistence/query behavior.
   - Validate encrypted storage and offline runtime together.
   - Establish one deterministic release-gate command and CI evidence.

2. Sync Hardening
   - Persist queue semantics across restarts.
   - Enforce deterministic conflict resolution.
   - Verify retry exhaustion and failure retention.
   - Verify encrypted persistence of queued health records.

3. Health Timeline Integrity
   - Enforce schema/version invariants.
   - Validate ordering, pagination, cursors, and deduplication.
   - Cover restart/offline recovery paths.

4. Risk Engine Integration
   - Connect normalized persisted input to risk evaluation.
   - Preserve deterministic rule/scoring behavior offline.
   - Persist evaluation provenance and schema version.

5. Privacy & Security Hardening
   - Audit data boundaries and sensitive logging.
   - Enforce encryption for all persisted health data.
   - Validate key recovery, rotation, backup, restore, and migration as one chain.

6. PWA Release Hardening
   - Verify install/update lifecycle.
   - Verify offline boot and cache invalidation.
   - Verify IndexedDB continuity after service-worker updates.

7. Observability & Failure Recovery
   - Standardize typed errors and recovery states.
   - Add actionable diagnostics without sensitive payloads.
   - Validate degraded/offline operation.

8. Final Release Qualification
   - Unit + typecheck + browser E2E + offline E2E.
   - Backup/restore/rotation regression.
   - Migration regression.
   - Clean-install and upgrade-path validation.
   - Release candidate gate.

## Rule

Each block is completed only when implementation, regression tests, and CI evidence exist on `main`. No placeholders or TODO-based completion are accepted.
