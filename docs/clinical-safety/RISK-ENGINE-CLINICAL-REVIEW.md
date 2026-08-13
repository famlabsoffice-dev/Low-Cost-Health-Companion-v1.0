# Risk Engine v1.2.0 — Independent Clinical Review Package

## Purpose

This package is the human clinical-review layer for the deterministic Risk Engine. It does not replace automated tests and does not constitute clinical validation of the product as a whole.

## Review target

- Risk Engine version: `1.2.0`
- Review target: current `main` revision at the time of review
- Source rule matrix: `src/risk-engine/rules.ts`
- Combination rules: `src/risk-engine/combinations.ts`
- Evaluation logic: `src/risk-engine/riskEngine.ts`
- Automated regression suite: `pnpm test`
- TypeScript check: `pnpm typecheck`

## Independent reviewer requirements

The reviewer must be medically qualified, independent from the implementation and able to assess emergency-risk triage logic. The reviewer records name, professional qualification, role, organization, date and reviewed commit SHA.

## Review procedure

1. Run the current automated test suite and record the result.
2. Review every active rule ID in the rule matrix below.
3. For every rule, inspect its canonical signal, all configured aliases, risk level, emergency flag, weight and version.
4. Review the combination rules for clinical plausibility, required signals and resulting severity.
5. Execute the blinded clinical scenarios in the scenario table without using the expected system result as the clinical answer.
6. For each scenario, first record the medically appropriate risk classification independently.
7. Run the same input through the Risk Engine and record the actual system classification and matched rule IDs.
8. Mark every discrepancy as `CHANGE REQUIRED` and describe the required correction.
9. Review negation and boundary cases separately.
10. Sign the final decision only after all discrepancies have been resolved or explicitly accepted by the qualified reviewer.

## Allowed review decisions

- `PASS`: clinically acceptable as reviewed.
- `CHANGE REQUIRED`: correction required before clinical approval.
- `N/A`: not clinically applicable to the reviewer’s scope; provide a reason.

## Rule matrix review

| Rule ID | Canonical signal | Clinical validity | Synonyms complete | Risk level correct | Emergency flag correct | Review decision | Finding |
|---|---|---|---|---|---|---|---|
| `symptom.chest-pain` | chest pain | | | | | | |
| `symptom.unconscious` | unconscious | | | | | | |
| `symptom.severe-breathing-difficulty` | severe breathing difficulty | | | | | | |
| `symptom.stroke-warning` | sudden weakness | | | | | | |
| `symptom.severe-bleeding` | severe bleeding | | | | | | |
| `symptom.seizure` | seizure | | | | | | |
| `symptom.anaphylaxis` | anaphylaxis | | | | | | |
| `symptom.poisoning-overdose` | overdose | | | | | | |
| `symptom.cardiac-arrest` | cardiac arrest | | | | | | |
| `symptom.choking` | choking | | | | | | |
| `symptom.sudden-severe-headache` | sudden severe headache | | | | | | |
| `symptom.vomiting-blood` | vomiting blood | | | | | | |
| `symptom.cyanosis` | blue lips | | | | | | |
| `symptom.severe-confusion` | severe confusion | | | | | | |
| `symptom.severe-abdominal-pain` | severe abdominal pain | | | | | | |
| `symptom.severe-allergic-reaction` | severe allergic reaction | | | | | | |
| `symptom.severe-burn` | severe burn | | | | | | |
| `symptom.heat-stroke` | heat stroke | | | | | | |
| `symptom.hypothermia` | hypothermia | | | | | | |
| `symptom.black-tarry-stool` | black tarry stool | | | | | | |
| `symptom.suicidal-intent` | suicidal intent | | | | | | |
| `symptom.self-harm` | self harm | | | | | | |
| `symptom.drowning` | drowning | | | | | | |
| `symptom.electric-shock` | electric shock | | | | | | |
| `symptom.major-trauma` | major trauma | | | | | | |
| `symptom.sudden-vision-loss` | sudden vision loss | | | | | | |
| `symptom.severe-eye-injury` | severe eye injury | | | | | | |
| `symptom.severe-facial-swelling` | severe facial swelling | | | | | | |
| `symptom.fever` | fever | | | | | | |
| `symptom.fatigue` | fatigue | | | | | | |
| `symptom.dizziness` | dizziness | | | | | | |
| `symptom.palpitations` | palpitations | | | | | | |

