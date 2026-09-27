import TinyTitansIcon from "../components/TinyTitansIcon";
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

  return (
    <main className="dashboard tt-home">
      <header className="tt-home-brandbar">
        <div>
          <p className="tt-home-brand"><TinyTitansIcon name="animals" size={22} /> Tiny Titans Keeper Companion</p>
          <p className="tt-home-tagline">Your keeper companion, records, learning and intelligence — in one calm place.</p>
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
          <h1>Good {world.localTimePeriod}, {displayName}</h1>
          <p>Here is the information most worth seeing first. Everything else is one tap away when you need it.</p>
        </div>
        <div className="tt-home-mode">
          <span className="tt-home-learning-label"><TinyTitansIcon name="titan" size={18} /> {learningLabel} learning</span>
          <small>{intelligenceAccess ? "Intelligence enabled" : "Keeper records only"}</small>
        </div>
      </section>

      {loadingIntelligence ? (
        <section className="tt-home-panel tt-home-loading"><TinyTitansIcon name="titan" size={22} /> Checking your TinyTitans workspace…</section>
      ) : snakes.length === 0 ? (
        <section className="tt-home-panel tt-home-empty">
          <div>
            <p className="tt-home-kicker"><TinyTitansIcon name="animals" size={17} /> YOUR FIRST ANIMAL</p>
            <h2>No animals added yet</h2>
            <p>Add your first animal and Home will become personalised around its records, care and trends.</p>
          </div>
          <Link className="tt-home-primary" to="/animals"><TinyTitansIcon name="add" size={20} /> Add your first animal</Link>
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

      <HomeAttentionSection
        intelligenceAccess={intelligenceAccess}
        accessChecked={accessChecked}
        coverage={coverage}
        quietIntelligenceSnippet={quietIntelligenceSnippet}
        attentionDecision={attentionDecision}
      />

      <section className="tt-home-section">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker"><TinyTitansIcon name="titan" size={17} /> QUICK ACTIONS</p>
            <h2>Log something</h2>
          </div>
        </div>
        <div className="tt-quick-actions">
          <Link className="is-primary" to="/weights"><span><TinyTitansIcon name="weight" size={30} /></span><strong>Weight</strong><small>Record measurement</small></Link>
          <Link to="/feeding"><span><TinyTitansIcon name="feeding" size={30} /></span><strong>Feeding</strong><small>Log a feed</small></Link>
          <Link to="/shedding"><span><TinyTitansIcon name="shed" size={30} /></span><strong>Shed</strong><small>Record a stage</small></Link>
          <Link to="/husbandry"><span><TinyTitansIcon name="husbandry" size={30} /></span><strong>Environment</strong><small>Log conditions</small></Link>
          <Link to="/animals"><span><TinyTitansIcon name="add" size={30} /></span><strong>Add animal</strong><small>Grow your collection</small></Link>
        </div>
      </section>

      <section className="tt-home-section">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker"><TinyTitansIcon name="weight" size={17} /> AT A GLANCE</p>
            <h2>Your records</h2>
          </div>
          <Link to="/animals">Open collection <TinyTitansIcon name="forward" size={14} /></Link>
        </div>
        <div className="tt-home-stats">
          <Link to="/animals"><strong>{snakes.length}</strong><span><TinyTitansIcon name="reptile" size={16} /> Animals</span></Link>
          <Link to="/weights"><strong>{snapshot.weights}</strong><span><TinyTitansIcon name="weight" size={16} /> Weight</span></Link>
          <Link to="/feeding"><strong>{snapshot.feedings}</strong><span><TinyTitansIcon name="feeding" size={16} /> Feeding</span></Link>
          <Link to="/shedding"><strong>{snapshot.sheds}</strong><span><TinyTitansIcon name="shed" size={16} /> Shed</span></Link>
          <Link to="/health"><strong>{snapshot.health}</strong><span><TinyTitansIcon name="vet" size={16} /> Health</span></Link>
        </div>
        {!intelligenceAccess && snakes.length > 0 && (
          <p className="tt-home-snapshot-note">Counts come directly from your recorded history and do not depend on Intelligence consent.</p>
        )}
      </section>

      <section className="tt-home-section">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker"><TinyTitansIcon name="search" size={17} /> EXPLORE</p>
            <h2>Go deeper when you need it</h2>
          </div>
        </div>
        <div className="tt-home-explore-grid">
          <Link to="/morph-library"><span><TinyTitansIcon name="genetics" size={25} /></span><div><strong>Genetics Library</strong><small>Canonical morph identities and recognised combinations.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/husbandry"><span><TinyTitansIcon name="husbandry" size={25} /></span><div><strong>Husbandry Library</strong><small>Species-aware care, enclosure and environmental guidance.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/behaviour-observatory"><span><TinyTitansIcon name="observatory" size={25} /></span><div><strong>Behaviour Observatory</strong><small>Keeper observations, theories and evidence.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/community"><span><TinyTitansIcon name="community" size={25} /></span><div><strong>Titan Community</strong><small>Contributions, shared learning and community intelligence.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/challenge"><span><TinyTitansIcon name="challenge" size={25} /></span><div><strong>Titans Challenge</strong><small>Keep building your animal-keeping knowledge at your own level.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/account/family"><span><TinyTitansIcon name="family" size={25} /></span><div><strong>My Family</strong><small>Shared care with controlled access.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
        </div>
      </section>

      <section className="tt-home-lower-grid">
        <article className="tt-home-panel">
          <p className="tt-home-kicker"><TinyTitansIcon name="academy" size={17} /> LEARNING MODE</p>
          <h3>{learningLabel} learning</h3>
          <p>Your learning level changes how TinyTitans presents information without changing the underlying scientific facts.</p>
          <Link to="/account/personalise">Tune learning <TinyTitansIcon name="forward" size={14} /></Link>
        </article>
        <article className="tt-home-panel">
          <p className="tt-home-kicker"><TinyTitansIcon name="reptile" size={17} /> SPECIES-AWARE CONTEXT</p>
          <h3>Content stays attached to the animal</h3>
          <p>Care, safety and genetics surfaces remain species-aware across the animals you keep.</p>
          <Link to="/animals">Manage animals <TinyTitansIcon name="forward" size={14} /></Link>
        </article>
      </section>

      <section className="tt-home-secondary">
        <PwaInstallCard />
        <TitanGoalTracker compact />
      </section>

      <details className="tt-home-disclosure tt-home-secondary-disclosure">
        <summary><TinyTitansIcon name="genetics" size={17} /> Recommended genetics</summary>
        <RecommendedFeed />
      </details>

      <details className="tt-home-disclosure tt-home-secondary-disclosure">
        <summary><TinyTitansIcon name="community" size={17} /> Titan community pulse</summary>
        <ContributionPulse />
      </details>

      {user && (
        <details
          className="tt-home-disclosure tt-home-secondary-disclosure"
          onToggle={(event) => setWorldOpen(event.currentTarget.open)}
        >
          <summary><TinyTitansIcon name="community" size={17} /> The TinyTitans world</summary>
          {worldOpen && (
            <Suspense fallback={<HomeGlobeFallback />}>
              <TinyTitansPinnacleGlobe uid={user.uid} />
            </Suspense>
          )}
        </details>
      )}

      <details className="tt-home-tools">
        <summary><TinyTitansIcon name="menu" size={17} /> Open the full TinyTitans toolbox</summary>
        <div className="tt-tool-grid">
          <Link to="/morph-library"><TinyTitansIcon name="morph" size={18} /> Morph Library</Link>
          <Link to="/calculator"><TinyTitansIcon name="genetics" size={18} /> Genetics Calculator</Link>
          <Link to="/sandbox"><TinyTitansIcon name="testing" size={18} /> Sandbox</Link>
          <Link to="/knowledge-base"><TinyTitansIcon name="knowledge" size={18} /> Knowledge Base</Link>
          <Link to="/community"><TinyTitansIcon name="community" size={18} /> Community</Link>
          <Link to="/account"><TinyTitansIcon name="account" size={18} /> My Account</Link>
          <Link to="/report-bug"><TinyTitansIcon name="testing" size={18} /> Report a bug</Link>
          <Link to="/feedback"><TinyTitansIcon name="messages" size={18} /> Feedback</Link>
        </div>
      </details>
    </main>
  );
}

export default Home;
