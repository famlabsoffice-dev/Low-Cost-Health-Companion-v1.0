# Clinical Safety Gate

## Required controls

- Medical rule definitions remain separate from software risk-evaluation logic.
- Risk outputs must not contain diagnosis statements.
- Emergency outputs must identify the emergency condition signal and provide an explicit action-oriented escalation.
- Unsupported or uncertain input must not be promoted to an emergency without a deterministic configured signal.
- Negation boundaries must not suppress a later positive emergency signal.
- Combination rules require every required positive signal and fail closed when a required component is negated.

## Automated evidence

- `src/clinical-safety/clinicalSafetyGate.test.ts`
- `src/risk-engine/ruleCoverage.test.ts`
- `src/health-flow/healthFlowRiskRestore.test.ts`
- GitHub Actions Test Suite run `31667682170` on `main`
- HEAD `461440c49039909c81694d375a883499078d3744`
- Unit Tests: PASS
- TypeScript typecheck: PASS
- Playwright Chromium: PASS
- Playwright Mobile Chrome: PASS
- Playwright Chromium installation with dependencies: PASS

## Gate state

Clinical Safety Gate: PASS.

Evidence requirement satisfied by successful CI execution of the new tests and the complete automated test suite on `main` at HEAD `461440c49039909c81694d375a883499078d3744`.
