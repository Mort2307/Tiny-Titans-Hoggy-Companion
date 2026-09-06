import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TITAN_V50_FEATURES, type V50Feature } from "../intelligence/v50/titanV50FeatureMatrix";
import { FEATURE_SUMMARIES } from "../intelligence/v50/titanV50Runtime";
import { buildAnimalTimeline, buildBehaviourProfile, getGrowthInsight } from "../intelligence/v50/animalIntelligenceEngine";
import { buildAutomaticKeeperJournal, buildAnnualTitanTimeCapsule, buildEmergencyBoundary, buildEscapeRecoveryChecklist, buildSnakePassport } from "../intelligence/v50/animalRecordsIntelligence";
import { buildMissingDataFindings } from "../intelligence/v50/husbandryIntelligenceEngine";
import TitanMicroclimateTool from "../components/TitanIntelligence/TitanMicroclimateTool";
import TitanGeneticsWorkspace from "../components/TitanIntelligence/TitanGeneticsWorkspace";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import "./TitanFeatureExperience.css";

const icons: Record<number, string> = {
  1:"🕵️",2:"📷",3:"🐉",4:"🌳",5:"⏳",6:"🧠",7:"📈",8:"↔️",9:"🧠",10:"🌍",11:"🧬",12:"🛋️",13:"🪪",14:"🩺",15:"🔎",16:"🧪",17:"🔥",18:"⚠️",19:"🌡️",20:"🏠",21:"🌱",22:"🪴",23:"📚",24:"⚖️",25:"🥚",26:"🕵️",27:"📊",28:"🚪",29:"🚨",30:"🔔",31:"🏗️",32:"⚙️",33:"🐣",34:"📐",35:"🏅",36:"⚖️",37:"🧬",38:"📦",39:"📓",40:"🎓",41:"🏆",42:"🌍",43:"🕸️",44:"❓",45:"📡",46:"🧬",47:"🌎",48:"🔬",49:"⚡",50:"🤯",
};

const geneticsFeatures = new Set([1, 2, 3, 4, 5, 11, 16, 23, 24, 25, 34, 36, 37, 43, 46, 48]);
const animalFeatures = new Set([6, 7, 8, 9, 13, 14, 15, 26, 27, 28, 29, 38, 39]);
const husbandryFeatures = new Set([18, 19, 20, 21, 22, 30, 31, 32]);

function featureById(id: string | undefined): V50Feature | undefined { const numeric = Number(id); return Number.isInteger(numeric) ? TITAN_V50_FEATURES.find((feature) => feature.id === numeric) : undefined; }

function snakeRecords(snake: Snake) {
  const structural = snake as Snake & Record<string, unknown>;
  return {
    weights: (snake.weightHistory ?? []).map((point) => ({ date: (point as Record<string, unknown>).date ?? (point as Record<string, unknown>).recordedAt ?? "", grams: Number((point as Record<string, unknown>).weight ?? (point as Record<string, unknown>).grams ?? 0) })).filter((point) => point.grams > 0),
    feedings: (snake.feedingHistory ?? []).map((item) => ({ date: (item as Record<string, unknown>).date ?? (item as Record<string, unknown>).fedAt ?? "", label: String((item as Record<string, unknown>).food ?? (item as Record<string, unknown>).type ?? "Feeding recorded") })),
    sheds: (snake.shedHistory ?? []).map((item) => ({ date: (item as Record<string, unknown>).date ?? (item as Record<string, unknown>).shedDate ?? "", label: String((item as Record<string, unknown>).status ?? "Shed recorded") })),
    behaviour: ((structural.behaviourHistory as unknown[]) ?? []).map((item) => ({ date: String((item as Record<string, unknown>).date ?? ""), category: String((item as Record<string, unknown>).category ?? ""), label: String((item as Record<string, unknown>).label ?? (item as Record<string, unknown>).behaviour ?? "") })),
    health: (snake.healthHistory ?? []).map((item) => ({ date: String((item as Record<string, unknown>).date ?? ""), label: String((item as Record<string, unknown>).title ?? "Health record") })),
  };
}

