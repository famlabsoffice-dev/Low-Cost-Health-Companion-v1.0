# Risk Engine Specification

## Scope

The Risk Engine is a deterministic, offline-capable signal evaluator. It is not a diagnostic system and must not claim to diagnose, exclude, or confirm disease.

## Input Contract

`HealthEvent` contains:

- `id`: non-empty identifier
- `symptom`: free-text symptom signal
- `severity`: numeric base severity supplied by the validated input pipeline
- `createdAt`: ISO timestamp

The engine trims and lowercases symptom text before rule matching using locale-independent normalization.

## Rule Contract

Every rule has:

- stable `id`
- rule `version`
- canonical `keyword`
- normalized `keywords` aliases
- numeric `weight`
- `level`
- explicit `emergency` flag

Rules are deterministic and evaluated offline. Alias expansion is explicit and finite; it is not intended to provide complete medical-language coverage.

## Matching

Matching is case-insensitive whole-signal matching against normalized symptom text. A rule matches when any configured alias occurs as a complete token sequence, not embedded inside another Unicode letter, number, or underscore sequence.

A matching alias is ignored when a supported negation term occurs in the preceding context window. Supported negation terms are:

- `no`
- `without`
- `not`
- `none`
- `denies`
- `denied`
- `kein`
- `keine`
- `keinen`
- `ohne`
- `nicht`

Negation scope resets at explicit punctuation boundaries (`.`, `,`, `;`, `:`, newline, `!`, `?`). A later positive occurrence is therefore not suppressed by an earlier negated occurrence after a boundary. A supported negation term within the bounded context suppresses that occurrence only.

Negation handling is a safety boundary, not a natural-language understanding system. It must not be represented as complete clinical negation detection.

## Scoring

`score = input.severity + sum(matching rule weights)`.

Level resolution:

1. Any explicit emergency rule match => `emergency`.
2. Otherwise `score >= 5` => `warning`.
3. Otherwise `score > 1` => `observation`.
4. Otherwise => `info`.

An emergency level must not be produced solely from a numeric score.

## Output Contract

`RiskAssessment` contains:

- `level`
- `score`
- `ruleIds`
- `reasons`
- `emergency`
- `engineVersion`

Stable rule IDs and engine version make assessments auditable and reproducible.

## Active Rule Set v1.2.0

