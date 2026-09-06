import { useMemo } from "react";
import type { Snake } from "../../types/Snake";
import { buildTitanEcosystemSnapshot } from "../../intelligence/v50/titanEcosystemEngine";

export default function TitanEcosystemPanel({ snake }: { snake: Snake }) {
  const snapshot = useMemo(() => {
    const enclosure = snake.enclosure;
    return buildTitanEcosystemSnapshot({
      bioactive: Boolean(enclosure?.bioactive),
      plants: enclosure?.plants ?? [],
      cleanupCrew: enclosure?.cleanupCrew ?? [],
      lastCleanedDate: enclosure?.lastCleanedDate,
      observationDates: (enclosure?.environmentHistory ?? []).map((entry) => Date.parse(entry.recordedAt)).filter((value) => Number.isFinite(value)),
    });
  }, [snake.enclosure]);

  if (!snake.enclosure) return <section className="titan-feature-panel"><div className="titan-feature-empty"><strong>No enclosure ecosystem is attached.</strong><p>Tiny Titans needs a real enclosure record before it can describe the ecosystem.</p></div></section>;

  return <section className="titan-feature-panel">
    <p className="titan-feature-kicker">🌱 BIOACTIVE ECOSYSTEM</p>
    <h2>{snake.name}'s living enclosure context</h2>
    <div className="titan-feature-data-grid"><article><strong>{snapshot.coverageScore}%</strong><span>Ecosystem context</span></article><article><strong>{snapshot.plantCount}</strong><span>Plants recorded</span></article><article><strong>{snapshot.cleanupCrewCount}</strong><span>Cleanup organisms</span></article><article><strong>{snapshot.mode}</strong><span>Enclosure mode</span></article></div>
    {snapshot.plants.length>0&&<div className="titan-feature-results">{snapshot.plants.map((plant)=><article key={plant.name}><span>{plant.status}</span><h3>{plant.name}</h3><p>{plant.note}</p></article>)}</div>}
    {snapshot.findings.length>0&&<div className="titan-feature-results">{snapshot.findings.map((finding)=><article key={finding.id}><strong>{finding.title}</strong><p>{finding.detail}</p><small>{finding.severity} · {Math.round(finding.confidence*100)}% confidence</small></article>)}</div>}
    <div className="titan-feature-note">{snapshot.note}</div>
  </section>;
}
