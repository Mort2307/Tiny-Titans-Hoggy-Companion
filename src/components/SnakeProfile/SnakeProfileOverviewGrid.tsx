import { useNavigate } from "react-router-dom";
import type { Snake } from "../../types/Snake";
import type { WeightReminder } from "../../utils/weightReminder";
import { useUnits } from "../../context/UnitContextValue";
import WeightMiniChart from "../WeightMiniChart";
import { ageLabel } from "../../lib/dateCalculations";
import TinyTitansIcon from "../TinyTitansIcon";

type Props = { snake: Snake; reminder: WeightReminder; reminderWeightRoute: string; waterChangeRoute: string; };

export default function SnakeProfileOverviewGrid({ snake, reminder, reminderWeightRoute, waterChangeRoute }: Props) {
  const navigate = useNavigate();
  const { formatWeight } = useUnits();
  const morphText = snake.morphs?.length ? snake.morphs.join(", ") : "No morphs listed";

  return (
    <section className="snake-profile-overview-grid" aria-label={snake.name + " profile details"}>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/snakes/" + snake.id + "/edit")}><div className="snake-profile-card-icon"><TinyTitansIcon name="account" size={28} /></div><h2>Basic Information</h2><p><strong>{snake.species}</strong></p><p>{snake.sex}</p>{snake.nickname && <p>“{snake.nickname}”</p>}{snake.arrivalDate && <p>Arrived {snake.arrivalDate}</p>}</button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/snakes/" + snake.id + "/edit")}><div className="snake-profile-card-icon"><TinyTitansIcon name="genetics" size={28} /></div><h2>Genetics</h2><p><strong>{morphText}</strong></p><p>{snake.hets?.length ?? 0} het{snake.hets?.length !== 1 ? "s" : ""}</p>{snake.customMorph && <p>{snake.customMorph}</p>}</button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/weights/" + snake.id)}><div className="snake-profile-card-icon"><TinyTitansIcon name="weight" size={28} /></div><h2>Weight</h2><p className="snake-profile-big-value">{snake.weight != null ? formatWeight(snake.weight) : "—"}</p><p>{snake.lastWeighedDate ? "Last weighed " + snake.lastWeighedDate : "No weight recorded"}</p><div className="snake-profile-mini-chart"><WeightMiniChart history={snake.weightHistory ?? []} /></div></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate(reminderWeightRoute)}><div className="snake-profile-card-icon"><TinyTitansIcon name="reminders" size={28} /></div><h2>Weight Reminders</h2><p>{snake.weightTracking?.enabled ? "Legacy cadence available" : "Not configured yet"}</p>{snake.weightTracking?.enabled && <p>{snake.weightTracking.frequency}</p>}{reminder.status !== "disabled" && <p>{reminder.status === "overdue" ? <><TinyTitansIcon name="warning" size={14} /> Weight overdue</> : reminder.status === "due" ? <><TinyTitansIcon name="reminders" size={14} /> Due today</> : <><TinyTitansIcon name="check" size={14} /> Due in {reminder.daysRemaining} days</>}</p>}<p className="tt-intelligence-action">Open Weight Reminders <TinyTitansIcon name="forward" size={13} /></p></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate(waterChangeRoute)}><div className="snake-profile-card-icon"><TinyTitansIcon name="water" size={28} /></div><h2>Water Care</h2><p>Track this Titan recurring water-change routine.</p><p>Keep the schedule alongside the rest of {snake.name} care records.</p><p className="tt-intelligence-action">Open Water Care <TinyTitansIcon name="forward" size={13} /></p></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/snakes/" + snake.id + "/timeline")}><div className="snake-profile-card-icon"><TinyTitansIcon name="timeline" size={28} /></div><h2>Timeline</h2>{snake.hatchDate ? <><p><TinyTitansIcon name="breeding" size={14} /> {snake.hatchDate}</p><p><TinyTitansIcon name="timeline" size={14} /> {ageLabel(snake.hatchDate)}</p></> : <p>No hatch date recorded</p>}<p className="tt-intelligence-action">Open full timeline <TinyTitansIcon name="forward" size={13} /></p></button>
      <button type="button" className="snake-profile-card" onClick={() => navigate("/health/" + snake.id)}><div className="snake-profile-card-icon"><TinyTitansIcon name="knowledge" size={28} /></div><h2>Records</h2><p><TinyTitansIcon name="feeding" size={14} /> Feeding: <strong>{snake.feedingHistory?.length ?? 0}</strong></p><p><TinyTitansIcon name="shed" size={14} /> Sheds: <strong>{snake.shedHistory?.length ?? 0}</strong></p><p><TinyTitansIcon name="vet" size={14} /> Health & vet records</p><p className="tt-intelligence-action">Open health record <TinyTitansIcon name="forward" size={13} /></p></button>
      <button type="button" className="snake-profile-card snake-profile-card-notes" onClick={() => navigate("/snakes/" + snake.id + "/edit")}><div className="snake-profile-card-icon"><TinyTitansIcon name="edit" size={28} /></div><h2>Notes</h2><p>{snake.notes || "No notes added"}</p></button>
    </section>
  );
}
