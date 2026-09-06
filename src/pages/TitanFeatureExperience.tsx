import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TITAN_V50_FEATURES, type V50Feature } from "../intelligence/v50/titanV50FeatureMatrix";
import { FEATURE_SUMMARIES } from "../intelligence/v50/titanV50Runtime";
import { buildAnimalTimeline, buildBehaviourProfile, getGrowthInsight } from "../intelligence/v50/animalIntelligenceEngine";
import { buildAnimalMasterRecord } from "../intelligence/v50/animalMasterRecordEngine";
import { buildMissingDataFindings } from "../intelligence/v50/husbandryIntelligenceEngine";
import { learningSignalsFromProgress, buildSpeciesMasterySnapshot } from "../intelligence/v50/titanLearningAdapter";
import { getLearningProgress } from "../services/learningEngine";
import type { ParentRecord } from "../intelligence/v50/geneticsJourneyEngine";
import TitanMicroclimateTool from "../components/TitanIntelligence/TitanMicroclimateTool";
import TitanDigitalTwinPanel from "../components/TitanIntelligence/TitanDigitalTwinPanel";
import TitanEcosystemPanel from "../components/TitanIntelligence/TitanEcosystemPanel";
import TitanGeneticsWorkspace from "../components/TitanIntelligence/TitanGeneticsWorkspace";
import TitanAnimalMasterRecord from "../components/TitanIntelligence/TitanAnimalMasterRecord";
import TitanCommunityLearningPanel from "../components/TitanIntelligence/TitanCommunityLearningPanel";
import TitanExplanationModes from "../components/TitanIntelligence/TitanExplanationModes";
import TitanKnowledgeGraphPanel from "../components/TitanIntelligence/TitanKnowledgeGraphPanel";
import TitanLiveIntelligencePanel from "../components/TitanIntelligence/TitanLiveIntelligencePanel";
import {
  TitanFamilyTreePanel,
  TitanShedDetectivePanel,
  TitanHatchlingPanel,
  TitanLearningMasteryPanel,
  TitanResearchArchivePanel,
} from "../components/TitanIntelligence/TitanAdvancedDomainPanels";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import "../components/TitanIntelligence/TitanLiveIntelligencePanel.css";
import "./TitanFeatureExperience.css";

const icons: Record<number, string> = {
  1: "🕵️", 2: "📷", 3: "🐉", 4: "🌳", 5: "⏳", 6: "🧠", 7: "📈", 8: "↔️", 9: "🧠", 10: "🌍",
  11: "🧬", 12: "🛋️", 13: "🪪", 14: "🩺", 15: "🔎", 16: "🧪", 17: "🔥", 18: "⚠️", 19: "🌡️", 20: "🏠",
  21: "🌱", 22: "🪴", 23: "📚", 24: "⚖️", 25: "🥚", 26: "🕵️", 27: "📊", 28: "🚪", 29: "🚨", 30: "🔔",
  31: "🏗️", 32: "⚙️", 33: "🐣", 34: "📐", 35: "🏅", 36: "⚖️", 37: "🧬", 38: "📦", 39: "📓", 40: "🎓",
  41: "🏆", 42: "🌍", 43: "🕸️", 44: "❓", 45: "📡", 46: "🧬", 47: "🌎", 48: "🔬", 49: "⚡", 50: "🤯",
};

const geneticsFeatures = new Set([1, 2, 3, 4, 5, 11, 16, 23, 24, 25, 34, 36, 37, 43, 46, 48]);
const animalFeatures = new Set([6, 7, 8, 9, 13, 14, 15, 26, 27, 28, 29, 38, 39]);
const husbandryFeatures = new Set([18, 19, 20, 21, 22, 30, 31, 32]);
const communityFeatures = new Set([10, 35, 36, 42, 47]);
const learningFeatures = new Set([40, 41, 48]);
const explanationFeatures = new Set([12]);
const platformLiveFeatures = new Set([17, 44, 45, 49, 50]);

function featureById(id: string | undefined): V50Feature | undefined {
  const numericId = Number(id);
  return Number.isInteger(numericId) ? TITAN_V50_FEATURES.find((feature) => feature.id === numericId) : undefined;
}

function recordDate(value: unknown): string | number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : "";
  }
  return "";
}

