import type { RiskFactor } from "./types";

export const RISK_ENGINE_VERSION = "1.2.0";

export const riskRules: RiskFactor[] = [
  { id: "symptom.chest-pain", version: "1.1.0", keyword: "chest pain", keywords: ["chest pain", "chest pressure", "chest tightness", "brustschmerz", "brustschmerzen", "brustdruck", "brustenge"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.unconscious", version: "1.1.0", keyword: "unconscious", keywords: ["unconscious", "passed out", "loss of consciousness", "bewusstlos", "bewusstlosigkeit", "ohnmächtig"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.severe-breathing-difficulty", version: "1.0.0", keyword: "severe breathing difficulty", keywords: ["severe breathing difficulty", "severe shortness of breath", "difficulty breathing", "can't breathe", "cannot breathe", "schwere atemnot", "atemnot", "kann nicht atmen"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.stroke-warning", version: "1.0.0", keyword: "sudden weakness", keywords: ["sudden weakness", "sudden numbness", "speech difficulty", "facial droop", "plötzliche schwäche", "plötzliche taubheit", "sprachstörung", "gesichtslähmung"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.severe-bleeding", version: "1.0.0", keyword: "severe bleeding", keywords: ["severe bleeding", "uncontrolled bleeding", "heavy bleeding", "starke blutung", "unstillbare blutung"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.seizure", version: "1.0.0", keyword: "seizure", keywords: ["seizure", "convulsion", "krampfanfall", "krampf"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.anaphylaxis", version: "1.0.0", keyword: "anaphylaxis", keywords: ["anaphylaxis", "anaphylactic reaction", "anaphylaxie", "anaphylaktische reaktion"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.poisoning-overdose", version: "1.0.0", keyword: "overdose", keywords: ["overdose", "poisoning", "drug overdose", "überdosierung", "vergiftung"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.cardiac-arrest", version: "1.0.0", keyword: "cardiac arrest", keywords: ["cardiac arrest", "cardiac arrest suspected", "no pulse", "not breathing", "herzstillstand", "kein puls", "keine atmung", "atmet nicht"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.choking", version: "1.0.0", keyword: "choking", keywords: ["choking", "choked", "airway obstruction", "verschluckt", "erstickungsanfall", "atemwegsverlegung"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.sudden-severe-headache", version: "1.0.0", keyword: "sudden severe headache", keywords: ["sudden severe headache", "worst headache", "thunderclap headache", "plötzlicher starker kopfschmerz", "schlimmster kopfschmerz", "donnerschlagkopfschmerz"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.vomiting-blood", version: "1.0.0", keyword: "vomiting blood", keywords: ["vomiting blood", "blood in vomit", "haematemesis", "hematemesis", "bluterbrechen", "blut im erbrochenen"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.cyanosis", version: "1.0.0", keyword: "blue lips", keywords: ["blue lips", "blue face", "cyanosis", "blaue lippen", "blaues gesicht", "zyanose"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.severe-confusion", version: "1.0.0", keyword: "severe confusion", keywords: ["severe confusion", "sudden confusion", "acute confusion", "akute verwirrtheit", "plötzliche verwirrtheit", "starke verwirrtheit"], weight: 10, level: "emergency", emergency: true },
  { id: "symptom.fever", version: "1.1.0", keyword: "fever", keywords: ["fever", "high temperature", "fieber", "erhöhte temperatur"], weight: 3, level: "warning", emergency: false },
  { id: "symptom.fatigue", version: "1.1.0", keyword: "fatigue", keywords: ["fatigue", "tiredness", "extreme tiredness", "erschöpfung", "müdigkeit"], weight: 1, level: "observation", emergency: false },
  { id: "symptom.dizziness", version: "1.0.0", keyword: "dizziness", keywords: ["dizziness", "lightheaded", "schwindel", "benommenheit"], weight: 2, level: "observation", emergency: false },
  { id: "symptom.palpitations", version: "1.0.0", keyword: "palpitations", keywords: ["palpitations", "racing heart", "heart racing", "herzrasen", "herzklopfen"], weight: 2, level: "observation", emergency: false },
];
