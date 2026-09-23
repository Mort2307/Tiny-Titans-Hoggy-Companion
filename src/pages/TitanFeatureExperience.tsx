import { Link } from "react-router-dom";
import { FEATURE_SUMMARIES } from "../intelligence/v50/titanV50Runtime";
import { buildMissingDataFindings } from "../intelligence/v50/husbandryIntelligenceEngine";
import TitanMicroclimateTool from "../components/TitanIntelligence/TitanMicroclimateTool";
import TitanDigitalTwinPanel from "../components/TitanIntelligence/TitanDigitalTwinPanel";
import TitanEcosystemPanel from "../components/TitanIntelligence/TitanEcosystemPanel";
import TitanGeneticsWorkspace from "../components/TitanIntelligence/TitanGeneticsWorkspace";
import TitanAnimalMasterRecord from "../components/TitanIntelligence/TitanAnimalMasterRecord";
import TitanCommunityLearningPanel from "../components/TitanIntelligence/TitanCommunityLearningPanel";
import TitanExplanationModes from "../components/TitanIntelligence/TitanExplanationModes";
import TitanKnowledgeGraphPanel from "../components/TitanIntelligence/TitanKnowledgeGraphPanel";
import TitanLiveIntelligencePanel from "../components/TitanIntelligence/TitanLiveIntelligencePanel";
import { TitanFamilyTreePanel, TitanShedDetectivePanel, TitanHatchlingPanel, TitanLearningMasteryPanel, TitanResearchArchivePanel } from "../components/TitanIntelligence/TitanAdvancedDomainPanels";
import useTitanFeatureExperience from "../hooks/useTitanFeatureExperience";
import { TITAN_FEATURE_ICONS, geneticsFeatures, animalFeatures, husbandryFeatures, communityFeatures, learningFeatures, explanationFeatures, platformLiveFeatures } from "../config/titanFeatureExperience";
import "../components/TitanIntelligence/TitanLiveIntelligencePanel.css";
import "./TitanFeatureExperience.css";

export default function TitanFeatureExperience() {
  const {
    navigate, user, feature, snakes, selectedSnakeId, setSelectedSnakeId, learningProgress,
    selectedSnake, records, growth, timeline, behaviour, masterRecord, familyRecords,
    ageDays, learningSignals, mastery,
  } = useTitanFeatureExperience();

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
          <h1>{TITAN_FEATURE_ICONS[id] ?? "🧠"} {feature.name}</h1>
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
