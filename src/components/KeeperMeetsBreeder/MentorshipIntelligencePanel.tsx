import { useMemo, useState } from "react";
import { buildMentorshipReadiness, getAdaptiveMentorshipMessage, type MentorshipInsightInput } from "../../services/mentorshipInsights";

type EvidenceKey = "hasWeightRecords" | "hasFeedingRecords" | "hasShedRecords" | "hasGeneticsRecords" | "hasEnclosureData";
type Props = { goal: MentorshipInsightInput["goal"]; evidence?: Partial<MentorshipInsightInput>; loading?: boolean; sourceLabel?: string; onNextStep?: () => void };
const evidenceOptions: { key: EvidenceKey; label: string }[] = [
  { key: "hasWeightRecords", label: "Weight records" }, { key: "hasFeedingRecords", label: "Feeding records" }, { key: "hasShedRecords", label: "Shed records" }, { key: "hasGeneticsRecords", label: "Genetics records" }, { key: "hasEnclosureData", label: "Enclosure information" },
];

export default function MentorshipIntelligencePanel({ goal, evidence: liveEvidence, loading = false, sourceLabel = "Live TTHC tracker evidence", onNextStep }: Props) {
  const [manualEvidence, setManualEvidence] = useState<Record<EvidenceKey, boolean>>({ hasWeightRecords: false, hasFeedingRecords: false, hasShedRecords: false, hasGeneticsRecords: false, hasEnclosureData: false });
  const usingLiveEvidence = Boolean(liveEvidence);
  const evidence = usingLiveEvidence ? { ...manualEvidence, ...liveEvidence } : manualEvidence;
  const readinessInput: MentorshipInsightInput = { goal, ...evidence, learningCompleted: liveEvidence?.learningCompleted, learningTotal: liveEvidence?.learningTotal, experienceMonths: liveEvidence?.experienceMonths };
  const readiness = useMemo(() => buildMentorshipReadiness(readinessInput), [readinessInput]);
  const message = getAdaptiveMentorshipMessage(goal, readiness);
  const toggle = (key: EvidenceKey) => setManualEvidence((current) => ({ ...current, [key]: !current[key] }));
  return <section className="kmb-intelligence-card kmb-adaptive"><div className="kmb-intelligence-icon">🧭</div><div className="kmb-adaptive-content"><div className="kmb-section-heading"><div><span className="kmb-label">ADAPTIVE TTHC INTELLIGENCE</span><h2>Your pathway readiness</h2><p>{usingLiveEvidence ? `${sourceLabel}. TTHC is evaluating your existing tracker data rather than asking you to duplicate it.` : "Self-assessment mode. Connect live tracker evidence to remove manual inputs."}</p></div><strong className="kmb-match">{loading ? "…" : `${readiness.score}% evidence`}</strong></div>{!usingLiveEvidence && <div className="kmb-evidence-picker"><span className="kmb-label">WHAT DO YOU ALREADY HAVE?</span><div>{evidenceOptions.map((item) => <label key={item.key} className={`kmb-record ${manualEvidence[item.key] ? "selected" : ""}`}><input type="checkbox" checked={manualEvidence[item.key]} onChange={() => toggle(item.key)} /><span>{item.label}</span></label>)}</div></div>}{loading ? <p>Analysing your current TTHC records…</p> : <><p>{message}</p><div className="kmb-readiness-grid">{readiness.signals.map((signal) => <div className={`kmb-readiness-item ${signal.value}`} key={signal.label}><strong>{signal.value === "strong" ? "✓" : "○"} {signal.label}</strong><small>{signal.explanation}</small></div>)}</div><div className="kmb-next-step"><div><span className="kmb-label">RECOMMENDED NEXT STEP</span><strong>{readiness.nextStep}</strong></div>{onNextStep ? <button type="button" className="kmb-secondary" onClick={onNextStep}>Work on this</button> : null}</div></>}</div></section>;
}
