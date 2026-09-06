import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getUserSnakes } from "../../services/snakeService";
import { hasFullIntelligenceAccess } from "../../services/intelligenceAccessService";
import { getCachedTitanV50 } from "../../intelligence/v50/titanIntelligenceCache";
import type { TitanV50UnifiedResult } from "../../intelligence/v50/titanV50UnifiedRuntime";

export default function TitanLiveIntelligencePanel() {
  const { user } = useAuth();
  const [result, setResult] = useState<TitanV50UnifiedResult | null>(null);
  const [access, setAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([hasFullIntelligenceAccess(user.uid), getUserSnakes(user.uid)])
      .then(([hasAccess, snakes]) => {
        if (!active) return;
        setAccess(hasAccess);
        const counts = {
          snakes: snakes.length,
          weights: snakes.reduce((total, snake) => total + (snake.weightHistory?.length ?? 0), 0),
          feedings: snakes.reduce((total, snake) => total + (snake.feedingHistory?.length ?? 0), 0),
          sheds: snakes.reduce((total, snake) => total + (snake.shedHistory?.length ?? 0), 0),
          health: snakes.reduce((total, snake) => total + (snake.healthHistory?.length ?? 0), 0),
          behaviour: snakes.reduce((total, snake) => total + (snake.behaviourHistory?.length ?? 0), 0),
          husbandry: snakes.reduce((total, snake) => total + (snake.husbandryHistory?.length ?? 0), 0),
          breeding: 0,
        };
        if (!hasAccess) {
          setResult(null);
          return;
        }
        const structural = snakes as Array<Record<string, unknown>>;
        const hasGeneticRecords = structural.some((snake) => Boolean(snake.genetics || snake.morphs || snake.morph || snake.hets));
        const hasBreedingProjects = structural.some((snake) => Boolean(snake.breedingProjectId || snake.breedingProjectIds));
        const hasEnclosures = structural.some((snake) => Boolean(snake.enclosureId || snake.enclosure || snake.vivariumId));
        const hasBehaviourRecords = counts.behaviour > 0;
        setResult(getCachedTitanV50({
          counts,
          hasGeneticRecords,
          hasBreedingProjects,
          hasEnclosures,
          hasBehaviourRecords,
          hasLearningActivity: false,
          hasCommunityActivity: false,
        }));
      })
      .catch((loadError) => {
        if (!active) return;
        setResult(null);
        setError(loadError instanceof Error ? loadError.message : "Intelligence could not be calculated.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  const summary = useMemo(() => {
    if (!result) return [];
    return result.recommendations.slice(0, 5);
  }, [result]);

  if (!user || loading) return <section className="titan-live-panel"><div className="titan-live-panel__loading">🧠 Reading your keeper context…</div></section>;
  if (error) return <section className="titan-live-panel"><div className="titan-live-panel__error">{error}</div></section>;
  if (!access) {
    return <section className="titan-live-panel"><div><p className="titan-eyebrow">LIVE KEEPER CONTEXT</p><h2>Your records are ready. Intelligence is opt-in.</h2><p>The ordinary tracker remains available. Enable the optional Intelligence contribution/access setting before Tiny Titans generates the deeper cross-domain context shown here.</p></div><Link className="titan-live-panel__action" to="/account/data-privacy">Review privacy & Intelligence settings →</Link></section>;
  }
  if (!result) return null;

  const ready = result.capabilities.filter((capability) => capability.state === "ready").length;
  const dataNeeded = result.capabilities.length - ready;

  return (
    <section className="titan-live-panel">
      <div className="titan-live-panel__header">
        <div><p className="titan-eyebrow">LIVE KEEPER CONTEXT</p><h2>Tiny Titans is actively reading the collection.</h2><p>{ready} capabilities currently have enough context to operate; {dataNeeded} are waiting for more explicit records.</p></div>
        <div className="titan-live-panel__metrics"><strong>{result.capabilities.length}</strong><span>capabilities evaluated</span><strong>{result.recommendations.length}</strong><span>current recommendations</span></div>
      </div>
      {result.signals.length > 0 && <div className="titan-live-panel__signals">{result.signals.slice(0, 4).map((signal) => <article key={signal.id}><b>{signal.title}</b><span>{signal.message}</span><small>{signal.severity} · {Math.round(signal.confidence * 100)}% confidence</small></article>)}</div>}
      {summary.length > 0 ? <div className="titan-live-panel__recommendations">{summary.map((recommendation) => <article key={recommendation.id}><span>⚡</span><div><strong>{recommendation.title}</strong><p>{recommendation.reason}</p><small>{Math.round(recommendation.confidence * 100)}% confidence</small></div><Link to={recommendation.destination}>Open →</Link></article>)}</div> : <div className="titan-live-panel__good"><strong>🟢 Nothing new is demanding attention.</strong><p>Tiny Titans has evaluated the current context and has no stronger supported next action to surface.</p></div>}
    </section>
  );
}
