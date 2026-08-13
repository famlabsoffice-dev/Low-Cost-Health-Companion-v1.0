# Low Cost Health Companion — Vollständiger Masterplan

## Ziel
Offline-first, privacy-first Health Companion PWA mit sicherer lokaler Datenspeicherung, nachvollziehbarer Risikoauswertung, Health Timeline, Backup/Restore und belastbarer Release-Qualität.

## Phase 0 — Architecture Freeze
- [x] Repository- und Modulstruktur
- [x] TypeScript Strict Mode
- [x] Repository-/Service-Layer
- [x] Storage-Abstraktion
- [x] Testarchitektur
- [x] CI-Grundlage

## Phase 1 — Secure Storage Foundation
- [x] IndexedDB Storage
- [x] AES-GCM Encryption-at-Rest
- [x] Crypto Pipeline
- [x] Persistent Crypto-Key Provider
- [x] Key Recovery
- [x] Encrypted Repository
- [x] Storage Service Factory
- [x] Cleartext-to-Encrypted Migration
- [x] Failure Atomicity

## Phase 2 — Backup, Recovery & Key Lifecycle
- [x] Encrypted Backup
- [x] Backup Integrity Validation
- [x] Backup Restore
- [x] Backup Key Rotation
- [x] Persistent Key Recovery
- [x] Key Lifecycle Audit
- [x] Key Retirement Semantics
- [x] End-to-End Backup → Key Recovery → Restore → Decrypt → Validation

## Phase 3 — Offline Sync Engine
- [x] Offline write model
- [x] Local persistence
- [x] Sync state model
- [x] Retry/recovery semantics
- [x] Failure-safe synchronization boundaries
- [x] Offline/online transition coverage

## Phase 4 — PWA / Service Worker / Offline Runtime
- [x] Service Worker
- [x] App Shell caching
- [x] Offline startup
- [x] Runtime asset availability
- [x] IndexedDB runtime integration
- [x] PWA install lifecycle
- [x] PWA update lifecycle
- [x] Offline browser regression

## Phase 5 — Health Risk Engine
- [x] Risk engine foundation
- [x] Deterministic risk evaluation
- [x] Risk result model
- [x] Safe result boundaries
- [x] Explainability
- [x] Risk regression coverage
- [x] Stable rule IDs and rule versions
- [x] Engine version in risk assessments
- [x] Negation safety boundary for covered forms
- [x] Risk Engine specification documented
- [x] Active rule-set conformance to specification verified
- [x] Deterministic combination-rule contract implemented
- [x] Deterministic combination-rule regression coverage
- [x] Automated rule-set breadth coverage
- [x] Automated clinical-signal/synonym alias coverage for configured rules
- [x] Automated combination/context coverage for configured rules
- [ ] Rule-set coverage breadth independently clinically validated
- [ ] Clinical signal/synonym coverage independently reviewed
- [ ] Combination/context rule coverage independently clinically reviewed

## Phase 5A — Risk Engine v1.2.0 Clinical Coverage Completion
- [ ] Regelmatrix vollständig gegen `docs/RISK-ENGINE-SPEC.md` automatisiert erzwingen
- [ ] Fehlende klinische Hochrisiko-Signale gegenüber der freigegebenen Spezifikation identifizieren
- [ ] Freigegebene Synonyme und Sprachvarianten deterministisch ergänzen
- [ ] Kontext- und Kombinationsregeln erweitern, ohne freie klinische Inferenz
- [ ] Negations- und Boundary-Regressionen erweitern
- [ ] Risk Engine Release Gate als harter CI-Gate ausführen
- [ ] Vollständige Regelabdeckung automatisiert erzwingen
- [ ] Unbekannte oder duplizierte Rule-IDs und Aliase ablehnen
- [ ] Jede Emergency-Regel mit Negations- und Positive-after-negation-Test absichern
- [ ] Jede Combination Rule positiv und partiell negiert testen
- [ ] Clinical Safety Gate als harter CI-Gate ausführen
- [ ] Medizinische Regeldefinitionen von Software-Logik trennen
- [ ] Diagnoseaussagen technisch ausschließen
- [ ] Emergency-Ausgaben eindeutig und handlungsorientiert validieren
- [ ] Unsicherheit konservativ behandeln
- [ ] End-to-End Health Flow: Input → Persistenz → Risk Engine → Timeline → Reload → Decrypt → Restore
- [ ] Risk-Ergebnis nach Backup/Restore auf semantische Äquivalenz prüfen
- [ ] Release Candidate mit vollständigem CI Release Gate validieren
- [ ] Playwright Desktop + Mobile
- [ ] Offline/Online
- [ ] Migration/Restore
- [ ] Production Build
- [ ] Dependency/Supply-Chain
- [ ] Product Completion Gate erst nach vollständigen Nachweisen von HOLD auf PASS setzen