export default function TitanFeatureExperience() {
  const { featureId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const feature = featureById(featureId);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getUserSnakes(user.uid).then((records) => { if (!active) return; setSnakes(records); setSelectedSnakeId((current) => current || records[0]?.id || ""); }).catch(() => { if (active) setSnakes([]); });
    return () => { active = false; };
  }, [user]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const records = useMemo(() => selectedSnake ? snakeRecords(selectedSnake) : null, [selectedSnake]);
  const growth = useMemo(() => records ? getGrowthInsight(records.weights) : null, [records]);
  const timeline = useMemo(() => records && selectedSnake ? buildAnimalTimeline({ name: selectedSnake.name, weights: records.weights, feedings: records.feedings, sheds: records.sheds, behaviour: records.behaviour, health: records.health }) : [], [records, selectedSnake]);
  const behaviour = useMemo(() => records ? buildBehaviourProfile(records.behaviour) : null, [records]);

  if (!feature) return <main className="page-container titan-feature-page"><button type="button" onClick={() => navigate(-1)}>← Back</button><h1>V50 feature not found</h1><p>The requested capability ID is not present in the canonical V50 matrix.</p><Link to="/titan-intelligence">Open Titan Intelligence →</Link></main>;

  const id = feature.id;
  const geneticsTool = geneticsFeatures.has(id);
  const animalTool = animalFeatures.has(id);
  const husbandryTool = husbandryFeatures.has(id);
  const needsSnake = animalTool || husbandryTool;
  const title = `${icons[id] ?? "🧠"} ${feature.name}`;
  const recordEvents = timeline.map((event, index) => ({ id: `${index}`, type: event.type, date: event.date, title: event.label }));

  return <main className="page-container titan-feature-page">
    <button type="button" className="titan-feature-back" onClick={() => navigate(-1)}>← Back to Titan Intelligence</button>
    <header className="titan-feature-hero"><div><span className="titan-feature-id">V50 · #{id}</span><h1>{title}</h1><p>{FEATURE_SUMMARIES[id] ?? "Connected intelligence capability."}</p></div><div className={`titan-feature-status titan-feature-status--${feature.status}`}><strong>{feature.status}</strong><span>canonical capability state</span></div></header>

    {geneticsTool && <TitanGeneticsWorkspace featureId={id} />}

    {needsSnake && <section className="titan-feature-panel"><p className="titan-feature-kicker">🐍 ANIMAL CONTEXT</p><h2>Choose the Tiny Titan this capability should inspect</h2>{snakes.length === 0 ? <><p>No animal records are available yet, so Tiny Titans will not fabricate a context.</p><Link to="/snakes/new">Add a Tiny Titan →</Link></> : <><select value={selectedSnakeId} onChange={(event) => setSelectedSnakeId(event.target.value)} aria-label="Select Tiny Titan">{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select>{animalTool && records && <div className="titan-feature-data-grid"><article><strong>{growth?.currentWeight ?? "—"}</strong><span>Current weight (g)</span></article><article><strong>{growth?.sampleCount ?? 0}</strong><span>Weight records</span></article><article><strong>{records.feedings.length}</strong><span>Feeding records</span></article><article><strong>{records.sheds.length}</strong><span>Shed records</span></article></div>}
      {id === 7 && growth && <div className="titan-feature-note"><b>Growth insight</b><p>{growth.sampleCount < 2 ? "More dated weights are needed before a change can be calculated." : `${growth.changeGrams ?? 0} g change across the recorded weight window at an average of ${growth.averageChangePerDay ?? 0} g/day. This is a record-derived summary, not a health judgement.`}</p></div>}
      {id === 9 && behaviour && <div className="titan-feature-note"><b>Behaviour profile</b><p>{behaviour.observationCount ? `Repeated recorded labels: ${behaviour.labels.join(", ")}.` : behaviour.note}</p><small>{behaviour.confidence} confidence</small></div>}
      {id === 13 && <div className="titan-feature-note"><b>Snake passport</b><p>{passportText(recordEvents)}</p></div>}
      {id === 38 && <div className="titan-feature-note"><b>Annual time capsule</b><p>{buildAnnualTitanTimeCapsule(recordEvents, new Date().getFullYear()).summary}</p></div>}
      {id === 39 && <div className="titan-feature-note"><b>Automatic journal</b><p>{buildAutomaticKeeperJournal(recordEvents).length} journal entries can be assembled from dated records.</p></div>}
      {id === 28 && <div className="titan-feature-note"><b>Escape Titan Mode</b><ol>{buildEscapeRecoveryChecklist().map((item) => <li key={item}>{item}</li>)}</ol></div>}
      {id === 29 && <div className="titan-feature-note"><b>Emergency boundary</b><p>{buildEmergencyBoundary().boundary}</p><ol>{buildEmergencyBoundary().steps.map((item) => <li key={item}>{item}</li>)}</ol></div>}
      {id === 15 && <div className="titan-feature-note"><b>Then vs now / change review</b><p>{timeline.length < 2 ? "At least two dated records are needed before change review can operate." : `The selected Titan has ${timeline.length} dated record events available for comparison.`}</p></div>}
    </>}</section>}

    {husbandryTool && selectedSnake && <section className="titan-feature-panel"><p className="titan-feature-kicker">🌡️ HUSBANDRY INTELLIGENCE</p><h2>Recorded microclimate</h2><p>Readings are stored against {selectedSnake.name}. Baselines are derived from recorded observations and are not treated as universal species rules.</p><TitanMicroclimateTool snakeId={selectedSnake.id} /></section>}
    {husbandryTool && !selectedSnake && <section className="titan-feature-panel"><p>Select a Tiny Titan above before recording enclosure observations.</p><div className="titan-feature-note">{buildMissingDataFindings(false, 0)[0].detail}</div></section>}

    {!geneticsTool && !animalTool && !husbandryTool && <section className="titan-feature-panel"><p className="titan-feature-kicker">CONNECTED EXPERIENCE</p><h2>This capability is connected to the wider Tiny Titans system</h2><p>{FEATURE_SUMMARIES[id] ?? "The capability is represented in the V50 intelligence graph and is designed to use shared records, evidence and context."}</p><div className="titan-feature-links">{feature.route && <Link to={feature.route}>Open primary experience →</Link>}{id === 10 || id === 35 || id === 36 || id === 42 || id === 47 ? <Link to="/community">Open Community Intelligence →</Link> : null}{id === 40 || id === 41 || id === 48 ? <Link to="/learn">Open Learning Intelligence →</Link> : null}{id === 12 ? <Link to="/knowledge-base">Open Knowledge Base →</Link> : null}{id === 17 || id === 44 || id === 45 || id === 49 || id === 50 ? <Link to="/titan-intelligence">Open Titan Intelligence Hub →</Link> : null}</div></section>}
    <section className="titan-feature-panel titan-feature-proof"><p className="titan-feature-kicker">TRUST BOUNDARY</p><p>V50 never treats a missing record as a fact, preserves uncertain genetics, keeps appearance separate from genetic confirmation, and escalates veterinary decisions to qualified professionals.</p></section>
  </main>;
}

function passportText(recordEvents: Array<{ id: string; type: string; date: number; title: string }>): string {
  const passport = buildSnakePassport(recordEvents);
  return `${passport.eventCount} recorded events · ${passport.coveredRecordTypes.join(" • ") || "no dated record types yet"}.`;
}
