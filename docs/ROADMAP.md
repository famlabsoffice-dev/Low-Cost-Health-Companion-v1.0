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
- [x] Regelmatrix gegen `docs/RISK-ENGINE-SPEC.md` vollständig und automatisiert prüfen
- [x] Fehlende klinische Hochrisiko-Signale gegenüber der freigegebenen Spezifikation identifizieren
- [x] Freigegebene Synonyme und Sprachvarianten deterministisch ergänzen
- [x] Kontext- und Kombinationsregeln erweitern, ohne freie klinische Inferenz
- [x] Negations- und Boundary-Regressionen erweitern
- [x] Risk Engine Release Gate vollständig automatisieren
- [x] Vollständige Regelabdeckung im CI erzwingen
- [x] Unbekannte oder duplizierte Rule-IDs und Aliase im CI ablehnen
- [x] Jede Emergency-Regel mit Negations- und Positive-after-negation-Tests absichern
- [x] Jede Combination Rule positiv und partiell negiert testen
- [x] Clinical Safety Gate automatisieren
- [x] Medizinische Regeldefinitionen strikt von Software-Logik trennen
- [x] Diagnoseaussagen ausschließen
- [x] Emergency-Ausgaben eindeutig und handlungsorientiert validieren
- [x] Unsicherheit konservativ behandeln
- [x] End-to-End Health Flow validieren: Input → Persistenz → Risk Engine → Timeline → Reload → Decrypt → Restore
- [x] Risk-Ergebnis nach Backup/Restore auf semantische Äquivalenz prüfen
- [x] Release Candidate gegen vollständiges CI Release Gate validieren
- [x] Playwright Desktop + Mobile validieren
- [x] Offline/Online validieren
- [x] Migration/Restore validieren
- [x] Production Build validieren
- [x] Dependency/Supply-Chain validieren
- [ ] Unabhängige klinische Fachprüfung der Regelmatrix, Synonyme sowie Kontext-/Kombinationsregeln durchführen und als Evidence dokumentieren
- [ ] Product Completion Gate erst nach vollständigen Nachweisen von HOLD auf PASS setzen

## Phase 5B — Real Product UX / Functional Integration
- [x] Erkenntnis dokumentieren: bestehende UI ist technisch vorhanden, aber für reale Nutzer noch nicht verständlich und funktional ausreichend
- [ ] Nutzerzentrierten Hauptworkflow definieren: Beschwerde erfassen → Risiko bewerten → Ergebnis verstehen → nächste Handlung → Verlauf
- [ ] Bestehende UI ohne Verlust vorhandener Funktionen auf den realen Health-Workflow ausrichten
- [ ] UI direkt an vorhandene Health Input-, Health Data Flow-, Risk Engine- und Timeline-Schichten anbinden
- [ ] Keine parallele Risk-Engine-, Storage- oder Verschlüsselungslogik im Browser einführen
- [ ] Echte Health-Ereignisse über die bestehende sichere Domain-/Repository-Schicht speichern
- [ ] Echte Risk-Ergebnisse verständlich und nicht-diagnostisch darstellen
- [ ] Echte Health Timeline aus persistierten Daten anzeigen
- [ ] Loading-, Empty-, Validation-, Error- und Recovery-Zustände vollständig abdecken
- [ ] Mobile-first Bedienbarkeit mit realen End-to-End-Interaktionen prüfen
- [ ] Klinische Sicherheitsgrenzen in der UI erhalten und testen
- [ ] Bestehende automatisierte Tests vor und nach UI-Integration vollständig bestehen lassen
- [ ] Product-UX Release Gate erst nach vollständigem End-to-End-Nachweis abschließen

## Execution Order
1. Unabhängige klinische Fachprüfung parallel fortführen
2. Phase 5B Real Product UX / Functional Integration
3. End-to-End Release Regression
4. Product Completion Gate
