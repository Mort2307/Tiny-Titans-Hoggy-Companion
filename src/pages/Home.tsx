import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import PwaInstallCard from "../components/PwaInstallCard";
import TitanGoalTracker from "../components/TitanGoalTracker";
import HomeCurrentAnimalSection from "../components/Home/HomeCurrentAnimalSection";
import HomeAttentionSection from "../components/Home/HomeAttentionSection";
import ContributionPulse from "../components/ContributionPulse";
import RecommendedFeed from "../components/RecommendedFeed";
import { useHomeDashboard } from "../hooks/useHomeDashboard";

import "./Home.css";

const TinyTitansPinnacleGlobe = lazy(() => import("../components/TinyTitansPinnacleGlobe"));

const HomeGlobeFallback = () => <section className="tt-home-panel">Loading the TinyTitans world…</section>;

function Home() {
  const {
    user, world, displayName, learningLabel, experience, snakes, attentionDecision, selectedIntelligence,
    selectedSnake, selectedIndex, selectedSnakeRecords, coverage, snapshot, quietIntelligenceSnippet,
    loadingIntelligence, intelligenceAccess, accessChecked, worldOpen, setWorldOpen, moveSnake,
  } = useHomeDashboard();

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
        {loadingIntelligence ? (
        <section className="tt-home-panel tt-home-loading">🧠 Checking your TinyTitans workspace…</section>
      ) : snakes.length === 0 ? (
        <section className="tt-home-panel tt-home-empty">
          <div><p className="tt-home-kicker">🐍 YOUR FIRST REPTILE</p><h2>No animals added yet</h2><p>Add your first animal and Home will become personalised around its records, care and trends.</p></div>
          <Link className="tt-home-primary" to="/snakes/new">＋ Add your first animal</Link>
        </section>
      ) : (
        <HomeCurrentAnimalSection
          selectedSnake={selectedSnake}
          selectedSnakeRecords={selectedSnakeRecords}
          selectedIndex={selectedIndex}
          snakeCount={snakes.length}
          intelligenceAccess={intelligenceAccess}
          attentionDecision={attentionDecision}
          selectedIntelligence={selectedIntelligence}
          coverage={coverage}
          onMove={moveSnake}
        />
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
            <TitanDecisionWhyCard decision={attentionD      <HomeAttentionSection
        intelligenceAccess={intelligenceAccess}
        accessChecked={accessChecked}
        coverage={coverage}
        quietIntelligenceSnippet={quietIntelligenceSnippet}
        attentionDecision={attentionDecision}
      />

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
        <details
          className="tt-home-disclosure tt-home-secondary-disclosure"
          onToggle={(event) => setWorldOpen(event.currentTarget.open)}
        >
          <summary>🌎 The TinyTitans world</summary>
          {worldOpen && (
            <Suspense fallback={<HomeGlobeFallback />}>
              <TinyTitansPinnacleGlobe uid={user.uid} />
            </Suspense>
          )}
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
