import { useEffect, useMemo, useState } from "react";
import PwaInstallCard from "../components/PwaInstallCard";
import TitanGoalTracker from "../components/TitanGoalTracker";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import { getDashboardIntelligence, type SnakeIntelligence } from "../services/snakeIntelligenceService";
import "./Home.css";

type HomeSnake = { id: string; name: string };
function confidenceLabel(value: SnakeIntelligence["confidence"]): string { return value === "High" ? "High" : value === "Moderate" ? "Moderate" : value === "Low" ? "Low" : "More data needed"; }

function Home() {
  const { user, profile } = useAuth();
  const [snakes, setSnakes] = useState<HomeSnake[]>([]);
  const [intelligence, setIntelligence] = useState<SnakeIntelligence[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [intelligenceAccess, setIntelligenceAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const displayName = profile?.displayName || user?.displayName || "Tiny Titan";
  const learningLabel = profile?.learningLevel === "explorer" ? "Explorer" : profile?.learningLevel === "learner" ? "Learner" : profile?.learningLevel === "student" ? "Student" : "Adult";
  const experience = profile?.experienceLevel === "pro" ? "Advanced" : profile?.experienceLevel === "intermediate" ? "Intermediate" : "Beginner";

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingIntelligence(true);
    setAccessChecked(false);
    void Promise.all([hasFullIntelligenceAccess(user.uid), getUserSnakes(user.uid)]).then(async ([hasAccess, records]) => {
      if (!active) return;
      setIntelligenceAccess(hasAccess);
      setAccessChecked(true);
      const minimal = records.map((snake) => ({ id: snake.id, name: snake.name }));
      setSnakes(minimal);
      setSelectedSnakeId((current) => minimal.some((snake) => snake.id === current) ? current : minimal[0]?.id ?? "");
      if (!hasAccess) {
        setIntelligence([]);
        return;
      }
      const insights = await getDashboardIntelligence(user.uid, minimal.map((snake) => snake.id));
      if (active) setIntelligence(insights);
    }).catch(() => { if (!active) return; setSnakes([]); setIntelligence([]); setIntelligenceAccess(false); setAccessChecked(true); }).finally(() => { if (active) setLoadingIntelligence(false); });
    return () => { active = false; };
  }, [user]);

  const selectedIntelligence = useMemo(() => intelligence.find((item) => item.snakeId === selectedSnakeId) ?? intelligence[0], [intelligence, selectedSnakeId]);
  const attention = useMemo(() => intelligence.flatMap((item) => item.priority && item.priority.tone === "attention" ? [{ ...item.priority, snakeId: item.snakeId, snakeName: item.snakeName }] : []).slice(0, 3), [intelligence]);
  const coverage = useMemo(() => intelligence.length ? Math.round(intelligence.reduce((sum, item) => sum + item.dataCoveragePercent, 0) / intelligence.length) : 0, [intelligence]);
  const totalRecords = useMemo(() => intelligence.reduce((sum, item) => sum + item.coverageMetrics.reduce((metricSum, metric) => metricSum + metric.records, 0), 0), [intelligence]);
  const selectedIndex = Math.max(0, snakes.findIndex((snake) => snake.id === selectedSnakeId));
  function moveSnake(direction: -1 | 1) { if (!snakes.length) return; const next = (selectedIndex + direction + snakes.length) % snakes.length; setSelectedSnakeId(snakes[next].id); }

  return <main className="dashboard tt-home">
    <section className="tt-home-hero"><div><p className="tt-home-eyebrow">TINY TITANS · YOUR KEEPER COMMAND CENTRE</p><h1>Good day, {displayName} 👋</h1><p>One calm place for what matters now. Tiny Titans learns from the records you create rather than throwing every feature at you at once.</p></div><div className="tt-home-profile"><span>{experience} keeper</span><strong>{snakes.length} {snakes.length === 1 ? "Tiny Titan" : "Tiny Titans"}</strong><small>{learningLabel} learning mode</small></div></section>
    <PwaInstallCard />
    <TitanGoalTracker compact />
    <section className="tt-home-section"><div className="tt-home-heading"><div><p className="tt-home-kicker">🐍 YOUR CURRENT TITAN</p><h2>What should you look at first?</h2></div><a href="/snakes">View all snakes →</a></div>{loadingIntelligence ? <div className="tt-home-panel tt-home-loading">🧠 Checking your intelligence access…</div> : snakes.length === 0 ? <div className="tt-home-panel"><h3>No Tiny Titans yet</h3><p>Add your first snake and Home will become personalised around its records.</p><a className="tt-home-primary" href="/snakes/new">➕ Add your first snake</a></div> : <div className="tt-snake-focus"><button type="button" className="tt-snake-arrow" onClick={() => moveSnake(-1)} aria-label="Previous snake">‹</button><div className="tt-snake-focus-main"><div><span className="tt-home-kicker">SELECTED SNAKE</span><h3>{snakes[selectedIndex]?.name}</h3></div><div className="tt-snake-status">{intelligenceAccess ? (selectedIntelligence?.priority?.tone === "attention" ? "🟠 Worth checking" : "🟢 Tracking normally") : "🔒 Core tracking only"}</div><p>{intelligenceAccess ? (selectedIntelligence?.summary ?? "Tiny Titans is building this snake's individual baseline.") : "Your normal husbandry records remain available. Full intelligent analysis is paused until you choose to contribute eligible data to the Tiny Titans intelligence system."}</p><div className="tt-snake-actions"><a href={`/snakes/${snakes[selectedIndex]?.id}/master-record`}>📋 Master Record</a><a href={`/snakes/${snakes[selectedIndex]?.id}/husbandry`}>🌡️ Husbandry</a><a href={`/snakes/${snakes[selectedIndex]?.id}/weights`}>⚖️ Weight</a><a href={`/snakes/${snakes[selectedIndex]?.id}/feeding`}>🍽️ Feeding</a></div></div><button type="button" className="tt-snake-arrow" onClick={() => moveSnake(1)} aria-label="Next snake">›</button></div>}</section>
    <section className="tt-home-section"><div className="tt-home-heading"><div><p className="tt-home-kicker">🧠 INTELLIGENCE</p><h2>Needs your attention</h2></div><span>{intelligenceAccess ? `${coverage}% data coverage` : "🔒 Paused"}</span></div>{!accessChecked ? <div className="tt-home-panel tt-home-loading">Checking intelligence access…</div> : !intelligenceAccess ? <div className="tt-home-panel"><strong>🔒 Intelligent analysis is currently paused.</strong><p>Your core tracking is still available. Enable community data contribution in Data &amp; Privacy whenever you want to unlock full Keeper Intelligence.</p><a href="/account/data-privacy">Review Data &amp; Privacy →</a></div> : attention.length === 0 ? <div className="tt-home-panel tt-home-good"><strong>🟢 Nothing needs your attention right now.</strong><p>Perfect. Tiny Titans will only surface an observation when your own records give it a useful reason.</p></div> : <div className="tt-attention-grid">{attention.map((item) => <article className="tt-home-panel tt-attention-card" key={`${item.snakeId}-${item.id}`}><span>{item.snakeName} · {item.category}</span><h3>{item.title}</h3><strong>{item.value}</strong><p><b>Why:</b> {item.why}</p><p><b>Next:</b> {item.action}</p><small>◉ {confidenceLabel(item.confidence)} confidence</small><a href={`/snakes/${item.snakeId}/master-record`}>Open {item.snakeName}'s record →</a></article>)}</div>}</section>
    <section className="tt-home-section"><div className="tt-home-heading"><div><p className="tt-home-kicker">📊 COLLECTION SNAPSHOT</p><h2>Your records</h2></div><a href="/snakes">Open collection →</a></div><div className="tt-home-stats"><a href="/snakes"><strong>{snakes.length}</strong><span>🐍 Snakes</span></a><a href="/weights"><strong>{intelligence.reduce((sum, item) => sum + (item.coverageMetrics.find((metric) => metric.key === "weight")?.records ?? 0), 0)}</strong><span>⚖️ Weight records</span></a><a href="/feeding"><strong>{intelligence.reduce((sum, item) => sum + (item.coverageMetrics.find((metric) => metric.key === "feeding")?.records ?? 0), 0)}</strong><span>🍽️ Feeding records</span></a><a href="/shedding"><strong>{intelligence.reduce((sum, item) => sum + (item.coverageMetrics.find((metric) => metric.key === "shedding")?.records ?? 0), 0)}</strong><span>🐍 Shed records</span></a><a href="/husbandry"><strong>{intelligenceAccess ? totalRecords : 0}</strong><span>{intelligenceAccess ? "🧠 Records analysed" : "🔒 Intelligence records"}</span></a></div></section>
    <section className="tt-home-section"><div className="tt-home-heading"><div><p className="tt-home-kicker">⚡ QUICK ACTIONS</p><h2>Log something</h2></div></div><div className="tt-quick-actions"><a href="/weights">⚖️ Log weight</a><a href="/feeding">🍽️ Log feeding</a><a href="/shedding">🐍 Record shed</a><a href="/husbandry">🌡️ Log husbandry</a><a href="/snakes/new">➕ Add snake</a></div></section>
    <section className="tt-home-section tt-home-lower-grid"><article className="tt-home-panel">{intelligenceAccess ? <><p className="tt-home-kicker">🧠 KEEPER INTELLIGENCE</p><h3>Your records become useful patterns</h3><p>Weights, feeding, shedding and husbandry data work together. Tiny Titans deliberately keeps the confidence transparent and never turns data coverage into a health score.</p><a href={selectedIntelligence ? `/snakes/${selectedIntelligence.snakeId}/husbandry` : "/husbandry"}>Open Intelligence →</a></> : <><p className="tt-home-kicker">🔒 KEEPER INTELLIGENCE</p><h3>Intelligent tracking is currently paused</h3><p>Your normal tracking remains fully available. Choose to contribute eligible husbandry data to unlock intelligent patterns, correlations and community-powered insights.</p><a href="/account/data-privacy">Review Data &amp; Privacy →</a></>}</article><article className="tt-home-panel"><p className="tt-home-kicker">🎓 LEARNING</p><h3>Keep building your knowledge</h3><p>Your learning level changes how Tiny Titans presents information without changing the underlying scientific facts.</p><a href="/challenge">Continue Titans Challenge →</a></article>{profile?.profileType === "educator" && <article className="tt-home-panel"><p className="tt-home-kicker">🧑‍🏫 EDUCATION</p><h3>Your teaching centre</h3><p>Create classrooms, lessons and learning activities.</p><a href="/educator">Open Educator Centre →</a></article>}<article className="tt-home-panel"><p className="tt-home-kicker">👨‍👩‍👧 FAMILY</p><h3>Shared care, controlled access</h3><p>Connect family members and manage what each account can view, edit or approve.</p><a href="/account/family">Open My Family →</a></article></section>
    <details className="tt-home-tools"><summary>🧰 Open the full Tiny Titans toolbox</summary><div className="tt-tool-grid"><a href="/morph-library">🧬 Morph Library</a><a href="/calculator">🧮 Genetics Calculator</a><a href="/sandbox">🧪 Sandbox</a><a href="/knowledge-base">📚 Knowledge Base</a><a href="/community">🌍 Community</a><a href="/account">⚙️ My Account</a></div></details>
  </main>;
}
export default Home;