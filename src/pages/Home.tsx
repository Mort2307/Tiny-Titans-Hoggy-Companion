import TinyTitansIcon from "../components/TinyTitansIcon";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PwaInstallCard from "../components/PwaInstallCard";
import TitanGoalTracker from "../components/TitanGoalTracker";
import HomeCurrentAnimalSection from "../components/Home/HomeCurrentAnimalSection";
import HomeAttentionSection from "../components/Home/HomeAttentionSection";
import TitanAtAGlance from "../components/TitanAtAGlance/TitanAtAGlance";
import { useHomeDashboard } from "../hooks/useHomeDashboard";
import { FOUNDING_FOLLOWER_CAMPAIGN } from "../config/foundingFollowerReward";
import { subscribeToMyFoundingFollowerClaim, type FoundingFollowerClaim } from "../services/foundingFollowerRewardService";

import "./Home.css";

const RecommendedFeed = lazy(() => import("../components/RecommendedFeed"));
const ContributionPulse = lazy(() => import("../components/ContributionPulse"));
const TinyTitansPinnacleGlobe = lazy(() => import("../components/TinyTitansPinnacleGlobe"));

const HomeGlobeFallback = () => <section className="tt-home-panel">Loading the TinyTitans world…</section>;

function Home() {
  const {
    user, world, displayName, learningLabel, experience, snakes, attentionDecision, urgentReminder, selectedIntelligence,
    selectedSnake, selectedIndex, selectedSnakeRecords, coverage, snapshot, quietIntelligenceSnippet,
    loadingIntelligence, loadError, retryLoad, intelligenceAccess, accessChecked, worldOpen, setWorldOpen, moveSnake,
  } = useHomeDashboard();
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  const [communityPulseOpen, setCommunityPulseOpen] = useState(false);
  const [foundingFollowerClaim, setFoundingFollowerClaim] = useState<FoundingFollowerClaim | null>(null);
  const [foundingFollowerClaimChecked, setFoundingFollowerClaimChecked] = useState(false);

  useEffect(() => {
    setFoundingFollowerClaimChecked(false);
    if (!user?.uid || !FOUNDING_FOLLOWER_CAMPAIGN.enabled) {
      setFoundingFollowerClaim(null);
      setFoundingFollowerClaimChecked(true);
      return;
    }
    return subscribeToMyFoundingFollowerClaim(user.uid, (claim) => {
      setFoundingFollowerClaim(claim);
      setFoundingFollowerClaimChecked(true);
    });
  }, [user?.uid]);

  const showFollowerRewardCta = foundingFollowerClaimChecked && FOUNDING_FOLLOWER_CAMPAIGN.enabled && (!foundingFollowerClaim || foundingFollowerClaim.status === "rejected");

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
            <small>{experience} keeper · {loadError ? "records unavailable" : snakes.length + (snakes.length === 1 ? " animal" : " animals")}</small>
          </span>
          <span aria-hidden="true"><TinyTitansIcon name="forward" size={14} /></span>
        </Link>
      </header>

      <section className="tt-home-welcome">
        <div>
          <p className="tt-home-eyebrow">{world.localDateKey} · {world.timezone}</p>
          <h1>Good {world.localTimePeriod}, {displayName}</h1>
          <p>Your animals, your world, your next adventure.</p>
        </div>
        <div className="tt-home-mode">
          <span className="tt-home-learning-label"><TinyTitansIcon name="titan" size={18} /> {learningLabel} learning</span>
          <small>{intelligenceAccess ? "Intelligence enabled" : "Keeper records only"}</small>
        </div>
      </section>

      {loadError && <section className="tt-home-panel" role="alert"><h2>Keeper records unavailable</h2><p>{loadError}</p><button className="universal-primary-action" type="button" onClick={retryLoad}>Try loading again</button></section>}
      {urgentReminder && !loadingIntelligence && (
        <HomeAttentionSection intelligenceAccess={intelligenceAccess} accessChecked={accessChecked} coverage={coverage}
          quietIntelligenceSnippet={quietIntelligenceSnippet} attentionDecision={attentionDecision} urgentReminder={urgentReminder} />
      )}
      {snakes.length > 0 && <TitanAtAGlance />}

      {showFollowerRewardCta && (
        <Link
          className={`tt-home-follower-reward${foundingFollowerClaim?.status === "rejected" ? " is-retry" : ""}`}
          to="/founding-followers"
          aria-label={foundingFollowerClaim?.status === "rejected" ? "Fix your Followers 1 Month Free claim" : "Claim Followers 1 Month Free"}
        >
          <span className="tt-home-follower-reward__icon" aria-hidden="true"><TinyTitansIcon name="plans" size={24} /></span>
          <span className="tt-home-follower-reward__copy">
            <span className="tt-home-follower-reward__eyebrow">FOLLOWERS 1 MONTH FREE</span>
            <strong>{foundingFollowerClaim?.status === "rejected" ? "Your follow proof needs another look" : "Claim 30 days of Titan Pro free"}</strong>
            <small>{foundingFollowerClaim?.status === "rejected" ? "Upload a clearer Facebook or Instagram follow screenshot." : "Follow Tiny Titans on Facebook or Instagram, then verify it with one screenshot."}</small>
          </span>
          <span className="tt-home-follower-reward__action">
            {foundingFollowerClaim?.status === "rejected" ? "Fix claim" : "Claim free month"}
            <TinyTitansIcon name="forward" size={15} />
          </span>
        </Link>
      )}

      {!loadingIntelligence && snakes.length > 0 && !urgentReminder && Boolean(attentionDecision) && (
        <HomeAttentionSection
          intelligenceAccess={intelligenceAccess}
          accessChecked={accessChecked}
          coverage={coverage}
          quietIntelligenceSnippet={quietIntelligenceSnippet}
          attentionDecision={attentionDecision}
          urgentReminder={urgentReminder}
        />
      )}

      {loadingIntelligence ? (
        <section className="tt-home-panel tt-home-loading"><TinyTitansIcon name="titan" size={22} /> Checking your TinyTitans workspace…</section>
      ) : loadError ? null : snakes.length === 0 ? (
        <section className="tt-home-panel tt-home-empty">
          <div>
            <p className="tt-home-kicker"><TinyTitansIcon name="animals" size={17} /> YOUR FIRST ANIMAL</p>
            <h2>Start with your first animal</h2>
            <p>Add one animal and Tiny Titans will shape Home around its care, records and routines.</p>
          </div>
          <Link className="tt-home-primary" to="/animals#add-animal"><TinyTitansIcon name="add" size={20} /> Add your first animal</Link>
        </section>
      ) : (
        <details className="tt-home-animal-details">
          <summary><TinyTitansIcon name="reptile" size={18} /> Animal snapshot <strong>{selectedSnake?.name}</strong><span>View profile and latest records</span></summary>
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
        </details>
      )}

      {snakes.length > 0 && (
        <>
          <details className="tt-home-records-disclosure">
            <summary><TinyTitansIcon name="analytics" size={19} /> Your collection activity <strong>{snakes.length} animals</strong></summary>
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
          </details>

        </>
      )}

      <section className="tt-home-section tt-home-discover">
        <div className="tt-home-heading">
          <div>
            <p className="tt-home-kicker"><TinyTitansIcon name="search" size={17} /> DISCOVER</p>
            <h2>Explore Tiny Titans</h2>
          </div>
        </div>
        <div className="tt-home-explore-grid">
          <Link to="/morph-library"><span><TinyTitansIcon name="genetics" size={25} /></span><div><strong>Genetics Library</strong><small>Canonical morph identities and recognised combinations.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/husbandry"><span><TinyTitansIcon name="husbandry" size={25} /></span><div><strong>Husbandry Library</strong><small>Species-aware care, enclosure and environmental guidance.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/husbandry/safety"><span><TinyTitansIcon name="check" size={25} /></span><div><strong>Can I use this?</strong><small>Check leaves, substrates, plants and enclosure materials against species-aware safety evidence.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
        </div>
        <details className="tt-home-discover-more"><summary><TinyTitansIcon name="titan" size={17} /> More to explore</summary><div className="tt-home-explore-grid">
          <Link to="/behaviour-observatory"><span><TinyTitansIcon name="observatory" size={25} /></span><div><strong>Behaviour Observatory</strong><small>Keeper observations, theories and evidence.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/community"><span><TinyTitansIcon name="community" size={25} /></span><div><strong>Titan Community</strong><small>Contributions, shared learning and community intelligence.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/challenge"><span><TinyTitansIcon name="challenge" size={25} /></span><div><strong>Titans Challenge</strong><small>Keep building your animal-keeping knowledge at your own level.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
          <Link to="/account/family"><span><TinyTitansIcon name="family" size={25} /></span><div><strong>My Family</strong><small>Shared care with controlled access.</small></div><b><TinyTitansIcon name="forward" size={16} /></b></Link>
        </div></details>
      </section>

      <details className="tt-home-extras"><summary><TinyTitansIcon name="titan" size={17} /> Keeper extras and app tools</summary><section className="tt-home-secondary">
        <PwaInstallCard />
        <TitanGoalTracker compact />
      </section></details>

      <details className="tt-home-disclosure tt-home-secondary-disclosure" onToggle={(event) => setRecommendedOpen(event.currentTarget.open)}>
        <summary><TinyTitansIcon name="genetics" size={17} /> Recommended genetics</summary>
        {recommendedOpen && <Suspense fallback={<section className="tt-home-panel tt-home-loading">Loading genetics recommendations…</section>}><RecommendedFeed /></Suspense>}
      </details>

      <details className="tt-home-disclosure tt-home-secondary-disclosure" onToggle={(event) => setCommunityPulseOpen(event.currentTarget.open)}>
        <summary><TinyTitansIcon name="community" size={17} /> Titan community pulse</summary>
        {communityPulseOpen && <Suspense fallback={<section className="tt-home-panel tt-home-loading">Loading community pulse…</section>}><ContributionPulse /></Suspense>}
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
