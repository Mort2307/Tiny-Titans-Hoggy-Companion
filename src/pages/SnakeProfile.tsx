import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Snake } from "../types/Snake";
import { migrateSnake } from "../utils/snakeMigration";
import { getWeightReminder } from "../utils/weightReminder";
import { getUserSnake, deleteUserSnake } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import WeightMiniChart from "../components/WeightMiniChart";
import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";

function SnakeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const { formatWeight } = useUnits();
  const [snake, setSnake] = useState<Snake | null>(null);
  const [loadingSnake, setLoadingSnake] = useState(true);
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
        setSnake(migrateSnake({ ...loadedSnake, id: loadedSnake.id || id })); setError(null); setLoadingSnake(false);
      } catch (loadError) { if (!cancelled) { console.error("Tiny Titans: unable to load snake profile", loadError); setError(loadError instanceof Error ? loadError.message : "Unable to load this snake. Please try again."); setLoadingSnake(false); } }
    }
    void loadSnake();
    return () => { cancelled = true; };
  }, [id, user, loading, profileLoading]);

  function calculateAge(date: string) {
    if (!date) return "-";
    const start = new Date(date); const now = new Date();
    if (Number.isNaN(start.getTime())) return "-";
    let years = now.getFullYear() - start.getFullYear(); let months = now.getMonth() - start.getMonth(); let days = now.getDate() - start.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    if (years < 0) return "Not yet hatched";
    return ([years ? `${years} year${years === 1 ? "" : "s"}` : "", months ? `${months} month${months === 1 ? "" : "s"}` : "", days ? `${days} day${days === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") || "0 days");
  }
  async function deleteSnake() {
    if (!snake || !user || !snake.id || deleting) return;
    setDeleting(true);
    setError(null);
    try { await deleteUserSnake(user.uid, snake.id); navigate("/snakes", { replace: true }); } catch (err) { setError(err instanceof Error ? err.message : "Unable to delete this snake. Please try again."); setDeleting(false); setConfirmDelete(false); }
  }
  function openSnakeEditor() { if (snake?.id) navigate(`/snakes/${snake.id}/edit`); }
  function openMasterRecord() { if (snake?.id) navigate(`/snakes/${snake.id}/master-record`); }

  if (loading || profileLoading || loadingSnake) return <div className="page-container"><BackHomeButton /><h1>ðŸ Loading Snake...</h1><div className="tracker-card"><p>Fetching the snake profile from Firebase.</p></div></div>;
  if (error || !snake) return <div className="page-container"><BackHomeButton /><h1>ðŸ Snake Not Found</h1><div className="tracker-card"><h3>{error ?? "This snake could not be found."}</h3><button type="button" onClick={() => navigate("/snakes")}>â† Back to My Hoggies</button></div></div>;

  const reminder = getWeightReminder(snake);
  const weightHistory = snake.weightHistory ?? [];
  return <div className="page-container"><BackHomeButton /><h1>ðŸ {snake.name}</h1>
    <div className="snake-profile-photo">{snake.photo ? <img src={snake.photo} alt={snake.name} /> : <div className="snake-profile-placeholder">ðŸ</div>}</div>
    <div className="tracker-card snake-profile-actions"><button type="button" onClick={openMasterRecord}>ðŸ“– Living History / Master Record</button><button type="button" onClick={openSnakeEditor}>âœï¸ Edit Snake</button><button type="button" onClick={() => navigate(`/feeding/${snake.id}`)}>ðŸ½ Log Feeding</button><button type="button" onClick={() => navigate(`/shedding/${snake.id}`)}>ðŸ Log Shed</button><button type="button" onClick={() => navigate(`/weights/${snake.id}`)}>âš–ï¸ Weight</button><button type="button" onClick={() => setConfirmDelete(true)} disabled={deleting}>ðŸ—‘ï¸ Delete Snake</button></div>
    <div className="snake-profile-grid">
      <button type="button" className="snake-profile-card" onClick={openSnakeEditor}><div className="snake-profile-card-icon">ðŸ“‹</div><h2>Basic Information</h2><p><strong>{snake.species}</strong></p><p>{snake.sex}</p>{snake.nickname && <p>"{snake.nickname}"</p>}</button>
      <button type="button" className="snake-profile-card" onClick={openSnakeEditor}><div className="snake-profile-card-icon">ðŸ§¬</div><h2>Genetics</h2><p><strong>{snake.morphs?.length ? snake.morphs.join(", ") : "No morphs listed"}</strong></p>{snake.hets?.length > 0 && <p>{snake.hets.length} het{snake.hets.length !== 1 ? "s" : ""}</p>}{snake.customMorph && <p>{snake.customMorph}</p>}</button>
      <button type="button" className="snake-profile-card" onClick={() => navigate(`/weights/${snake.id}`)}><div className="snake-profile-card-icon">âš–ï¸</div><h2>Weight</h2><p className="snake-profile-big-value">{snake.weight != null ? formatWeight(snake.weight) : "â€”"}</p><p>{snake.lastWeighedDate ? `Last weighed ${snake.lastWeighedDate}` : "No weight recorded"}</p><div className="snake-profile-mini-chart"><WeightMiniChart history={weightHistory} /></div></button>
      <button type="button" className="snake-profile-card" onClick={openSnakeEditor}><div className="snake-profile-card-icon">â°</div><h2>Weight Reminders</h2><p>{snake.weightTracking?.enabled ? "Enabled" : "Disabled"}</p>{snake.weightTracking?.enabled && <p>{snake.weightTracking.frequency}</p>}{reminder.status !== "disabled" && <p>{reminder.status === "overdue" ? "ðŸ”´ Weight overdue" : reminder.status === "due" ? "ðŸŸ¡ Due today" : `ðŸŸ¢ Due in ${reminder.daysRemaining} days`}</p>}</button>
      <button type="button" className="snake-profile-card" onClick={openSnakeEditor}><div className="snake-profile-card-icon">ðŸ“…</div><h2>Timeline</h2>{snake.hatchDate ? <><p>ðŸ¥š {snake.hatchDate}</p><p>ðŸŽ‚ {calculateAge(snake.hatchDate)}</p></> : <p>No hatch date recorded</p>}{snake.arrivalDate && <p>ðŸ  {snake.arrivalDate}</p>}</button>
      <button type="button" className="snake-profile-card" onClick={() => navigate(`/feeding/${snake.id}`)}><div className="snake-profile-card-icon">ðŸ“š</div><h2>Records</h2><p>ðŸ½ Feeding: <strong>{snake.feedingHistory?.length ?? 0}</strong></p><p>ðŸ Sheds: <strong>{snake.shedHistory?.length ?? 0}</strong></p><p>â¤ï¸ Health: <strong>{snake.healthHistory?.length ?? 0}</strong></p></button>
      <button type="button" className="snake-profile-card snake-profile-card-notes" onClick={openSnakeEditor}><div className="snake-profile-card-icon">ðŸ“</div><h2>Notes</h2><p>{snake.notes || "No notes added"}</p></button>
    </div>
    <ConfirmActionDialog open={confirmDelete} title={`Delete ${snake.name}?`} description={<p>This removes the snake from your active collection. Weight, feeding and shed history associated with the snake will no longer be reachable through the app.</p>} confirmLabel="Delete Snake" busy={deleting} onConfirm={() => void deleteSnake()} onCancel={() => { if (!deleting) setConfirmDelete(false); }} />
  </div>;
}
export default SnakeProfile;
