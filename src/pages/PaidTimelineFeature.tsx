import { Link } from "react-router-dom";
import PaidTierGate from "../components/PaidTierGate";
import "../styles/PaidFeatureWorkspace.css";

export default function PaidTimelineFeature() {
  return <PaidTierGate entitlement="advanced_timeline"><section className="paid-workspace-page"><header className="paid-feature-header"><div className="paid-feature-heading"><span className="paid-feature-icon-large" aria-hidden="true">🗓️</span><div><span className="paid-workspace-kicker">Titan Pro · Business</span><h1>Advanced Timeline</h1><p>Connect the records you already keep into a clearer chronological view, while preserving the individual animal timeline as the source of truth.</p></div></div><Link className="paid-back-link" to="/paid">← Paid Feature Centre</Link></header><div className="paid-feature-content"><div className="paid-info-panel" style={{ marginTop: 0 }}><h2>Open an animal timeline</h2><p>Choose a reptile from your collection, then open their timeline. The paid access check is applied before the timeline is displayed.</p><Link to="/snakes">Open My Snakes →</Link></div><div className="paid-info-panel"><h2>What Advanced Timeline is for</h2><p>Feeding, shedding, weight, health, behaviour and other keeper records can be understood as one history. The system should remain record-led rather than inventing events between entries.</p></div></div></section></PaidTierGate>;
}
