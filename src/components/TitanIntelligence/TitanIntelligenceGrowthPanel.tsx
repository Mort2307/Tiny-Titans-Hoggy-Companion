import { useEffect, useState } from "react";
import { tinyTitansIntelligenceKernel } from "../../services/tinyTitansIntelligenceKernel";
import { TITAN_INTELLIGENCE_UPDATED_EVENT } from "../../services/tinyTitansEventBus";

function useGrowth() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((value) => value + 1);
    window.addEventListener(TITAN_INTELLIGENCE_UPDATED_EVENT, handler);
    const interval = window.setInterval(() => setTick((value) => value + 1), 5000);
    return () => { window.removeEventListener(TITAN_INTELLIGENCE_UPDATED_EVENT, handler); window.clearInterval(interval); };
  }, []);
  return tinyTitansIntelligenceKernel.getGrowthSnapshot();
}

export default function TitanIntelligenceGrowthPanel({ compact = false }: { compact?: boolean }) {
  const growth = useGrowth();
  return <section className={`tt-intelligence-growth-panel${compact ? " tt-intelligence-growth-panel--compact" : ""}`}>
    <div className="tt-intelligence-growth-head">
      <div><p className="tt-intelligence-kicker">INTELLIGENCE GROWTH</p><h2>Every useful signal helps build the bigger picture.</h2><p className="tt-intelligence-growth-subtitle">Specialist intelligence remains evidence-led; this layer measures how much connected context Tiny Titans currently has available to work with.</p></div>
      <div className="tt-intelligence-growth-index" aria-label={`Intelligence Growth index ${growth.growthIndex}%`}><strong>{growth.growthIndex}%</strong><span>connected context</span></div>
    </div>
    <div className="tt-intelligence-growth-metrics"><div><strong>{growth.eventCount}</strong><span>Signals in this session</span></div><div><strong>{growth.activeDomains.length}</strong><span>Active domains</span></div><div><strong>{growth.correlationOpportunity}%</strong><span>Correlation opportunity</span></div><div><strong>{growth.freshness}%</strong><span>Recent activity</span></div></div>
    {growth.activeDomains.length > 0 && <div className="tt-intelligence-domain-list" aria-label="Active intelligence domains">{growth.activeDomains.map((domain) => <span key={domain}>{domain}</span>)}</div>}
    <div className="tt-intelligence-growth-next"><div><span className="tt-intelligence-kicker">NEXT DATA OPPORTUNITIES</span>{growth.nextActions.map((action) => <p key={action}>• {action}</p>)}</div></div>
    <details className="tt-intelligence-growth-boundary"><summary>What this is — and what it is not</summary><p>{growth.explanation}</p></details>
  </section>;
}
