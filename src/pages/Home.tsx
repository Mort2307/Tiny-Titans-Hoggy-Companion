import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PwaInstallCard from "../components/PwaInstallCard";
import TitanGoalTracker from "../components/TitanGoalTracker";
import ContributionPulse from "../components/ContributionPulse";
import TinyTitansPinnacleGlobe from "../components/TinyTitansPinnacleGlobe";
import RecommendedFeed from "../components/RecommendedFeed";
import TitanDecisionWhyCard from "../components/TitanIntelligence/TitanDecisionWhyCard";
import TitanDecisionQueue from "../components/TitanIntelligence/TitanDecisionQueue";
import { useAuth } from "../context/useAuth";
import { useWorldTime } from "../context/WorldTimeContext";
import { getUserSnakes } from "../services/snakeService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import { getDashboardIntelligence, type SnakeIntelligence } from "../services/snakeIntelligenceService";
import { getTitanDecisionState, refreshTitanDecisionStateForAnimals, type TitanDecision } from "../services/titanDecisionStateService";
import { subscribeToTitanIntelligenceUpdates } from "../services/titanReactiveIntelligenceService";
import "./Home.css";

type HomeSnake = {
  id: string;
  name: string;
  weightRecords: number;
  feedingRecords: number;
  shedRecords: number;
  healthRecords: number;
};

function buildQuietIntelligenceSnippet(snake: HomeSnake | undefined, totalRecords: number, dateKey: string): string {
  if (!snake || totalRecords === 0) return "There is more useful information hiding in a well-kept record than first meets the eye.";
  const snippets = [
    snake.weightRecords >= 3 ? `${snake.name}'s weight history is starting to look like a pattern rather than a pile of numbers.` : null,
    snake.feedingRecords >= 3 ? `${snake.name}'s feeding log is getting interesting. A rhythm is beginning to peek through.` : null,
    snake.shedRecords >= 3 ? `Those shed records are quietly becoming a useful little baseline for ${snake.name}.` : null,
    snake.weightRecords >= 2 && snake.feedingRecords >= 3 ? `There is more hiding in ${snake.name}'s weight and feeding history than either record shows on its own.` : null,
    snake.shedRecords >= 2 && snake.feedingRecords >= 3 ? `Something interesting is starting to emerge in the rhythm of ${snake.name}'s routine.` : null,
    snake.healthRecords > 0 && (snake.weightRecords > 0 || snake.feedingRecords > 0) ? `${snake.name}'s records are beginning to give a little more context than the individual entries suggest.` : null,
    totalRecords >= 12 ? "You've logged enough here that the history is starting to look rather more interesting than simple record keeping." : null,
    totalRecords >= 7 ? "There is a little more going on in these records than first meets the eye." : null,
  ].filter((value): value is string => Boolean(value));
  if (!snippets.length) return "A few more real records and this gets surprisingly interesting.";
  let hash = 0;
  for (const character of `${snake.id}-${dateKey}`) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return snippets[hash % snippets.length];
}

