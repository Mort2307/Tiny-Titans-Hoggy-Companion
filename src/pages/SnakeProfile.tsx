import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Snake } from "../types/Snake";
import { migrateSnake } from "../utils/snakeMigration";
import { getWeightReminder } from "../utils/weightReminder";
import { getUserSnake, deleteUserSnake } from "../services/snakeService";
import { getSnakeIntelligence, type SnakeIntelligence } from "../services/snakeIntelligenceService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import { getCommunityBenchmarkDataset, getAgeBand, type CommunityBenchmarkDataset } from "../services/benchmarkIntelligenceService";
import { buildIntelligenceSummary, type IntelligenceSummary } from "../services/intelligenceSummaryService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import WeightMiniChart from "../components/WeightMiniChart";
import IntelligencePanel from "../components/IntelligencePanel";
import ExplainableIntelligenceSummary from "../components/ExplainableIntelligenceSummary";
import IntelligenceDataQualityPanel from "../components/IntelligenceDataQualityPanel";
import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import "../styles/snake-profile.css";

function SnakeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const { formatWeight } = useUnits();
  const [snake, setSnake] = useState<Snake | null>(null);
  const [loadingSnake, setLoadingSnake] = useState(true);
  const [intelligence, setIntelligence] = useState<SnakeIntelligence | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceAccess, setIntelligenceAccess] = useState<boolean | null>(null);
  const [benchmark, setBenchmark] = useState<CommunityBenchmarkDataset | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSnake() {
      if (loading || profileLoading) return;
      if (!user) { setError("You must be logged in to view this snake."); setLoadingSnake(false); return; }
      if (!id) { setError("No snake ID was supplied."); setLoadingSnake(false); return; }
      try {
        const loadedSnake = await getUserSnake(user.uid, id);
        if (cancelled) return;
        if (!loadedSnake) { setError("This snake could not be found in your Tiny Titans account."); setLoadingSnake(false); return; }
        const migrated = migrateSnake({ ...loadedSnake, id: loadedSnake.id || id });
        setSnake(migrated); setError(null); setLoadingSnake(false);
        const allowed = await hasFullIntelligenceAccess(user.uid).catch(() => false);
        if (cancelled) return;
        setIntelligenceAccess(allowed); if (!allowed) return;
        setIntelligenceLoading(true);
        const learned = await getSnakeIntelligence(user.uid, id).catch(() => null);
        if (!cancelled) setIntelligence(learned);
        setIntelligenceLoading(false);
        setBenchmarkLoading(true); setBenchmarkError("");
        const cohort = await getCommunityBenchmarkDataset({ species: migrated.species, sex: migrated.sex, morph: migrated.morphs?.[0], ageBand: getAgeBand(migrated.hatchDate) }).catch((benchmarkLoadError) => {
          if (!cancelled) setBenchmarkError(benchmarkLoadError instanceof Error ? benchmarkLoadError.message : "Community benchmark could not be loaded.");
          return null;
        });
        if (!cancelled) setBenchmark(cohort);
      } catch (loadError) {
        if (!cancelled) { console.error("Tiny Titans: unable to load snake profile", loadError); setError(loadError instanceof Error ? loadError.message : "Unable to load this snake. Please try again."); setLoadingSnake(false); }
      } finally {
        if (!cancelled) { setIntelligenceLoading(false); setBenchmarkLoading(false); }
      }
    }
    void loadSnake();
    return () => { cancelled = true; };
  }, [id, user, loading, profileLoading]);

  function calculateAge(date: string) {
    if (!date) return "-";
    const start = new Date(date);
    const now = new Date();
    if (Number.isNaN(start.getTime())) return "-";
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    if (years < 0) return "Not yet hatched";
    return [years ? `${years} year${years === 1 ? "" : "s"}` : "", months ? `${months} month${months === 1 ? "" : "s"}` : "", days ? `${days} day${days === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") || "0 days";
  }

  function calculateTimeWithKeeper(date?: string) {
    if (!date) return "Not recorded";
    const start = new Date(`${date}T12:00:00`);
    const now = new Date();
    if (Number.isNaN(start.getTime()) || start > now) return "Not recorded";
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    let days = now.getDate() - start.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    const years = Math.floor(months / 12);
    months %= 12;
    return [years ? `${years} Year${years === 1 ? "" : "s"}` : "", months ? `${months} Month${months === 1 ? "" : "s"}` : "", days ? `${days} Day${days === 1 ? "" : "s"}` : ""].filter(Boolean).join(" ") || "0 Days";
  }

  async function deleteSnake() {
    if (!snake || !user || !snake.id || deleting) return;
    setDeleting(true); setError(null);
    try { await deleteUserSnake(user.uid, snake.id); navigate("/snakes", { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete this snake. Please try again."); setDeleting(false); setConfirmDelete(false); }
  }
  function openSnakeEditor() { if (snake?.id) navigate(`/snakes/${snake.id}/edit`); }
  function openMasterRecord() { if (snake?.id) navigate(`/snakes/${snake.id}/master-record`); }

  if (loading || profileLoading || loadingSnake) return <div className="page-container"><BackHomeButton fallback="/snakes" /><h1>🐍 Loading Snake...</h1><div className="tracker-card"><p>Fetching the snake profile from Firebase.</p></div></div>;
  if (error || !snake) return <div className="page-container"><BackHomeButton fallback="/snakes" /><h1>🐍 Snake Not Found</h1><div className="tracker-card"><h3>{error ?? "This snake could not be found."}</h3><button type="button" onClick={() => navigate("/snakes")}>← Back to My Hoggies</button></div></div>;

  const reminder = getWeightReminder(snake);
  const weightHistory = snake.weightHistory ?? [];
  const summary: IntelligenceSummary | null = intelligenceAccess && benchmark ? buildIntelligenceSummary(snake, benchmark) : null;
  const morphText = snake.morphs?.length ? snake.morphs.join(", ") : "No morphs listed";
  const hetText = snake.hets?.length ? snake.hets.join(", ") : "No hets recorded";

  return (
    <div className="page-container snake-profile-page">
      <BackHomeButton fallback="/snakes" />
      <h1 className="snake-profile-heading">🐍 {snake.name}</h1>
      <section className="snake-profile-hero" aria-label={`${snake.name} profile summary`}>
        <div className="snake-profile-photo">{snake.photo ? <img src={snake.photo} alt={snake.name} /> : <div className="snake-profile-placeholder" aria-label="No snake photo">🐍</div>}</div>
        <div className="snake-profile-identity">
          <p className="snake-profile-identity-kicker">Tiny Titans Snake Profile</p>
          <h2>{snake.name}</h2>
          <p className="snake-profile-identity-subtitle">{snake.species} · {snake.sex}{snake.nickname ? ` · “${snake.nickname}”` : ""}</p>
          <div className="snake-profile-badges" aria-label="Key snake details">
            <span className="snake-profile-badge"><strong>Weight</strong>{snake.weight != null ? formatWeight(snake.weight) : "—"}</span>
            <span className="snake-profile-badge"><strong>Age</strong>{calculateAge(snake.hatchDate)}</span>
            <span className="snake-profile-badge"><strong>Time with keeper</strong>{calculateTimeWithKeeper(snake.arrivalDate)}</span>
            <span className="snake-profile-badge"><strong>Feeds</strong>{snake.feedingHistory?.length ?? 0}</span>
            <span className="snake-profile-badge"><strong>Sheds</strong>{snake.shedHistory?.length ?? 0}</span>
          </div>
          <p className="snake-profile-genetics-line"><strong>Genetics:</strong> {morphText}</p>
          <p className="snake-profile-genetics-line"><strong>Hets:</strong> {hetText}</p>
        </div>
      </section>

      <nav className="snake-profile-quickbar" aria-label={`${snake.name} quick actions`}>
        <button type="button" className="snake-profile-quick-primary" onClick={openMasterRecord}>📖<span className="snake-profile-quick-label">Master Record</span></button>
        <button type="button" onClick={() => navigate(`/weights/${snake.id}`)}>⚖️<span className="snake-profile-quick-label">Weight</span></button>
        <button type="button" onClick={() => navigate(`/feeding/${snake.id}`)}>🍽️<span className="snake-profile-quick-label">Feeding</span></button>
        <button type="button" onClick={() => navigate(`/shedding/${snake.id}`)}>🐍<span className="snake-profile-quick-label">Shed</span></button>
        <button type="button" onClick={() => navigate(`/behaviour/${snake.id}`)}>👀<span className="snake-profile-quick-label">Behaviour</span></button>
        <button type="button" onClick={() => navigate(`/health/${snake.id}`)}>🩺<span className="snake-profile-quick-label">Health & Vet</span></button>
        <button type="button" onClick={() => navigate(`/snakes/${snake.id}/timeline`)}>📅<span className="snake-profile-quick-label">Timeline</span></button>
        <button type="button" onClick={openSnakeEditor}>✏️<span className="snake-profile-quick-label">Edit</span></button>
        <button type="button" onClick={() => navigate(`/feeding/preparation?snakeId=${encodeURIComponent(snake.id)}`)}>⏰<span className="snake-profile-quick-label">Reminders</span></button>
      </nav>

      <section className="snake-profile-overview-grid" aria-label={`${snake.name} profile details`}>
        <button type="button" className="snake-profile-card" onClick={openSnakeEditor}><div className="snake-profile-card-icon">📋</div><h2>Basic Information</h2><p><strong>{snake.species}</strong></p><p>{snake.sex}</p>{snake.nickname && <p>“{snake.nickname}”</p>}{snake.arrivalDate && <p>Arrived {snake.arrivalDate}</p>}</button>
        <button type="button" className="snake-profile-card" onClick={openSnakeEditor}><div className="snake-profile-card-icon">🧬</div><h2>Genetics</h2><p><strong>{morphText}</strong></p><p>{snake.hets?.length ?? 0} het{snake.hets?.length !== 1 ? "s" : ""}</p>{snake.customMorph && <p>{snake.customMorph}</p>}</button>
        <button type="button" className="snake-profile-card" onClick={() => navigate(`/weights/${snake.id}`)}><div className="snake-profile-card-icon">⚖️</div><h2>Weight</h2><p className="snake-profile-big-value">{snake.weight != null ? formatWeight(snake.weight) : "—"}</p><p>{snake.lastWeighedDate ? `Last weighed ${snake.lastWeighedDate}` : "No weight recorded"}</p><div className="snake-profile-mini-chart"><WeightMiniChart history={weightHistory} /></div></button>
        <button type="button" className="snake-profile-card" onClick={() => navigate(`/snakes/${snake.id}/edit`)}><div className="snake-profile-card-icon">⏰</div><h2>Weight Reminders</h2><p>{snake.weightTracking?.enabled ? "Enabled" : "Disabled"}</p>{snake.weightTracking?.enabled && <p>{snake.weightTracking.frequency}</p>}{reminder.status !== "disabled" && <p>{reminder.status === "overdue" ? "🔴 Weight overdue" : reminder.status === "due" ? "🟡 Due today" : `🟢 Due in ${reminder.daysRemaining} days`}</p>}</button>
        <button type="button" className="snake-profile-card" onClick={() => navigate(`/snakes/${snake.id}/timeline`)}><div className="snake-profile-card-icon">📅</div><h2>Timeline</h2>{snake.hatchDate ? <><p>🥚 {snake.hatchDate}</p><p>🎂 {calculateAge(snake.hatchDate)}</p></> : <p>No hatch date recorded</p>}<p className="tt-intelligence-action">Open full timeline →</p></button>
        <button type="button" className="snake-profile-card" onClick={() => navigate(`/health/${snake.id}`)}><div className="snake-profile-card-icon">📚</div><h2>Records</h2><p>🍽️ Feeding: <strong>{snake.feedingHistory?.length ?? 0}</strong></p><p>🐍 Sheds: <strong>{snake.shedHistory?.length ?? 0}</strong></p><p>🩺 Health & vet records</p><p className="tt-intelligence-action">Open health record →</p></button>
        <button type="button" className="snake-profile-card snake-profile-card-notes" onClick={openSnakeEditor}><div className="snake-profile-card-icon">📝</div><h2>Notes</h2><p>{snake.notes || "No notes added"}</p></button>
      </section>

      <section className="snake-profile-intelligence" aria-labelledby="snake-profile-intelligence-heading">
        <h2 id="snake-profile-intelligence-heading" className="snake-profile-intelligence-heading">Tiny Titans Intelligence &amp; Data Quality</h2>
        <p className="snake-profile-intelligence-subtitle">Long-form analysis lives here so your snake profile and everyday actions stay immediately accessible.</p>
        {intelligenceAccess === false && <section className="tt-intelligence-panel tt-intelligence-locked"><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Full Intelligence is optional</h2><p className="tt-intelligence-meta">Your personal tracking still works normally. Advanced Tiny Titans Intelligence is available when you choose to contribute eligible husbandry data anonymously to the growing Tiny Titans knowledge base.</p><p className="tt-intelligence-meta"><strong>Your choice:</strong> optional husbandry data sharing is currently off.</p><button type="button" className="tt-intelligence-action" onClick={() => navigate("/account/data-privacy")}>Enable Intelligence in Data &amp; Privacy →</button></section>}
        {intelligenceAccess && <IntelligenceDataQualityPanel snake={snake} />}
        {intelligenceAccess && benchmarkLoading && <section className="tt-intelligence-panel" aria-live="polite"><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Building your comparison…</h2><p className="tt-intelligence-meta">Checking the consent-filtered age-aware community cohort.</p></section>}
        {intelligenceAccess && benchmarkError && <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Community comparison unavailable</h2><p className="tt-intelligence-meta">The community benchmark is temporarily unavailable. Your personal records are unaffected.</p></section>}
        {summary && !benchmarkLoading && !benchmarkError && <ExplainableIntelligenceSummary summary={summary} />}
        {intelligenceLoading && <section className="tt-intelligence-panel" aria-live="polite"><p className="tt-intelligence-kicker">PERSONALISED INTELLIGENCE</p><h2 className="tt-intelligence-title">Reading {snake.name}'s history…</h2><p className="tt-intelligence-meta">Tiny Titans is checking the records already stored for this snake.</p></section>}
        {intelligenceAccess && intelligence && <IntelligencePanel intelligence={intelligence} />}
        {intelligenceAccess && !intelligenceLoading && !intelligence && <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">PERSONALISED INTELLIGENCE</p><h2 className="tt-intelligence-title">Baseline still building</h2><p className="tt-intelligence-meta">Tiny Titans could not build a current intelligence record for {snake.name}. Record another weight, feeding or shed and the engine can try again.</p></section>}
      </section>

      <ConfirmActionDialog open={confirmDelete} title={`Delete ${snake.name}?`} description={<p>This removes the snake from your active collection. Weight, feeding and shed history associated with the snake will no longer be reachable through the app.</p>} confirmLabel="Delete Snake" busy={deleting} onConfirm={() => void deleteSnake()} onCancel={() => { if (!deleting) setConfirmDelete(false); }} />
    </div>
  );
}

export default SnakeProfile;
