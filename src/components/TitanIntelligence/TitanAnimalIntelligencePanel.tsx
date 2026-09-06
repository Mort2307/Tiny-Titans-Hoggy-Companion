import { Link } from "react-router-dom";
import type { SnakeMasterRecord } from "../../services/snakeMasterRecord";
import { buildAutomaticKeeperJournal, buildAnnualTitanTimeCapsule, buildSnakePassport } from "../../intelligence/v50/animalRecordsIntelligence";
import { useAuth } from "../../context/useAuth";
import { getTitanDecisionState, type TitanDecision } from "../../services/titanDecisionStateService";
import { subscribeToTitanIntelligenceUpdates } from "../../services/titanReactiveIntelligenceService";
import { useEffect, useState } from "react";
import TitanDecisionWhyCard from "./TitanDecisionWhyCard";
import TitanDecisionQueue from "./TitanDecisionQueue";

interface Props { record: SnakeMasterRecord }

export default function TitanAnimalIntelligencePanel({ record }: Props) {
  const { user } = useAuth();
  const { snake, overview, timeline } = record;
  const [decision, setDecision] = useState<TitanDecision | null>(null);
  const recordEvents = timeline.map((event) => ({ id: event.id, type: event.type, date: event.date, title: event.title, detail: event.description }));
  const passport = buildSnakePassport(recordEvents);
  const journal = buildAutomaticKeeperJournal(recordEvents);
  const capsule = buildAnnualTitanTimeCapsule(recordEvents, new Date().getFullYear());
  const first = timeline.at(-1);
  const latest = timeline[0];

  useEffect(() => {
    if (!user || !snake.id) { setDecision(null); return () => undefined; }
    const refresh = () => setDecision(getTitanDecisionState(user.uid).decisions.find(item => item.status === "active" && item.animalId === snake.id) ?? null);
    refresh();
    return subscribeToTitanIntelligenceUpdates(refresh);
  }, [user, snake.id]);

  return <section className="master-card titan-animal-intelligence">
    <div className="master-section-heading"><div><p className="master-eyebrow">🧠 V50 Animal Intelligence</p><h2>{snake.name}'s living context</h2></div><Link to={`/titan-intelligence?snakeId=${encodeURIComponent(snake.id)}`}>Open full Titan Intelligence →</Link></div>
    {decision && <TitanDecisionWhyCard decision={decision} compact />}
    {decision && <TitanDecisionQueue animalId={snake.id} excludeDecisionId={decision.id} limit={3} />}
    <div className="master-grid">
      <article className="master-card"><span>📈 Growth history</span><strong>{overview.currentWeightG === null ? "More data needed" : `${overview.currentWeightG} g current`}</strong><small>{overview.totalWeightLogs} weight records • {overview.weightChangeG === null ? "No recorded baseline change" : `${overview.weightChangeG >= 0 ? "+" : ""}${overview.weightChangeG} g recorded change`}</small></article>
      <article className="master-card"><span>↔️ Then vs now</span><strong>{first && latest ? "Comparison available" : "More data needed"}</strong><small>{first && latest ? `${first.title} → ${latest.title}` : "At least two dated events are required; no causation is inferred."}</small></article>
      <article className="master-card"><span>🪪 Snake passport</span><strong>{passport.eventCount} events</strong><small>{passport.coveredRecordTypes.join(" • ") || "No dated record types yet"}</small></article>
      <article className="master-card"><span>📓 Keeper journal</span><strong>{journal.length} entries</strong><small>Assembled only from dated keeper records.</small></article>
      <article className="master-card"><span>📦 {new Date().getFullYear()} time capsule</span><strong>{capsule.eventCount} events</strong><small>{capsule.summary}</small></article>
      <article className="master-card"><span>📡 Intelligence confidence</span><strong>{overview.confidence.overall}</strong><small>Confidence reflects recorded history depth, not health or welfare status.</small></article>
    </div>
  </section>;
}
