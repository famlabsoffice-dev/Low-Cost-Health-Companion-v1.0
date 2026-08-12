import type { RiskAssessment, RiskPresentation } from "./types";

const DISCLAIMER = "This is a risk signal, not a diagnosis.";

export function presentRiskAssessment(assessment: RiskAssessment): RiskPresentation {
  switch (assessment.level) {
    case "emergency":
      return {
        level: "emergency",
        title: "Potential emergency risk",
        message: "The recorded health information contains a signal that may require urgent medical attention.",
        action: "Seek immediate medical care or emergency assistance.",
        reasons: assessment.reasons,
        disclaimer: DISCLAIMER,
      };
    case "warning":
      return {
        level: "warning",
        title: "Health signal needs attention",
        message: "The recorded information contains factors associated with elevated risk.",
        action: "Consider contacting a healthcare professional, especially if symptoms persist or worsen.",
        reasons: assessment.reasons,
        disclaimer: DISCLAIMER,
      };
    case "observation":
      return {
        level: "observation",
        title: "Health signal to monitor",
        message: "The recorded information contains a lower-level risk signal.",
        action: "Monitor the situation and record relevant changes.",
        reasons: assessment.reasons,
        disclaimer: DISCLAIMER,
      };
    default:
      return {
        level: "info",
        title: "No elevated risk signal detected",
        message: "The available information does not currently trigger an elevated risk rule.",
        action: "Continue normal monitoring and record meaningful changes.",
        reasons: assessment.reasons,
        disclaimer: DISCLAIMER,
      };
  }
}
