# Release Readiness

## Current release status

- Technical test suite: PASS on last verified main run
- Independent clinical review: PENDING
- Clinical Safety Gate: HOLD
- Product Completion: HOLD
- Release candidate work: tracked in issue #14

## Release-critical user functions

1. Health input capture
2. Deterministic risk assessment
3. Health timeline persistence
4. Offline operation
5. Encrypted local storage
6. Backup, key recovery and restore
7. Data retention and minimization controls
8. PWA/service-worker runtime
9. User-facing browser verification
10. Clinical review evidence

## Release rule

No clinical or product-completion PASS is permitted while independent clinical review is pending. Any change to risk rules, aliases, combinations, context or negation handling requires renewed clinical review of the affected scope.
