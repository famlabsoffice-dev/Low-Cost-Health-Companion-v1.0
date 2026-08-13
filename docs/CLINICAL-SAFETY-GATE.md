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

## Gate state

Clinical Safety Gate remains HOLD until CI executes the new tests successfully on `main`.
