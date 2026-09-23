import { useNavigate } from "react-router-dom";
import type { Snake } from "../../types/Snake";
import type { WeightReminder } from "../../utils/weightReminder";
import { useUnits } from "../../context/UnitContextValue";
import WeightMiniChart from "../WeightMiniChart";
import { ageLabel } from "../../lib/dateCalculations";

type Props = { snake: Snake; reminder: WeightReminder; reminderWeightRoute: string; waterChangeRoute: string; };

export default function SnakeProfileOverviewGrid({ snake, reminder, reminderWeightRoute, waterChangeRoute }: Props) {
  const navigate = useNavigate();
  const { formatWeight } = useUnits();
  const morphText = snake.morphs?.length ? snake.morphs.join(", ") : "No morphs listed";

  return (
    <section className="snake-profile-overview-grid" aria-label={snake.name + " profile details"}>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/snakes/" + snake.id + "/edit")}><div className="snake-profile-card-icon">📋</div><h2>Basic Information</h2><p><strong>{snake.species}</strong></p><p>{snake.sex}</p>{snake.nickname && <p>“{snake.nickname}”</p>}{snake.arrivalDate && <p>Arrived {snake.arrivalDate}</p>}</button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/snakes/" + snake.id + "/edit")}><div className="snake-profile-card-icon">🧬</div><h2>Genetics</h2><p><strong>{morphText}</strong></p><p>{snake.hets?.length ?? 0} het{snake.hets?.length !== 1 ? "s" : ""}</p>{snake.customMorph && <p>{snake.customMorph}</p>}</button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/weights/" + snake.id)}><div className="snake-profile-card-icon">⚖️</div><h2>Weight</h2><p className="snake-profile-big-value">{snake.weight != null ? formatWeight(snake.weight) : "—"}</p><p>{snake.lastWeighedDate ? "Last weighed " + snake.lastWeighedDate : "No weight recorded"}</p><div className="snake-profile-mini-chart"><WeightMiniChart history={snake.weightHistory ?? []} /></div></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate(reminderWeightRoute)}><div className="snake-profile-card-icon">⏰</div><h2>Weight Reminders</h2><p>{snake.weightTracking?.enabled ? "Legacy cadence available" : "Not configured yet"}</p>{snake.weightTracking?.enabled && <p>{snake.weightTracking.frequency}</p>}{reminder.status !== "disabled" && <p>{reminder.status === "overdue" ? "🔴 Weight overdue" : reminder.status === "due" ? "🟡 Due today" : "🟢 Due in " + reminder.daysRemaining + " days"}</p>}<p className="tt-intelligence-action">Open Weight Reminders →</p></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate(waterChangeRoute)}><div className="snake-profile-card-icon">💧</div><h2>Water Care</h2><p>Track this Titan recurring water-change routine.</p><p>Keep the schedule alongside the rest of {snake.name} care records.</p><p className="tt-intelligence-action">Open Water Care →</p></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/snakes/" + snake.id + "/timeline")}><div className="snake-profile-card-icon">📅</div><h2>Timeline</h2>{snake.hatchDate ? <><p>🥚 {snake.hatchDate}</p><p>🎂 {ageLabel(snake.hatchDate)}</p></> : <p>No hatch date recorded</p>}<p className="tt-intelligence-action">Open full timeline →</p></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/health/" + snake.id)}><div className="snake-profile-card-icon">📚</div><h2>Records</h2><p>🍽️ Feeding: <strong>{snake.feedingHistory?.length ?? 0}</strong></p><p>🐍 Sheds: <strong>{snake.shedHistory?.length ?? 0}</strong></p><p>🩺 Health & vet records</p><p className="tt-intelligence-action">Open health record →</p></button>
      <button type="button" className="snake-profile-card snake-profile-card-notes" onClick={() => navigate("/snakes/" + snake.id + "/edit")}><div className="snake-profile-card-icon">📝</div><h2>Notes</h2><p>{snake.notes || "No notes added"}</p></button>
    </section>
  );
}
