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
- [x] Health timeline UX hardening
- [x] Risk-result explainability and safe presentation
- [x] Input validation/error UX
- [x] Accessibility and mobile regression
- [x] PWA install/update lifecycle validation

## Phase 5A — Risk Engine v1.2.0 Clinical Coverage Completion
- [ ] Regelmatrix gegen `docs/RISK-ENGINE-SPEC.md` vollständig und automatisiert prüfen
- [ ] Fehlende klinische Hochrisiko-Signale gegenüber der freigegebenen Spezifikation identifizieren
- [ ] Freigegebene Synonyme und Sprachvarianten deterministisch ergänzen
- [ ] Kontext- und Kombinationsregeln erweitern, ohne freie klinische Inferenz
- [ ] Negations- und Boundary-Regressionen erweitern
- [ ] Risk Engine Release Gate vollständig automatisieren
- [ ] Vollständige Regelabdeckung im CI erzwingen
- [ ] Unbekannte oder duplizierte Rule-IDs und Aliase im CI ablehnen
- [ ] Jede Emergency-Regel mit Negations- und Positive-after-negation-Tests absichern
- [ ] Jede Combination Rule positiv und partiell negiert testen
- [ ] Clinical Safety Gate automatisieren
- [ ] Medizinische Regeldefinitionen strikt von Software-Logik trennen
- [ ] Diagnoseaussagen ausschließen
- [ ] Emergency-Ausgaben eindeutig und handlungsorientiert validieren
- [ ] Unsicherheit konservativ behandeln
- [ ] End-to-End Health Flow validieren: Input → Persistenz → Risk Engine → Timeline → Reload → Decrypt → Restore
- [ ] Risk-Ergebnis nach Backup/Restore auf semantische Äquivalenz prüfen
- [ ] Release Candidate gegen vollständiges CI Release Gate validieren
- [ ] Playwright Desktop + Mobile validieren
- [ ] Offline/Online validieren
- [ ] Migration/Restore validieren
- [ ] Production Build validieren
- [ ] Dependency/Supply-Chain validieren
- [ ] Unabhängige klinische Fachprüfung der Regelmatrix, Synonyme sowie Kontext-/Kombinationsregeln durchführen und als Evidence dokumentieren
- [ ] Product Completion Gate erst nach vollständigen Nachweisen von HOLD auf PASS setzen

## Execution Order
1. Risk Engine v1.2.0 Clinical Coverage Completion
2. End-to-End Integrity
3. Privacy and Security Hardening
4. Release Engineering
5. Product Readiness
6. Product Completion Gate