## Phase 6 — Health Input Pipeline
- [x] Health input domain model
- [x] Input validation
- [x] Normalization
- [x] Persistence
- [x] Error handling
- [x] Health Input → Risk Engine integration
- [x] Complete input-path encryption boundary verification

## Phase 7 — Health Timeline
- [x] Timeline domain model
- [x] Chronological persistence
- [x] Risk-result integration
- [x] Backup/restore equivalence
- [x] Timeline validation
- [x] Timeline UX hardening

## Phase 8 — Application UI / UX
- [x] Mobile-first application shell
- [x] Health input UX
- [x] Risk result presentation
- [x] Health timeline UX
- [x] Validation/error UX
- [x] Accessibility baseline
- [x] Mobile regression

## Phase 9 — Backend Hardening
- [x] Backend boundary definition
- [x] Secure API boundary
- [x] Input validation at trust boundaries
- [x] Rate-limit/security boundary coverage
- [x] Dependency/supply-chain audit

## Phase 10 — Privacy & Security Hardening
- [x] Consent enforcement
- [x] Privacy boundary for sensitive data
- [x] Sensitive-data minimization
- [x] Retention rules
- [x] Backup confidentiality tests
- [x] Backup integrity adversarial tests
- [x] Service-worker cache privacy review
- [x] Key lifecycle and retirement audit

## Phase 11 — End-to-End Integrity
- [x] Health Input → Risk Engine → Timeline E2E
- [x] Encryption boundary E2E
- [x] Offline write → reload → decrypt → timeline
- [x] Backup → restore → risk/timeline equivalence
- [x] Failure-atomicity regression suite
- [x] Migration/restore compatibility gate

## Phase 12 — Release Engineering
- [x] TypeScript validation
- [x] Unit/integration test suite
- [x] Production build verification
- [x] Chromium regression
- [x] Firefox regression
- [x] WebKit regression
- [x] Mobile Chrome regression
- [x] Offline/online regression
- [x] Dependency/supply-chain audit
- [x] Full CI release gate

## Phase 13 — Product Readiness
- [x] Accessibility hardening
- [x] Mobile UX regression
- [x] PWA install/update lifecycle
- [x] Safe health-result presentation
- [x] Input/error UX hardening

## Completion Gate
Der Masterplan gilt nur dann als vollständig, wenn jede Phase durch implementierten Code, automatisierte Regressionstests und erfolgreichen CI-Release-Gate-Lauf belegt ist. Ein vorhandener Test oder ein erfolgreicher Einzel-Run ersetzt nicht den Nachweis der vollständigen Phase.

## Current Verification State
- Verification HEAD: `ab2f561bfd46cc106488bc778da6f99d551a57b2`
- Masterplan Completion: NOT VERIFIED
- Health Input validation: VERIFIED
- Health Input normalization: VERIFIED
- Health Data Flow persistence: VERIFIED
- Health Data Flow → Risk Engine integration: VERIFIED
- Risk Engine deterministic evaluation: VERIFIED
- Risk Engine rule identity/versioning: VERIFIED
- Risk Engine negation boundary: VERIFIED for covered forms
- Risk Engine active rule-set conformance: VERIFIED against `docs/RISK-ENGINE-SPEC.md`
- Risk Engine deterministic combination implementation: VERIFIED by CI on preceding HEAD
- Risk Engine automated rule-set breadth coverage: IMPLEMENTED; current verification pending
- Clinical signal/synonym coverage: AUTOMATED for configured aliases; independent clinical review NOT VERIFIED
- Combination/context coverage: AUTOMATED for configured finite rules; independent clinical review NOT VERIFIED
- Full CI release-gate evidence for current HEAD: PENDING
- CI Release Gate: PENDING
- Product Completion Gate: HOLD
