import { useMemo, useState } from "react";
import { buildMentorshipReadiness, getAdaptiveMentorshipMessage, type MentorshipInsightInput } from "../../services/mentorshipInsights";

type Props = { goal: MentorshipInsightInput["goal"]; onNextStep?: () => void };
type EvidenceKey = "hasWeightRecords" | "hasFeedingRecords" | "hasShedRecords" | "hasGeneticsRecords" | "hasEnclosureData";
const evidenceOptions: { key: EvidenceKey; label: string }[] = [
  { key: "hasWeightRecords", label: "Weight records" }, { key: "hasFeedingRecords", label: "Feeding records" }, { key: "hasShedRecords", label: "Shed records" }, { key: "hasGeneticsRecords", label: "Genetics records" }, { key: "hasEnclosureData", label: "Enclosure information" },
];

export default function MentorshipIntelligencePanel({ goal, onNextStep }: Props) {
  const [evidence, setEvidence] = useState<Record<EvidenceKey, boolean>>({ hasWeightRecords: false, hasFeedingRecords: false, hasShedRecords: false, hasGeneticsRecords: false, hasEnclosureData: false });
  const readinessInput: MentorshipInsightInput = { goal, ...evidence };
  const readiness = useMemo(() => buildMentorshipReadiness(readinessInput), [goal, evidence]);
  const message = getAdaptiveMentorshipMessage(goal, readiness);
  const toggle = (key: EvidenceKey) => setEvidence((current) => ({ ...current, [key]: !current[key] }));
  return <section className="kmb-intelligence-card kmb-adaptive"><div className="kmb-intelligence-icon">🧭</div><div className="kmb-adaptive-content"><div className="kmb-section-heading"><div><span className="kmb-label">ADAPTIVE TTHC INTELLIGENCE</span><h2>Your pathway readiness</h2><p>Quick self-assessment. As tracker integration is enabled, TTHC can replace these switches with your actual records automatically.</p></div><strong className="kmb-match">{readiness.score}% evidence</strong></div><div className="kmb-evidence-picker"><span className="kmb-label">WHAT DO YOU ALREADY HAVE?</span><div>{evidenceOptions.map((item) => <label key={item.key} className={`kmb-record ${evidence[item.key] ? "selected" : ""}`}><input type="checkbox" checked={evidence[item.key]} onChange={() => toggle(item.key)} /><span>{item.label}</span></label>)}</div></div><p>{message}</p><div className="kmb-readiness-grid">{readiness.signals.map((signal) => <div className={`kmb-readiness-item ${signal.value}`} key={signal.label}><strong>{signal.value === "strong" ? "✓" : "○"} {signal.label}</strong><small>{signal.explanation}</small></div>)}</div><div className="kmb-next-step"><div><span className="kmb-label">RECOMMENDED NEXT STEP</span><strong>{readiness.nextStep}</strong></div>{onNextStep ? <button type="button" className="kmb-secondary" onClick={onNextStep}>Work on this</button> : null}</div></div></section>;
}
