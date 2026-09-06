import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getUserSnakes } from "../../services/snakeService";
import { getTitanMicroclimateReadings } from "../../services/titanMicroclimateService";
import { hasFullIntelligenceAccess } from "../../services/intelligenceAccessService";
import { runTitanV50Unified, type TitanV50UnifiedResult } from "../../intelligence/v50/titanV50UnifiedRuntime";
import type { HusbandryObservation } from "../../intelligence/v50/husbandryIntelligenceEngine";
import { explainWhyRecommendation } from "../../intelligence/v50/titanExplainability";
import { getRecentTitanIntelligenceEvents, subscribeToTitanIntelligenceUpdates, type TitanReactiveEvent } from "../../services/titanReactiveIntelligenceService";
import TitanExplainabilityCard from "./TitanExplainabilityCard";
import "./TitanLiveIntelligencePanel.css";

type RawRecord = Record<string, unknown>;
type LiveAnimalResult = { snakeId: string; name: string; result: TitanV50UnifiedResult };
function records(value: unknown): RawRecord[] { return Array.isArray(value) ? value.filter((item): item is RawRecord => Boolean(item) && typeof item === "object") : []; }
function recordDate(record: RawRecord): number | string | undefined { const value = record.date ?? record.recordedAt ?? record.timestamp ?? record.createdAt ?? record.loggedAt; return typeof value === "number" || typeof value === "string" ? value : undefined; }
function observationList(value: unknown, fallbackLabel: string) { return records(value).map((record) => ({ date: recordDate(record), category: typeof record.category === "string" ? record.category : undefined, label: typeof record.label === "string" ? record.label : fallbackLabel, detail: typeof record.detail === "string" ? record.detail : undefined })); }
function animalInput(snake: RawRecord) {
  const weights = records(snake.weightHistory).map((record) => ({ date: recordDate(record), grams: Number(record.grams ?? record.weight ?? record.value) })).filter((point) => Number.isFinite(point.grams) && point.grams > 0 && point.date != null);
  return { name: typeof snake.name === "string" ? snake.name : "Unnamed Titan", birthDate: typeof snake.birthDate === "string" || typeof snake.birthDate === "number" ? snake.birthDate : undefined, weights, feedings: observationList(snake.feedingHistory, "Feeding recorded"), sheds: observationList(snake.shedHistory, "Shed recorded"), behaviour: observationList(snake.behaviourHistory, "Behaviour observed"), health: observationList(snake.healthHistory, "Health record") };
}
function husbandryInput(snake: RawRecord, microclimate: Awaited<ReturnType<typeof getTitanMicroclimateReadings>>, reactiveEvents: TitanReactiveEvent[]) {
  const observations: HusbandryObservation[] = records(snake.husbandryHistory).map((record) => { const date = recordDate(record); const temperatureC = Number(record.temperatureC ?? record.temperature ?? record.tempC); const humidityPercent = Number(record.humidityPercent ?? record.humidity ?? record.humidityPercentage); const hasTemperature = Number.isFinite(temperatureC); const hasHumidity = Number.isFinite(humidityPercent); if (date == null || (!hasTemperature && !hasHumidity)) return null; return { date, ...(hasTemperature ? { temperatureC } : {}), ...(hasHumidity ? { humidityPercent } : {}), enclosureId: typeof record.enclosureId === "string" ? record.enclosureId : undefined, source: record.source === "sensor" ? "sensor" : "keeper" } satisfies HusbandryObservation; }).filter((item): item is HusbandryObservation => item !== null);
  const twinReadings = microclimate.map((reading) => ({ id: reading.id, timestamp: reading.recordedAt, zone: "ambient" as const, temperatureC: reading.temperatureC, humidityPct: reading.humidityPercent, source: reading.source === "sensor" ? "sensor" as const : "manual" as const }));
  const eventEnclosureChanges = reactiveEvents.filter((event) => event.animalId === String(snake.id ?? snake.snakeId) && event.type === "EnclosureChanged").map((event) => ({ kind: "enclosure" as const, occurredAt: event.createdAt, enclosureId: event.enclosureId, detail: `Enclosure change recorded at ${new Date(event.createdAt).toLocaleString()}.` }));
  return { hasEnclosure: Boolean(snake.enclosureId || snake.enclosure || snake.vivariumId), observations, twinComponents: [], twinReadings, plants: [], enclosureChanges: eventEnclosureChanges };
}
async function buildLiveResult(uid: string, snake: RawRecord, reactiveEvents: TitanReactiveEvent[]): Promise<LiveAnimalResult> {
  const snakeId = typeof snake.id === "string" ? snake.id : typeof snake.snakeId === "string" ? snake.snakeId : crypto.randomUUID();
  const microclimate = await getTitanMicroclimateReadings(uid, snakeId).catch(() => []);
  const result = runTitanV50Unified({ counts: { snakes: 1, weights: records(snake.weightHistory).length, feedings: records(snake.feedingHistory).length, sheds: records(snake.shedHistory).length, health: records(snake.healthHistory).length, behaviour: records(snake.behaviourHistory).length, husbandry: records(snake.husbandryHistory).length + microclimate.length, breeding: 0 }, hasGeneticRecords: Boolean(snake.genetics || snake.morphs || snake.morph || snake.hets), hasBreedingProjects: Boolean(snake.breedingProjectId || snake.breedingProjectIds), hasEnclosures: Boolean(snake.enclosureId || snake.enclosure || snake.vivariumId), hasBehaviourRecords: records(snake.behaviourHistory).length > 0, hasLearningActivity: false, hasCommunityActivity: false, context: { animal: animalInput(snake), husbandry: husbandryInput(snake, microclimate, reactiveEvents) } });
  return { snakeId, name: typeof snake.name === "string" ? snake.name : "Unnamed Titan", result };
}