## Combination-rule review

| Rule ID | Required signals | Clinical validity | Combination severity correct | Review decision | Finding |
|---|---|---|---|---|---|
| `combination.dizziness-palpitations` | dizziness + palpitations | | | | |
| `combination.fever-dizziness` | fever + dizziness | | | | |

## Blinded clinical scenarios

The reviewer must complete the `Clinical expectation` column before seeing or deriving the system result. The implementation team then fills the `System result` column from the current Risk Engine.

| ID | Input | Clinical expectation | System result | Match | Review decision | Finding |
|---|---|---|---|---|---|---|
| CR-01 | I have severe chest pain. | | | | | |
| CR-02 | Ich habe starke Brustschmerzen. | | | | | |
| CR-03 | I suddenly cannot breathe. | | | | | |
| CR-04 | Ich habe keine Atemnot. | | | | | |
| CR-05 | I passed out and lost consciousness. | | | | | |
| CR-06 | Plötzlich ist eine Seite meines Körpers schwach und ich habe eine Sprachstörung. | | | | | |
| CR-07 | I have uncontrolled bleeding. | | | | | |
| CR-08 | Ich hatte einen Krampfanfall. | | | | | |
| CR-09 | I have a severe allergic reaction. | | | | | |
| CR-10 | Ich habe starke Bauchschmerzen. | | | | | |
| CR-11 | I have a fever. | | | | | |
| CR-12 | Mir ist schwindelig. | | | | | |
| CR-13 | My heart is racing and I feel dizzy. | | | | | |
| CR-14 | Ich habe Fieber und mir ist schwindelig. | | | | | |
| CR-15 | I have no chest pain, but I have severe breathing difficulty. | | | | | |
| CR-16 | I have no dizziness, but my heart is racing. | | | | | |
| CR-17 | I have a sudden severe headache. | | | | | |
| CR-18 | Ich erbreche Blut. | | | | | |
| CR-19 | My lips are blue. | | | | | |
| CR-20 | I have severe confusion. | | | | | |
| CR-21 | I have a serious eye injury. | | | | | |
| CR-22 | Ich habe eine schwere Verbrennung. | | | | | |
| CR-23 | I am severely hypothermic. | | | | | |
| CR-24 | I have black tarry stool. | | | | | |
| CR-25 | I am planning suicide. | | | | | |
| CR-26 | I am not planning suicide, but I am thinking about hurting myself. | | | | | |
| CR-27 | I nearly drowned. | | | | | |
| CR-28 | I suffered an electric shock. | | | | | |
| CR-29 | I have a major injury. | | | | | |
| CR-30 | I suddenly lost my vision. | | | | | |
| CR-31 | My face is severely swollen. | | | | | |
| CR-32 | I have severe abdominal pain and vomiting blood. | | | | | |
| CR-33 | I have fever, dizziness and palpitations. | | | | | |
| CR-34 | I have no fever, but I feel dizzy. | | | | | |
| CR-35 | I am tired and have no chest pain. | | | | | |

## Required negative/false-positive review

The reviewer must specifically verify that negated signals are not treated as positive signals and that a later positive signal remains detectable after a negation.

| ID | Input | Clinical expectation | System result | Review decision | Finding |
|---|---|---|---|---|---|
| NEG-01 | I have no chest pain. | | | | |
| NEG-02 | I have no chest pain, but now I have severe chest pain. | | | | |
| NEG-03 | Keine Atemnot, aber jetzt starke Brustschmerzen. | | | | |
| NEG-04 | I do not have dizziness, but my heart is racing. | | | | |
| NEG-05 | I have no fever. | | | | |

## Clinical review result

- Reviewer name:
- Professional qualification:
- Organization:
- Date:
- Reviewed commit SHA:
- Risk Engine version:
- Automated tests verified:
- Rules reviewed:
- Combination rules reviewed:
- Clinical scenarios reviewed:
- Negation/boundary scenarios reviewed:
- Findings requiring change:
- Final decision: `PASS` / `CHANGE REQUIRED`
- Reviewer confirmation:

## Release rule

`CHANGE REQUIRED` blocks independent clinical approval. A `PASS` is valid only for the exact reviewed Risk Engine version and commit SHA. Any subsequent change to rules, synonyms, combination rules, context handling or negation handling requires a new clinical review of the affected scope.
