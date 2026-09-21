import {
  useMemo,
  useState
} from "react";
import { Link } from "react-router-dom";
import { setRescueReminderComplete } from "../services/rescueService";
import type { RescueAnimal } from "../types/rescue";
import { GatePage, PageHeader, useRescueData, animalLabel, formatDate } from "../components/rescue/RescueOperationsShared";

export function RescueTasks() {
  const { animals, loading, error, refresh } = useRescueData();
  const [filter, setFilter] = useState<"open"|"overdue"|"completed">("open");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const tasks = useMemo(() => animals.flatMap((animal) => (animal.reminders || []).map((item) => ({ animal, item }))).sort((a,b) => a.item.dueAt.localeCompare(b.item.dueAt)), [animals]);
  const [now] = useState(() => Date.now());
  const filtered = tasks.filter(({item}) => filter === "completed" ? item.completed : !item.completed && (filter === "open" || new Date(item.dueAt).getTime() < now));
  async function toggle(animal: RescueAnimal, reminderId: string, completed: boolean) {
    setBusy(`${animal.id}:${reminderId}`); setMessage("");
    try { await setRescueReminderComplete(animal.id, reminderId, completed); await refresh(); } catch(error) { setMessage(error instanceof Error ? error.message : "Could not update the task."); } finally { setBusy(""); }
  }
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="FOLLOW-UP & TASKS" title="Reminders & tasks" description="See every open, overdue and completed follow-up across the Rescue population." />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    {message && <div className="rescue-message rescue-message-error">{message}</div>}
    <section className="rescue-card"><div className="rescue-form-actions">
      {(["open","overdue","completed"] as const).map((item) => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item === "open" ? "Open" : item === "overdue" ? "Overdue" : "Completed"}</button>)}
    </div>
    <div className="rescue-record-list">{filtered.map(({animal,item}) => <article key={`${animal.id}-${item.id}`}><header><strong>{item.title}</strong><span>{formatDate(item.dueAt,true)}</span></header><p>{animalLabel(animal)} · {item.kind} · {item.priority}</p><p>{item.notes || "No notes."}</p><div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/animals/${animal.id}/manage`}>Open animal →</Link><button type="button" disabled={busy === `${animal.id}:${item.id}`} onClick={() => void toggle(animal,item.id,!item.completed)}>{item.completed ? "Reopen" : "Complete"}</button></div></article>)}{!filtered.length && <div className="rescue-empty"><strong>No {filter} tasks</strong><span>Tasks added to individual animal records will appear here.</span></div>}</div></section>
    {loading && <div className="rescue-card"><p>Loading Rescue tasks…</p></div>}
  </main></GatePage>;
}