| Rule ID | Canonical signal | Explicit aliases | Weight | Level | Emergency |
|---|---|---|---:|---|---|
| `symptom.chest-pain` | `chest pain` | chest pressure, chest tightness, Brustschmerz, Brustdruck, Brustenge | 10 | emergency | yes |
| `symptom.unconscious` | `unconscious` | passed out, loss of consciousness, bewusstlos, Bewusstlosigkeit, ohnmächtig | 10 | emergency | yes |
| `symptom.severe-breathing-difficulty` | `severe breathing difficulty` | severe shortness of breath, difficulty breathing, can't breathe, schwere Atemnot, Atemnot | 10 | emergency | yes |
| `symptom.stroke-warning` | `sudden weakness` | sudden numbness, speech difficulty, facial droop, plötzliche Schwäche, plötzliche Taubheit, Sprachstörung, Gesichtslähmung | 10 | emergency | yes |
| `symptom.severe-bleeding` | `severe bleeding` | uncontrolled bleeding, heavy bleeding, starke Blutung, unstillbare Blutung | 10 | emergency | yes |
| `symptom.seizure` | `seizure` | convulsion, Krampfanfall, Krampf | 10 | emergency | yes |
| `symptom.anaphylaxis` | `anaphylaxis` | anaphylactic reaction, Anaphylaxie, anaphylaktische Reaktion | 10 | emergency | yes |
| `symptom.poisoning-overdose` | `overdose` | poisoning, drug overdose, Überdosierung, Vergiftung | 10 | emergency | yes |
| `symptom.cardiac-arrest` | `cardiac arrest` | cardiac arrest suspected, no pulse, not breathing, Herzstillstand, kein Puls, keine Atmung, atmet nicht | 10 | emergency | yes |
| `symptom.choking` | `choking` | choked, airway obstruction, verschluckt, Erstickungsanfall, Atemwegsverlegung | 10 | emergency | yes |
| `symptom.sudden-severe-headache` | `sudden severe headache` | worst headache, thunderclap headache, plötzlicher starker Kopfschmerz, schlimmster Kopfschmerz, Donnerschlagkopfschmerz | 10 | emergency | yes |
| `symptom.vomiting-blood` | `vomiting blood` | blood in vomit, haematemesis, hematemesis, Bluterbrechen, Blut im Erbrochenen | 10 | emergency | yes |
| `symptom.cyanosis` | `blue lips` | blue face, cyanosis, blaue Lippen, blaues Gesicht, Zyanose | 10 | emergency | yes |
| `symptom.severe-confusion` | `severe confusion` | sudden confusion, acute confusion, akute Verwirrtheit, plötzliche Verwirrtheit, starke Verwirrtheit | 10 | emergency | yes |
| `symptom.severe-abdominal-pain` | `severe abdominal pain` | severe stomach pain, severe belly pain, starke Bauchschmerzen, starke Magenschmerzen | 10 | emergency | yes |
| `symptom.severe-allergic-reaction` | `severe allergic reaction` | serious allergic reaction, schwere allergische Reaktion, starke allergische Reaktion | 10 | emergency | yes |
| `symptom.severe-burn` | `severe burn` | major burn, deep burn, schwere Verbrennung, tiefe Verbrennung | 10 | emergency | yes |
| `symptom.heat-stroke` | `heat stroke` | sunstroke severe, Hitzschlag, schwerer Sonnenstich | 10 | emergency | yes |
| `symptom.hypothermia` | `hypothermia` | severe hypothermia, Unterkühlung, schwere Unterkühlung | 10 | emergency | yes |
| `symptom.black-tarry-stool` | `black tarry stool` | tarry stool, melena, Teerstuhl, schwarzer Teerstuhl | 10 | emergency | yes |
| `symptom.suicidal-intent` | `suicidal intent` | intent to kill myself, planning suicide, Suizidabsicht, Selbstmordabsicht, Suizidplan | 10 | emergency | yes |
| `symptom.self-harm` | `self harm` | self-harm, self injury, Selbstverletzung, selbstverletzendes Verhalten | 10 | emergency | yes |
| `symptom.drowning` | `drowning` | near drowning, submersion, ertrinken, beinahe ertrunken, untergegangen | 10 | emergency | yes |
| `symptom.electric-shock` | `electric shock` | electrical shock, electrocution, Stromschlag, elektrischer Schlag, Elektrotrauma | 10 | emergency | yes |
| `symptom.major-trauma` | `major trauma` | major injury, serious injury, schweres Trauma, schwere Verletzung, schwer verletzt | 10 | emergency | yes |
| `symptom.sudden-vision-loss` | `sudden vision loss` | sudden loss of vision, blindness, plötzlicher Sehverlust, plötzlicher Verlust des Sehvermögens, Blindheit | 10 | emergency | yes |
| `symptom.severe-eye-injury` | `severe eye injury` | serious eye injury, penetrating eye injury, schwere Augenverletzung, ernste Augenverletzung, durchdringende Augenverletzung | 10 | emergency | yes |
| `symptom.severe-facial-swelling` | `severe facial swelling` | swelling of face, swollen face, starke Gesichtsschwellung, Gesicht stark angeschwollen, geschwollenes Gesicht | 10 | emergency | yes |
| `symptom.fever` | `fever` | high temperature, Fieber, erhöhte Temperatur | 3 | warning | no |
| `symptom.fatigue` | `fatigue` | tiredness, extreme tiredness, Erschöpfung, Müdigkeit | 1 | observation | no |
| `symptom.dizziness` | `dizziness` | lightheaded, Schwindel, Benommenheit | 2 | observation | no |
| `symptom.palpitations` | `palpitations` | racing heart, heart racing, Herzrasen, Herzklopfen | 2 | observation | no |

## Deterministic Coverage Extension v1.2.0

The v1.2.0 extension adds finite high-signal rules for cardiac arrest, choking/airway obstruction, sudden severe headache, vomiting blood, cyanosis, acute severe confusion, severe abdominal pain, severe allergic reaction, severe burns, heat stroke, hypothermia, black/tarry stool, suicidal intent, self-harm, drowning, electrical shock, major trauma, sudden vision loss, severe eye injury, and severe facial swelling.

These are signal triggers only and do not identify a diagnosis. The rules intentionally remain explicit and finite so that behavior is auditable and reproducible offline.

## Explicitly Unimplemented Clinical Scope

The current engine does not claim complete coverage for:

- complete multilingual clinical terminology
- robust natural-language negation parsing
- symptom combinations
- onset and duration
- age-dependent interpretation
- measured vital-sign thresholds
- medication and condition context
- pregnancy context
- trauma mechanism/context beyond explicit major-trauma signals
- clinical history
- comprehensive clinical emergency-sign coverage

These remain release-scope gaps and must not be silently inferred from the active rule set.

## Required Validation Before Production Release

- every active rule has automated positive coverage
- every emergency rule has emergency-boundary coverage
- supported aliases have automated coverage
- whole-signal boundary matching has automated coverage
- negated emergency signals do not match in covered forms
- a later positive occurrence after a negated occurrence is detected
- sentence-boundary negation scope is verified
- unsupported input produces no fabricated assessment
- rule IDs and engine version are present in every assessment
- deterministic repeated evaluation is verified
- Health Input -> Risk Engine -> Timeline integration passes
- current HEAD passes the complete CI release gate
- clinical rule-set breadth is independently reviewed before being marked complete

## Safety Boundary

The presentation layer must preserve the distinction between a risk signal and a medical diagnosis. Emergency presentation must direct the user toward appropriate urgent medical care without asserting a diagnosis.
