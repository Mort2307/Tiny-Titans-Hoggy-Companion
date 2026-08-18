import { useEffect, useMemo, useState } from "react";
import DashboardCard from "../components/DashboardCard";
import PwaInstallCard from "../components/PwaInstallCard";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getDashboardIntelligence, type SnakeIntelligence } from "../services/snakeIntelligenceService";
import "./Home.css";

function confidenceLabel(value: SnakeIntelligence["confidence"]): string {
  return value === "High" ? "High confidence" : value === "Moderate" ? "Moderate confidence" : value === "Low" ? "Low confidence" : "Building baseline";
}

function Home() {
  const { user, profile } = useAuth();
  const [snakes, setSnakes] = useState<{ id: string; name: string }[]>([]);
  const [intelligence, setIntelligence] = useState<SnakeIntelligence[]>([]);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const displayName = profile?.displayName || user?.displayName || "Tiny Titan";
  const experience = profile?.experienceLevel === "pro" ? "Advanced" : profile?.experienceLevel === "intermediate" ? "Intermediate" : "Beginner";
  const profileLabel = profile?.profileType === "educator" ? "Educator" : profile?.profileType === "learner" ? "Learner" : profile?.profileType === "professional" ? "Professional" : "Keeper";
  const learningLabel = profile?.learningLevel === "explorer" ? "Explorer" : profile?.learningLevel === "learner" ? "Learner" : profile?.learningLevel === "student" ? "Student" : "Adult";

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingIntelligence(true);
    void getUserSnakes(user.uid)
      .then(async (records) => {
        if (!active) return;
        const minimal = records.map((snake) => ({ id: snake.id, name: snake.name }));
        setSnakes(minimal);
        const insights = await getDashboardIntelligence(user.uid, minimal.map((snake) => snake.id));
        if (active) setIntelligence(insights);
      })
      .catch(() => {
        if (!active) return;
        setSnakes([]);
        setIntelligence([]);
      })
      .finally(() => {
        if (active) setLoadingIntelligence(false);
      });
    return () => { active = false; };
  }, [user]);

  const priorityInsights = useMemo(() => intelligence
    .map((item) => item.priority ? { ...item.priority, snakeName: item.snakeName, snakeId: item.snakeId } : null)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => (a.tone === "attention" ? -1 : b.tone === "attention" ? 1 : 0))
    .slice(0, 3), [intelligence]);

  const totalCoveragePercent = useMemo(() => {
    if (!intelligence.length) return 0;
    return Math.round(intelligence.reduce((sum, item) => sum + item.dataCoveragePercent, 0) / intelligence.length);
  }, [intelligence]);

  return <div className="dashboard">
    <section className="welcome-card">
      <div className="welcome-content">
        <p className="welcome-eyebrow">TINY TITANS · PERSONAL COMMAND CENTRE</p>
        <h2>Welcome back, {displayName}.</h2>
        <p>Tiny Titans is building its understanding from the records you create. The more useful history you record, the more individual your companion becomes.</p>
      </div>
      <div className="profile-summary">
        <div className="profile-level"><span>Experience</span><strong>{experience}</strong></div>
        <div className="profile-category"><span>Profile</span><strong>{profileLabel}</strong></div>
        <div className="profile-category"><span>Learning</span><strong>{learningLabel}</strong></div>
        <div className="profile-category"><span>Snakes</span><strong>{snakes.length || "—"}</strong></div>
      </div>
    </section>

    <PwaInstallCard />

    <section className="dashboard-section tt-dashboard-intelligence">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">INTELLIGENCE</p>
          <h3>What matters right now</h3>
        </div>
        <p className="section-subtitle">Personalised from your animals' own records.</p>
      </div>

      {loadingIntelligence ? <section className="tt-intelligence-panel" aria-live="polite"><p className="tt-intelligence-kicker">Learning your records</p><h4 className="tt-intelligence-title">Building today's view…</h4><p className="tt-intelligence-meta">Tiny Titans is reading the individual history already recorded for your snakes.</p></section>
        : <>
          <section className="tt-intelligence-panel tt-coverage-panel">
            <div className="tt-coverage-heading"><div><p className="tt-intelligence-kicker">OVERALL INTELLIGENCE COVERAGE</p><h4 className="tt-intelligence-title">{totalCoveragePercent}% of the core personal-history baseline built</h4></div><strong className="tt-coverage-value">{totalCoveragePercent}%</strong></div>
            <div className="tt-coverage-track" role="progressbar" aria-label="Overall intelligence data coverage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={totalCoveragePercent}><span style={{ width: `${totalCoveragePercent}%` }} /></div>
            <p className="tt-intelligence-meta">This is a transparent data-coverage percentage, not a health score. It represents how much useful weight, feeding and shed history Tiny Titans currently has across your snakes. More real records make the individual intelligence stronger.</p>
          </section>

          {priorityInsights.length === 0 ? <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">Baseline mode</p><h4 className="tt-intelligence-title">Nothing needs your attention right now.</h4><p className="tt-intelligence-meta">That's a good thing. As you record weights, feeds, sheds and observations, Tiny Titans will only surface patterns when your own data gives it a useful reason.</p><a className="tt-intelligence-action" href="/snakes">Open My Snakes →</a></section>
            : <div className="tt-intelligence-grid">{priorityInsights.map((item) => <article className="tt-intelligence-panel" data-tone={item.tone} key={`${item.snakeId}-${item.id}`}>
              <p className="tt-intelligence-kicker">{item.snakeName} · {item.category}</p>
              <h4 className="tt-intelligence-title">{item.title}</h4>
              <strong className="tt-intelligence-value">{item.value}</strong>
              <p className="tt-intelligence-meta"><b>Why:</b> {item.why}</p>
              <p className="tt-intelligence-meta"><b>Next:</b> {item.action}</p>
              <span className="tt-confidence">◉ {confidenceLabel(item.confidence)}</span>
              <a className="tt-intelligence-action" href={`/snakes/${item.snakeId}/master-record`}>Open {item.snakeName}'s record →</a>
            </article>)}</div>}
        </>}
    </section>

    {profile?.profileType === "educator" && <section className="dashboard-section"><div className="section-heading"><div><p className="section-eyebrow">EDUCATION</p><h3>Your teaching centre</h3></div></div><section className="dashboard-grid"><DashboardCard icon="🧑‍🏫" title="Educator Centre" description="Create classrooms, plan lessons and manage teaching activities" link="/educator" /></section></section>}

    <section className="dashboard-section"><div className="section-heading"><div><p className="section-eyebrow">TINY TITANS</p><h3>Your tools</h3></div></div><section className="dashboard-grid">
      <DashboardCard icon="🐍" title="My Hoggies" description="Manage your snakes, genetics, weights and personal records" link="/snakes" />
      <DashboardCard icon="🍽️" title="Feeding Tracker" description="Track meals and let Tiny Titans learn each snake's individual feeding pattern" link="/feeding" />
      <DashboardCard icon="⚖️" title="Weight Records" description="Track growth and build each snake's personal baseline" link="/weights" />
      <DashboardCard icon="💧" title="Shed Tracker" description="Record sheds and build an individual shed rhythm" link="/shedding" />
      <DashboardCard icon="🥚" title="Breeding Planner" description="Manage pairings, genetics and breeding projects" link="/breeding" />
      <DashboardCard icon="🧬" title="Morph Library" description="Explore Western Hognose morphs and genetics" link="/morph-library" />
      <DashboardCard icon="🧮" title="Genetics Calculator" description="Explore inheritance and understand the outcome" link="/calculator" />
      <DashboardCard icon="📚" title="Knowledge Base" description="Learn about Western Hognose husbandry and behaviour" link="/knowledge-base" />
      <DashboardCard icon="🧠" title="Titans Challenge" description="Learn by topic, master every bank and earn badges" link="/challenge" />
    </section></section>
  </div>;
}

export default Home;