export default function TitanLiveIntelligencePanel() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<LiveAnimalResult[]>([]);
  const [access, setAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { setAnimals([]); setAccess(false); setLoading(false); return () => undefined; }
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const [hasAccess, snakes] = await Promise.all([hasFullIntelligenceAccess(user.uid), getUserSnakes(user.uid)]);
        if (!active) return;
        setAccess(hasAccess);
        if (!hasAccess) { setAnimals([]); return; }
        const reactiveEvents = getRecentTitanIntelligenceEvents(user.uid, 30);
        const results = await Promise.all(snakes.map((snake) => buildLiveResult(user.uid, snake as unknown as RawRecord, reactiveEvents).catch(() => null)));
        if (!active) return;
        setAnimals(results.filter((result): result is LiveAnimalResult => Boolean(result)));
      } catch (loadError) {
        if (!active) return;
        setAnimals([]); setError(loadError instanceof Error ? loadError.message : "Intelligence could not be calculated.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    const unsubscribe = subscribeToTitanIntelligenceUpdates(() => { void load(); });
    return () => { active = false; unsubscribe(); };
  }, [user]);

  const aggregate = useMemo(() => {
    const capabilitiesReady = animals.reduce((total, animal) => total + animal.result.capabilities.filter((capability) => capability.state === "ready").length, 0);
    const capabilitiesEvaluated = animals.reduce((total, animal) => total + animal.result.capabilities.length, 0);
    const recommendations = animals.flatMap((animal) => animal.result.recommendations.map((recommendation) => ({ ...recommendation, animalName: animal.name, animalId: animal.snakeId, vivariumPriority: animal.result.contextSnapshot.husbandry.vivarium.proactivePriority })));
    const dedupedRecommendations = recommendations.sort((a, b) => (b.priority + b.vivariumPriority * 0.15) - (a.priority + a.vivariumPriority * 0.15)).filter((item, index, all) => index === all.findIndex((candidate) => candidate.id === item.id && candidate.animalId === item.animalId)).slice(0, 10);
    const signals = animals.flatMap((animal) => animal.result.signals.slice(0, 8).map((signal) => ({ ...signal, animalName: animal.name, animalId: animal.snakeId })));
    return { capabilitiesReady, capabilitiesEvaluated, recommendations: dedupedRecommendations, signals: signals.slice(0, 14) };
  }, [animals]);
  const firstRecommendation = aggregate.recommendations[0];
  const explanation = firstRecommendation ? explainWhyRecommendation(firstRecommendation, firstRecommendation.evidence) : null;
  if (!user || loading) return <section className="titan-live-panel"><div className="titan-live-panel__loading">🧠 Reading every Titan's keeper context…</div></section>;
  if (error) return <section className="titan-live-panel"><div className="titan-live-panel__error">{error}</div></section>;
  if (!access) return <section className="titan-live-panel"><div><p className="titan-eyebrow">LIVE KEEPER CONTEXT</p><h2>Your records are ready. Intelligence is opt-in.</h2><p>The ordinary tracker remains available. Enable the optional Intelligence contribution/access setting before Tiny Titans generates the deeper cross-domain context shown here.</p></div><Link className="titan-live-panel__action" to="/account/data-privacy">Review privacy & Intelligence settings →</Link></section>;
  const readiness = aggregate.capabilitiesEvaluated ? Math.round((aggregate.capabilitiesReady / aggregate.capabilitiesEvaluated) * 100) : 0;
  return <section className="titan-live-panel"><div className="titan-live-panel__header"><div><p className="titan-eyebrow">LIVE KEEPER CONTEXT</p><h2>Tiny Titans is actively reading your actual records.</h2><p>{animals.length} Titan{animals.length === 1 ? "" : "s"} evaluated individually. {readiness}% of evaluated capability checks currently have enough explicit context to operate.</p></div><div className="titan-live-panel__metrics"><strong>{animals.length}</strong><span>Titans evaluated</span><strong>{aggregate.recommendations.length}</strong><span>ranked next actions</span></div></div>{aggregate.signals.length > 0 && <div className="titan-live-panel__signals">{aggregate.signals.map((signal) => <article key={`${signal.animalId}-${signal.id}`}><b>{signal.title}</b><span>{signal.animalName} · {signal.message}</span><small>{signal.severity} · {Math.round(signal.confidence * 100)}% confidence</small></article>)}</div>}{aggregate.recommendations.length > 0 ? <div className="titan-live-panel__recommendations">{aggregate.recommendations.map((recommendation) => <article key={`${recommendation.animalId}-${recommendation.id}`}><span>⚡</span><div><strong>{recommendation.title}</strong><p>{recommendation.animalName} · {recommendation.reason}</p><small>{Math.round(recommendation.confidence * 100)}% confidence</small></div><Link to={recommendation.destination}>Open →</Link></article>)}</div> : <div className="titan-live-panel__good"><strong>🟢 Nothing new is demanding attention.</strong><p>Tiny Titans evaluated the individual Titan records and found no stronger supported next action to surface right now.</p></div>}{explanation && <div className="titan-live-panel__explain"><p>{explanation.title}</p><small>{explanation.explanation}</small><TitanExplainabilityCard recommendation={firstRecommendation} evidence={firstRecommendation.evidence} /></div>}</section>;
}