function Home() {
  const { user, profile } = useAuth();
  const world = useWorldTime();
  const [snakes, setSnakes] = useState<HomeSnake[]>([]);
  const [intelligence, setIntelligence] = useState<SnakeIntelligence[]>([]);
  const [decision, setDecision] = useState<TitanDecision | null>(null);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [intelligenceAccess, setIntelligenceAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const displayName = profile?.displayName || user?.displayName || "Tiny Titan";
  const learningLabel = profile?.learningLevel === "explorer"
    ? "Explorer"
    : profile?.learningLevel === "learner"
      ? "Learner"
      : profile?.learningLevel === "student"
        ? "Student"
        : "Adult";
  const experience = profile?.experienceLevel === "pro"
    ? "Advanced"
    : profile?.experienceLevel === "intermediate"
      ? "Intermediate"
      : "Beginner";

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingIntelligence(true);
    setAccessChecked(false);

    const load = async () => {
      try {
        const [hasAccess, records] = await Promise.all([
          hasFullIntelligenceAccess(user.uid),
          getUserSnakes(user.uid),
        ]);
        if (!active) return;

        setIntelligenceAccess(hasAccess);
        setAccessChecked(true);

        const minimal = records.map((snake) => ({
          id: snake.id,
          name: snake.name,
          weightRecords: snake.weightHistory?.length ?? 0,
          feedingRecords: snake.feedingHistory?.length ?? 0,
          shedRecords: snake.shedHistory?.length ?? 0,
          healthRecords: snake.healthHistory?.length ?? 0,
        }));

        setSnakes(minimal);
        setSelectedSnakeId((current) => minimal.some((snake) => snake.id === current) ? current : minimal[0]?.id ?? "");

        if (!hasAccess) {
          setIntelligence([]);
          setDecision(null);
          return;
        }

        const insights = await getDashboardIntelligence(user.uid, minimal.map((snake) => snake.id));
        if (!active) return;
        setIntelligence(insights);

        const existing = getTitanDecisionState(user.uid);
        const existingActive = existing.decisions.find((item) => item.status === "active") ?? null;

        if (existing.decisions.length > 0) {
          setDecision(existingActive);
        } else {
          const refreshed = await refreshTitanDecisionStateForAnimals(user.uid, minimal.map((snake) => snake.id));
          if (!active) return;
          setDecision(refreshed.decisions.find((item) => item.status === "active") ?? null);
        }
      } catch {
        if (!active) return;
        setSnakes([]);
        setIntelligence([]);
        setDecision(null);
        setIntelligenceAccess(false);
        setAccessChecked(true);
      } finally {
        if (active) setLoadingIntelligence(false);
      }
    };

    void load();

    const unsubscribe = subscribeToTitanIntelligenceUpdates((detail) => {
      const event = detail.event;
      if (event?.animalId && event.occurredAt) {
        void refreshTitanDecisionStateForAnimals(user.uid, [event.animalId], {
          type: event.type,
          occurredAt: event.occurredAt,
        }).then(() => {
          if (active) void load();
        }).catch(() => {
          if (active) void load();
        });
        return;
      }
      if (event) void load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !intelligenceAccess) return () => undefined;
    const refresh = () => setDecision(
      getTitanDecisionState(user.uid).decisions.find((item) => item.status === "active") ?? null,
    );
    refresh();
    return subscribeToTitanIntelligenceUpdates((detail) => {
      if (detail.event) return;
      refresh();
    });
  }, [user, intelligenceAccess]);

  const selectedIntelligence = useMemo(
    () => intelligence.find((item) => item.snakeId === selectedSnakeId) ?? intelligence[0],
    [intelligence, selectedSnakeId],
  );
  const selectedSnake = useMemo(
    () => snakes.find((snake) => snake.id === selectedSnakeId) ?? snakes[0],
    [snakes, selectedSnakeId],
  );
  const attentionDecision = decision?.status === "active" ? decision : null;
  const coverage = useMemo(
    () => intelligence.length
      ? Math.round(intelligence.reduce((sum, item) => sum + item.dataCoveragePercent, 0) / intelligence.length)
      : 0,
    [intelligence],
  );
  const totalRecords = useMemo(
    () => snakes.reduce((sum, snake) => sum + snake.weightRecords + snake.feedingRecords + snake.shedRecords + snake.healthRecords, 0),
    [snakes],
  );
  const snapshot = useMemo(() => ({
    weights: snakes.reduce((sum, snake) => sum + snake.weightRecords, 0),
    feedings: snakes.reduce((sum, snake) => sum + snake.feedingRecords, 0),
    sheds: snakes.reduce((sum, snake) => sum + snake.shedRecords, 0),
    health: snakes.reduce((sum, snake) => sum + snake.healthRecords, 0),
  }), [snakes]);
  const quietIntelligenceSnippet = useMemo(
    () => buildQuietIntelligenceSnippet(selectedSnake, totalRecords, world.localDateKey),
    [selectedSnake, totalRecords, world.localDateKey],
  );
  const selectedIndex = Math.max(0, snakes.findIndex((snake) => snake.id === selectedSnakeId));

  function moveSnake(direction: -1 | 1) {
    if (!snakes.length) return;
    const next = (selectedIndex + direction + snakes.length) % snakes.length;
    setSelectedSnakeId(snakes[next].id);
  }

  const selectedSnakeRecords = selectedSnake
    ? selectedSnake.weightRecords + selectedSnake.feedingRecords + selectedSnake.shedRecords + selectedSnake.healthRecords
    : 0;

  return (
    <main className="dashboard tt-home">
      <header className="tt-home-brandbar">
        <div>
          <p className="tt-home-brand">🐍 TinyTitans Reptile Companion 🦎</p>
          <p className="tt-home-tagline">Your reptile companion, records, learning and intelligence — in one calm place.</p>
        </div>
        <Link className="tt-home-profile-chip" to="/account" aria-label="Open My Account">
          <span className="tt-home-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{displayName}</strong>
            <small>{experience} keeper · {snakes.length} {snakes.length === 1 ? "animal" : "animals"}</small>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      </header>

      <section className="tt-home-welcome">
        <div>
          <p className="tt-home-eyebrow">{world.localDateKey} · {world.timezone}</p>
          <h1>Good {world.localTimePeriod}, {displayName} 👋</h1>
          <p>Here is the information most worth seeing first. Everything else is one tap away when you need it.</p>
        </div>
        <div className="tt-home-mode">
          <span>🧠 {learningLabel} learning</span>
          <small>{intelligenceAccess ? "Intelligence enabled" : "Keeper records only"}</small>
        </div>
      </section>

      {loadingIntelligence ? (
        <section className="tt-home-panel tt-home-loading">🧠 Checking your TinyTitans workspace…</section>
      ) : snakes.length === 0 ? (
        <section className="tt-home-panel tt-home-empty">
          <div>
            <p className="tt-home-kicker">🐍 YOUR FIRST REPTILE</p>
            <h2>No animals added yet</h2>
            <p>Add your first animal and Home will become personalised around its records, care and trends.</p>
          </div>
          <Link className="tt-home-primary" to="/snakes/new">＋ Add your first animal</Link>
        </section>
      ) : (
        <section className="tt-home-section tt-home-current">
          <div className="tt-home-heading">
            <div>
              <p className="tt-home-kicker">🐍 CURRENT ANIMAL</p>
              <h2>{selectedSnake?.name}</h2>
            </div>
            <div className="tt-home-heading-actions">
              <button type="button" className="tt-home-select-button" onClick={() => moveSnake(-1)} aria-label="Previous animal">‹</button>
              <span>{selectedIndex + 1}/{snakes.length}</span>
              <button type="button" className="tt-home-select-button" onClick={() => moveSnake(1)} aria-label="Next animal">›</button>
              <Link to="/snakes">View all →</Link>
            </div>
          </div>

          <div className="tt-home-current-card">
            <div className="tt-home-current-identity">
              <div className="tt-home-current-avatar" aria-hidden="true">🐍</div>
              <div>
                <span>{selectedSnakeRecords} recorded {selectedSnakeRecords === 1 ? "event" : "events"}</span>
                <strong>{selectedSnake?.name}</strong>
                <small>Western Hognose · individual keeper record</small>
              </div>
            </div>
            <div className="tt-home-current-status">
              <span className={attentionDecision?.animalId === selectedSnake?.id ? "is-attention" : "is-good"}>
                {intelligenceAccess
                  ? attentionDecision?.animalId === selectedSnake?.id
                    ? "⚡ Needs a look"
                    : selectedIntelligence?.priority?.tone === "attention"
                      ? "🟠 Worth checking"
                      : "🟢 Tracking normally"
                  : "📋 Keeper records"}
              </span>
              {intelligenceAccess && <small>{coverage}% average data coverage</small>}
            </div>
            <p>
              {intelligenceAccess
                ? attentionDecision?.animalId === selectedSnake?.id
                  ? attentionDecision.reason
                  : selectedIntelligence?.summary ?? "TinyTitans is building this animal's individual baseline."
                : `${selectedSnake?.name} has ${selectedSnake?.weightRecords ?? 0} weight, ${selectedSnake?.feedingRecords ?? 0} feeding, ${selectedSnake?.shedRecords ?? 0} shed and ${selectedSnake?.healthRecords ?? 0} health records.`}
            </p>
            <div className="tt-home-current-actions">
              <Link to={`/snakes/${selectedSnake?.id}/master-record`}>📋 Master Record</Link>
              <Link to={`/husbandry/${selectedSnake?.id}`}>🌡️ Husbandry</Link>
              <Link to={`/snakes/${selectedSnake?.id}/weights`}>⚖️ Weight</Link>
              <Link to={`/snakes/${selectedSnake?.id}/feeding`}>🍽️ Feeding</Link>
            </div>
          </div>
        </section>
      )}

      <section className="tt-home-section tt-home-attention-section">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker">⚠️ NEEDS ATTENTION</p>
            <h2>What is worth looking at now?</h2>
          </div>
          {intelligenceAccess && <span>{coverage}% data coverage</span>}
        </div>

        {!accessChecked ? (
          <div className="tt-home-panel tt-home-loading">Checking intelligence access…</div>
        ) : !intelligenceAccess ? (
          <div className="tt-home-panel tt-home-teaser">
            <div className="tt-home-teaser-icon" aria-hidden="true">👀</div>
            <div>
              <span className="tt-home-teaser-label">KEEPER VIEW</span>
              <h3>{quietIntelligenceSnippet}</h3>
              <p>Your records still work normally. Optional Intelligence can turn these patterns into ranked next actions later.</p>
            </div>
          </div>
        ) : attentionDecision ? (
          <article className="tt-home-panel tt-attention-card">
            <div className="tt-attention-card-top">
              <span>{attentionDecision.animalName ?? "Your Titan"} · {attentionDecision.domain}</span>
              <strong>{attentionDecision.score}/100</strong>
            </div>
            <h3>{attentionDecision.title}</h3>
            <p><b>Why:</b> {attentionDecision.why}</p>
            <p><b>Next:</b> {attentionDecision.reason}</p>
            <small>◉ {attentionDecision.confidence >= 0.9 ? "High" : attentionDecision.confidence >= 0.75 ? "Moderate" : attentionDecision.confidence >= 0.5 ? "Low" : "Insufficient"} confidence</small>
            <Link to={attentionDecision.destination || `/snakes/${attentionDecision.animalId}/master-record`}>Open next action →</Link>
            <TitanDecisionWhyCard decision={attentionDecision} compact />
          </article>
        ) : (
          <div className="tt-home-panel tt-home-good">
            <strong>✓ Nothing needs your attention right now.</strong>
            <p>TinyTitans checked the supported decision queue and found no stronger next action to surface.</p>
          </div>
        )}

        {intelligenceAccess && (
          <details className="tt-home-disclosure">
            <summary>See the wider decision queue</summary>
            <TitanDecisionQueue excludeDecisionId={attentionDecision?.id} limit={3} />
          </details>
        )}
      </section>

      <section className="tt-home-section">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker">⚡ QUICK ACTIONS</p>
            <h2>Log something</h2>
          </div>
        </div>
        <div className="tt-quick-actions">
          <Link className="is-primary" to="/weights"><span>⚖️</span><strong>Weight</strong><small>Record measurement</small></Link>
          <Link to="/feeding"><span>🍽️</span><strong>Feeding</strong><small>Log a feed</small></Link>
          <Link to="/shedding"><span>🐍</span><strong>Shed</strong><small>Record a stage</small></Link>
          <Link to="/husbandry"><span>🌡️</span><strong>Environment</strong><small>Log conditions</small></Link>
          <Link to="/snakes/new"><span>＋</span><strong>Add animal</strong><small>Grow your collection</small></Link>
        </div>
      </section>

      <section className="tt-home-section">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker">📊 AT A GLANCE</p>
            <h2>Your records</h2>
          </div>
          <Link to="/snakes">Open collection →</Link>
        </div>
        <div className="tt-home-stats">
          <Link to="/snakes"><strong>{snakes.length}</strong><span>🐍 Animals</span></Link>
          <Link to="/weights"><strong>{snapshot.weights}</strong><span>⚖️ Weight</span></Link>
          <Link to="/feeding"><strong>{snapshot.feedings}</strong><span>🍽️ Feeding</span></Link>
          <Link to="/shedding"><strong>{snapshot.sheds}</strong><span>🐍 Shed</span></Link>
          <Link to="/health"><strong>{snapshot.health}</strong><span>🩺 Health</span></Link>
        </div>
        {!intelligenceAccess && snakes.length > 0 && (
          <p className="tt-home-snapshot-note">Counts come directly from your recorded history and do not depend on Intelligence consent.</p>
        )}
      </section>

      <section className="tt-home-section">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker">🧭 EXPLORE</p>
            <h2>Go deeper when you need it</h2>
          </div>
        </div>
        <div className="tt-home-explore-grid">
          <Link to="/morph-library"><span>🧬</span><div><strong>Genetics Library</strong><small>Canonical morph identities and recognised combinations.</small></div><b>→</b></Link>
          <Link to="/husbandry"><span>📚</span><div><strong>Husbandry Library</strong><small>Species-aware care, enclosure and environmental guidance.</small></div><b>→</b></Link>
          <Link to="/behaviour-observatory"><span>🔬</span><div><strong>Behaviour Observatory</strong><small>Keeper observations, theories and evidence.</small></div><b>→</b></Link>
          <Link to="/community"><span>🌍</span><div><strong>Titan Community</strong><small>Contributions, shared learning and community intelligence.</small></div><b>→</b></Link>
          <Link to="/challenge"><span>🎓</span><div><strong>Titans Challenge</strong><small>Keep building your reptile knowledge at your own level.</small></div><b>→</b></Link>
          <Link to="/account/family"><span>👨‍👩‍👧</span><div><strong>My Family</strong><small>Shared care with controlled access.</small></div><b>→</b></Link>
        </div>
      </section>

      <section className="tt-home-lower-grid">
        <article className="tt-home-panel">
          <p className="tt-home-kicker">🧠 LEARNING MODE</p>
          <h3>{learningLabel} learning</h3>
          <p>Your learning level changes how TinyTitans presents information without changing the underlying scientific facts.</p>
          <Link to="/account/personalise">Tune learning →</Link>
        </article>
        <article className="tt-home-panel">
          <p className="tt-home-kicker">🦎 SPECIES-SAFE CONTEXT</p>
          <h3>Content stays attached to the animal</h3>
          <p>Care, safety and genetics surfaces are designed to remain species-aware as TinyTitans expands beyond snakes.</p>
          <Link to="/snakes">Manage animals →</Link>
        </article>
      </section>

      <section className="tt-home-secondary">
        <PwaInstallCard />
        <TitanGoalTracker compact />
      </section>

      <details className="tt-home-disclosure tt-home-secondary-disclosure">
        <summary>✨ Recommended genetics</summary>
        <RecommendedFeed />
      </details>

      <details className="tt-home-disclosure tt-home-secondary-disclosure">
        <summary>🌍 Titan community pulse</summary>
        <ContributionPulse />
      </details>

      {user && (
        <details className="tt-home-disclosure tt-home-secondary-disclosure">
          <summary>🌎 The TinyTitans world</summary>
          <TinyTitansPinnacleGlobe uid={user.uid} />
        </details>
      )}

      <details className="tt-home-tools">
        <summary>🧰 Open the full TinyTitans toolbox</summary>
        <div className="tt-tool-grid">
          <Link to="/morph-library">🧬 Morph Library</Link>
          <Link to="/calculator">🧮 Genetics Calculator</Link>
          <Link to="/sandbox">🧪 Sandbox</Link>
          <Link to="/knowledge-base">📚 Knowledge Base</Link>
          <Link to="/community">🌍 Community</Link>
          <Link to="/account">⚙️ My Account</Link>
          <Link to="/report-bug">🐛 Report a bug</Link>
          <Link to="/feedback">💬 Feedback</Link>
        </div>
      </details>
    </main>
  );
}

export default Home;
