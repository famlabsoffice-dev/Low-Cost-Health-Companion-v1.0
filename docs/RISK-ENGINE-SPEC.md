# Risk Engine Specification

## Scope

The Risk Engine is a deterministic, offline-capable signal evaluator. It is not a diagnostic system and must not claim to diagnose, exclude, or confirm disease.

## Input Contract

`HealthEvent` contains:

- `id`: non-empty identifier
- `symptom`: free-text symptom signal
- `severity`: numeric base severity supplied by the validated input pipeline
- `createdAt`: ISO timestamp

The engine trims and lowercases symptom text before rule matching.

## Rule Contract

Every rule has:

- stable `id`
- rule `version`
- `keyword`
- numeric `weight`
- `level`
- explicit `emergency` flag

Rules are deterministic and evaluated offline.

## Matching

Matching is case-insensitive substring matching against normalized symptom text.

A matching keyword is ignored when a supported negation term occurs in the preceding context window. Supported negation terms are:

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

## Current Rule Set

| Rule ID | Signal | Weight | Level | Emergency |
|---|---|---:|---|---|
| `symptom.chest-pain` | `chest pain` | 10 | emergency | yes |
| `symptom.unconscious` | `unconscious` | 10 | emergency | yes |
| `symptom.fever` | `fever` | 3 | warning | no |
| `symptom.fatigue` | `fatigue` | 1 | observation | no |

## Explicitly Unimplemented Clinical Scope

The current engine does not claim complete coverage for:

- synonyms and multilingual clinical terminology
- robust negation parsing
- symptom combinations
- onset and duration
- age-dependent interpretation
- measured vital-sign thresholds
- medication and condition context
- pregnancy context
- trauma context
- clinical history
- comprehensive emergency-sign coverage

These are release-scope gaps and must not be silently inferred from the current four-rule set.

## Required Validation Before Production Release

- every active rule has automated positive coverage
- every emergency rule has emergency-boundary coverage
- unsupported input produces no fabricated assessment
- negated emergency signals do not match in covered forms
- rule IDs and engine version are present in every assessment
- deterministic repeated evaluation is verified
- Health Input -> Risk Engine -> Timeline integration passes
- current HEAD passes the complete CI release gate
- clinical rule-set breadth is independently reviewed before being marked complete

## Safety Boundary

The presentation layer must preserve the distinction between a risk signal and a medical diagnosis. Emergency presentation must direct the user toward appropriate urgent medical care without asserting a diagnosis.
