# Low Cost Health Companion — Post-MVP Roadmap

## Phase 1 — Release Hardening
- [x] Architecture baseline
- [x] Secure storage and AES-GCM encryption-at-rest
- [x] Persistent key recovery
- [x] Cleartext-to-encrypted migration
- [x] Encrypted backup and restore
- [x] Backup key rotation
- [x] Offline runtime and service-worker startup
- [x] Health input persistence
- [x] Risk engine
- [x] Health timeline

## Phase 2 — End-to-End Integrity
- [x] Health Input → Risk Engine → Timeline integration test
- [x] Encryption boundary verification across the complete health-data path
- [x] Offline write → reload → decrypt → timeline validation
- [x] Backup → restore → risk/timeline equivalence validation
- [x] Failure-atomicity and recovery regression suite

## Phase 3 — Privacy and Security Hardening
- [x] Consent and privacy-boundary enforcement
- [x] Sensitive-data minimization and retention rules
- [x] Key lifecycle and retirement audit
- [x] Backup confidentiality and integrity adversarial tests
- [x] Service-worker cache privacy review

## Phase 4 — Release Engineering
- [x] Full CI release gate
- [x] Browser matrix regression
- [x] Offline/online transition regression
- [x] Migration/restore compatibility gate
- [x] Dependency and supply-chain audit
- [x] Production build verification

## Phase 5 — Product Readiness
- [ ] Health timeline UX hardening
- [ ] Risk-result explainability and safe presentation
- [ ] Input validation/error UX
- [ ] Accessibility and mobile regression
- [ ] PWA install/update lifecycle validation

## Execution Order
1. End-to-End Integrity
2. Privacy and Security Hardening
3. Release Engineering
4. Product Readiness