function recordNumber(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function snakeRecords(snake: Snake) {
  const structural = snake as Snake & Record<string, unknown>;
  return {
    weights: (snake.weightHistory ?? [])
      .map((item) => {
        const entry = item as Record<string, unknown>;
        return { date: recordDate(entry.date ?? entry.recordedAt), grams: recordNumber(entry.weight ?? entry.grams) };
      })
      .filter((item) => item.grams > 0),
    feedings: (snake.feedingHistory ?? []).map((item) => {
      const entry = item as Record<string, unknown>;
      return { date: recordDate(entry.date ?? entry.fedAt), label: String(entry.food ?? entry.type ?? "Feeding recorded") };
    }),
    sheds: (snake.shedHistory ?? []).map((item) => {
      const entry = item as Record<string, unknown>;
      return { date: recordDate(entry.date ?? entry.shedDate), label: String(entry.status ?? "Shed recorded") };
    }),
    behaviour: ((structural.behaviourHistory as unknown[]) ?? []).map((item) => {
      const entry = item as Record<string, unknown>;
      return {
        date: recordDate(entry.date),
        category: String(entry.category ?? ""),
        label: String(entry.label ?? entry.behaviour ?? ""),
      };
    }),
    health: (snake.healthHistory ?? []).map((item) => {
      const entry = item as Record<string, unknown>;
      return { date: recordDate(entry.date), label: String(entry.title ?? "Health record") };
    }),
  };
}

function buildFamilyRecords(snakes: readonly Snake[]): ParentRecord[] {
  return snakes
    .map((snake) => {
      const structural = snake as Snake & Record<string, unknown>;
      const parentIds = Array.isArray(structural.parentIds)
        ? structural.parentIds.filter((value): value is string => typeof value === "string" && Boolean(value))
        : [];
      const motherId = typeof structural.motherId === "string" ? structural.motherId : undefined;
      const fatherId = typeof structural.fatherId === "string" ? structural.fatherId : undefined;
      return {
        id: snake.id,
        name: snake.name,
        genes: [],
        parentIds: [...parentIds, ...[motherId, fatherId].filter((value): value is string => Boolean(value))],
      };
    })
    .map((record) => ({ ...record, parentIds: [...new Set(record.parentIds)] }));
}

function birthDateFor(snake: Snake): number | undefined {
  const structural = snake as Snake & Record<string, unknown>;
  const raw = structural.hatchDate ?? structural.birthDate ?? structural.dateOfBirth;
  const date = recordDate(raw);
  const millis = typeof date === "number" ? date : Date.parse(String(date));
  return Number.isFinite(millis) && millis > 0 ? millis : undefined;
}

export default function TitanFeatureExperience() {
  const { featureId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const feature = featureById(featureId);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [referenceNow] = useState(() => Date.now());
  const [learningProgress, setLearningProgress] = useState(() => getLearningProgress(user?.uid));

  useEffect(() => {
    if (!user) return;
    setLearningProgress(getLearningProgress(user.uid));
    let active = true;
    void getUserSnakes(user.uid)
      .then((result) => {
        if (!active) return;
        setSnakes(result);
        setSelectedSnakeId((current) => current || result[0]?.id || "");
      })
      .catch(() => {
        if (active) setSnakes([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const records = useMemo(() => (selectedSnake ? snakeRecords(selectedSnake) : null), [selectedSnake]);
  const growth = useMemo(() => (records ? getGrowthInsight(records.weights) : null), [records]);
  const timeline = useMemo(
    () =>
      records && selectedSnake
        ? buildAnimalTimeline({
            name: selectedSnake.name,
            weights: records.weights,
            feedings: records.feedings,
            sheds: records.sheds,
            behaviour: records.behaviour,
            health: records.health,
          })
        : [],
    [records, selectedSnake],
  );
  const behaviour = useMemo(() => (records ? buildBehaviourProfile(records.behaviour) : null), [records]);
  const masterRecord = useMemo(
    () =>
      records && growth && behaviour && selectedSnake
        ? buildAnimalMasterRecord({
            growth,
            behaviour,
            timeline,
            counts: {
              weights: records.weights.length,
              feedings: records.feedings.length,
              sheds: records.sheds.length,
              behaviour: records.behaviour.length,
              health: records.health.length,
              journal: timeline.length,
              passport: timeline.length,
            },
          })
        : null,
    [records, growth, behaviour, timeline, selectedSnake],
  );
  const familyRecords = useMemo(() => buildFamilyRecords(snakes), [snakes]);
  const ageDays = useMemo(() => {
    if (!selectedSnake) return undefined;
    const born = birthDateFor(selectedSnake);
    return born ? Math.max(0, Math.floor((referenceNow - born) / 86400000)) : undefined;
  }, [selectedSnake, referenceNow]);
  const learningSignals = useMemo(() => learningSignalsFromProgress(learningProgress), [learningProgress]);
  const mastery = useMemo(() => buildSpeciesMasterySnapshot(learningProgress), [learningProgress]);

  if (!feature) {
    return (
      <main className="page-container titan-feature-page">
        <button type="button" onClick={() => navigate(-1)}>← Back</button>
        <h1>Tiny Titans feature not found</h1>
        <p>The requested capability is not present in the canonical feature matrix.</p>
        <Link to="/titan-intelligence">Open Titan Intelligence →</Link>
      </main>
    );
  }

  const id = feature.id;
  const geneticsTool = geneticsFeatures.has(id);
  const animalTool = animalFeatures.has(id);
  const husbandryTool = husbandryFeatures.has(id);
  const communityTool = communityFeatures.has(id);
  const learningTool = learningFeatures.has(id);
  const explanationTool = explanationFeatures.has(id);
  const platformLiveTool = platformLiveFeatures.has(id);

  return (
    <main className="page-container titan-feature-page">
      <button type="button" className="titan-feature-back" onClick={() => navigate(-1)}>
        ← Back to Titan Intelligence
      </button>

      <header className="titan-feature-hero">
        <div>
          <span className="titan-feature-id">Tiny Titans · Feature #{id}</span>
          <h1>{icons[id] ?? "🧠"} {feature.name}</h1>
          <p>{FEATURE_SUMMARIES[id] ?? "Connected intelligence capability."}</p>
        </div>
        <div className={`titan-feature-status titan-feature-status--${feature.status}`}>
          <strong>{feature.status}</strong>
          <span>current capability state</span>
        </div>
      </header>

      {platformLiveTool && <TitanLiveIntelligencePanel />}
      {communityTool && <TitanCommunityLearningPanel featureId={id} />}
      {learningTool && <TitanCommunityLearningPanel featureId={id} />}
      {explanationTool && <TitanExplanationModes summary={FEATURE_SUMMARIES[id] ?? feature.name} />}
      {id === 43 && <TitanKnowledgeGraphPanel />}
      {geneticsTool && <TitanGeneticsWorkspace featureId={id} />}
      {id === 4 && <TitanFamilyTreePanel records={familyRecords} />}
      {id === 26 && <TitanShedDetectivePanel observations={records?.sheds ?? []} />}
      {id === 33 && <TitanHatchlingPanel ageDays={ageDays} />}
      {(id === 40 || id === 41) && (
        <TitanLearningMasteryPanel
          signals={learningSignals}
          availableTopics={["species basics", "husbandry", "genetics", "behaviour", "feeding"]}
        />
      )}
      {id === 48 && <TitanResearchArchivePanel />}

      {(id === 40 || id === 41) && (
        <section className="titan-feature-panel">
          <p className="titan-feature-kicker">🏆 SPECIES MASTERY</p>
          <h2>Your demonstrated learning map</h2>
          <div className="titan-feature-data-grid">
            <article><strong>{learningProgress.xp}</strong><span>Knowledge XP</span></article>
            <article><strong>{learningProgress.currentStreak}</strong><span>Current streak</span></article>
            <article><strong>{mastery.filter((item) => item.demonstrated).length}</strong><span>Demonstrated topics</span></article>
            <article><strong>{mastery.length}</strong><span>Recorded topics</span></article>
          </div>
          <div className="titan-feature-results">
            {mastery.slice(0, 6).map((item) => (
              <article key={item.topicId}>
                <strong>{item.topicId}</strong>
                <p>{item.masteryPercent}% mastery · {item.attempts} attempts</p>
                <small>{item.demonstrated ? "Demonstrated" : "Still developing"}</small>
              </article>
            ))}
          </div>
          <Link to="/challenge">Continue Titans Challenge →</Link>
        </section>
      )}

      {(animalTool || husbandryTool) && (
        <section className="titan-feature-panel">
          <p className="titan-feature-kicker">🐍 ANIMAL CONTEXT</p>
          <h2>Choose the Tiny Titan this capability should inspect</h2>
          {snakes.length === 0 ? (
            <>
              <p>No animal records are available yet, so Tiny Titans will not fabricate a context.</p>
              <Link to="/snakes/new">Add a Tiny Titan →</Link>
            </>
          ) : (
            <>
              <select value={selectedSnakeId} onChange={(event) => setSelectedSnakeId(event.target.value)} aria-label="Select Tiny Titan">
                {snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}
              </select>
              {animalTool && records && (
                <div className="titan-feature-data-grid">
                  <article><strong>{growth?.currentWeight ?? "—"}</strong><span>Current weight (g)</span></article>
                  <article><strong>{growth?.sampleCount ?? 0}</strong><span>Weight records</span></article>
                  <article><strong>{records.feedings.length}</strong><span>Feeding records</span></article>
                  <article><strong>{records.sheds.length}</strong><span>Shed records</span></article>
                </div>
              )}
              {id === 7 && growth && (
                <div className="titan-feature-note">
                  <b>Growth insight</b>
                  <p>
                    {growth.sampleCount < 2
                      ? "More dated weights are needed before a change can be calculated."
                      : `${growth.changeGrams ?? 0} g change across the recorded weight window at an average of ${growth.averageChangePerDay ?? 0} g/day. This is a record-derived summary, not a health judgement.`}
                  </p>
                </div>
              )}
              {id === 9 && behaviour && (
                <div className="titan-feature-note">
                  <b>Behaviour profile</b>
                  <p>{behaviour.observationCount ? `Repeated recorded labels: ${behaviour.labels.join(", ")}.` : behaviour.note}</p>
                  <small>{behaviour.confidence} confidence</small>
                </div>
              )}
              {id === 15 && (
                <div className="titan-feature-note">
                  <b>Then vs now / change review</b>
                  <p>{timeline.length < 2 ? "At least two dated records are needed before change review can operate." : `The selected Titan has ${timeline.length} dated record events available for comparison.`}</p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {husbandryTool && selectedSnake && (
        <section className="titan-feature-panel">
          <p className="titan-feature-kicker">🌡️ HUSBANDRY INTELLIGENCE</p>
          <h2>Recorded microclimate, ecosystem & Digital Twin</h2>
          <p>
            Readings are stored against {selectedSnake.name}. Baselines are derived from recorded observations and are not treated as universal species rules.
          </p>
          <TitanMicroclimateTool snakeId={selectedSnake.id} />
          <TitanDigitalTwinPanel uid={user?.uid ?? ""} snake={selectedSnake} />
          {(id === 21 || id === 22) && <TitanEcosystemPanel snake={selectedSnake} />}
        </section>
      )}

      {husbandryTool && !selectedSnake && (
        <section className="titan-feature-panel">
          <p>Select a Tiny Titan above before recording enclosure observations.</p>
          <div className="titan-feature-note">{buildMissingDataFindings(false, 0)[0]?.detail ?? "No additional husbandry context is available yet."}</div>
        </section>
      )}

      {!geneticsTool && !animalTool && !husbandryTool && !communityTool && !learningTool && !explanationTool && !platformLiveTool && id !== 43 && id !== 4 && id !== 26 && id !== 33 && id !== 48 && (
        <section className="titan-feature-panel">
          <p className="titan-feature-kicker">CONNECTED EXPERIENCE</p>
          <h2>This capability is connected to the wider Tiny Titans system</h2>
          <p>{FEATURE_SUMMARIES[id] ?? "The capability is represented in the intelligence graph and is designed to use shared records, evidence and context."}</p>
          <div className="titan-feature-links">{feature.route && <Link to={feature.route}>Open primary experience →</Link>}</div>
        </section>
      )}

      <section className="titan-feature-panel titan-feature-proof">
        <p className="titan-feature-kicker">TRUST BOUNDARY</p>
        <p>
          Tiny Titans never treats a missing record as a fact, preserves uncertain genetics, keeps appearance separate from genetic confirmation, and escalates veterinary decisions to qualified professionals.
        </p>
      </section>

      {animalTool && selectedSnake && masterRecord && (
        <TitanAnimalMasterRecord snakeName={selectedSnake.name} record={masterRecord} />
      )}
    </main>
  );
}
