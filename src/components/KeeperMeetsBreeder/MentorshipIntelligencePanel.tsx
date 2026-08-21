import { useMemo } from "react";
import { buildMentorshipReadiness, getAdaptiveMentorshipMessage, type MentorshipInsightInput } from "../../services/mentorshipInsights";

type Props = MentorshipInsightInput & { onNextStep?: () => void };

export default function MentorshipIntelligencePanel(props: Props) {
  const readiness = useMemo(() => buildMentorshipReadiness(props), [props]);
  const message = getAdaptiveMentorshipMessage(props.goal, readiness);
  return <section className="kmb-intelligence-card kmb-adaptive"><div className="kmb-intelligence-icon">🧭</div><div className="kmb-adaptive-content"><div className="kmb-section-heading"><div><span className="kmb-label">ADAPTIVE TTHC INTELLIGENCE</span><h2>Your pathway readiness</h2></div><strong className="kmb-match">{readiness.score}% evidence</strong></div><p>{message}</p><div className="kmb-readiness-grid">{readiness.signals.map((signal) => <div className={`kmb-readiness-item ${signal.value}`} key={signal.label}><strong>{signal.value === "strong" ? "✓" : "○"} {signal.label}</strong><small>{signal.explanation}</small></div>)}</div><div className="kmb-next-step"><div><span className="kmb-label">RECOMMENDED NEXT STEP</span><strong>{readiness.nextStep}</strong></div>{props.onNextStep ? <button type="button" className="kmb-secondary" onClick={props.onNextStep}>Work on this</button> : null}</div></div></section>;
}
