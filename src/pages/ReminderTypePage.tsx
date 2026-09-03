import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { createReminder, defaultReminderInput, deleteReminder, listReminders, setReminderPaused, updateReminder } from "../services/reminderService";
import type { Reminder, ReminderInput, ReminderKind } from "../types/Reminder";
import { REMINDER_DEFINITIONS } from "../types/Reminder";
import "./ReminderTypePage.css";

type SnakeOption = { id: string; name: string };

const DEFINITIONS = new Map(REMINDER_DEFINITIONS.map((item) => [item.kind, item]));

function localDateKey() {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function buildInput(kind: ReminderKind, snakeId: string | null, snakes: SnakeOption[]): ReminderInput {
  const base = defaultReminderInput(kind, snakeId);
  return { ...base, snakeName: snakes.find((snake) => snake.id === snakeId)?.name ?? null };
}

function formatNext(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ReminderTypePage() {
  const { kind: rawKind } = useParams<{ kind: string }>();
  const kind = rawKind as ReminderKind;
  const definition = DEFINITIONS.get(kind);
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<SnakeOption[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReminderInput>(() => defaultReminderInput(kind));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user || loading || profileLoading || !definition) return;
    let active = true;
    setLoadingData(true);
    void Promise.all([getUserSnakes(user.uid), listReminders(user.uid)]).then(([loadedSnakes, loadedReminders]) => {
      if (!active) return;
      const nextSnakes = loadedSnakes.map((snake) => ({ id: snake.id, name: snake.name }));
      setSnakes(nextSnakes);
      setReminders(loadedReminders.filter((reminder) => reminder.kind === kind));
      setForm((current) => ({ ...current, kind, snakeId: current.snakeId ?? nextSnakes[0]?.id ?? null, snakeName: nextSnakes.find((snake) => snake.id === current.snakeId)?.name ?? current.snakeName }));
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load reminders.")).finally(() => { if (active) setLoadingData(false); });
    return () => { active = false; };
  }, [user, loading, profileLoading, kind, definition]);

  const activeReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "active"), [reminders]);
  const pausedReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "paused"), [reminders]);

  if (!definition) return <Navigate to="/reminders" replace />;

  function updateForm<K extends keyof ReminderInput>(key: K, value: ReminderInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(buildInput(kind, snakes[0]?.id ?? null, snakes));
    setMessage("");
  }

  function edit(reminder: Reminder) {
    setEditingId(reminder.id);
    setForm({ id: reminder.id, kind: reminder.kind, title: reminder.title, description: reminder.description ?? "", snakeId: reminder.snakeId ?? null, snakeName: reminder.snakeName ?? null, frequencyDays: reminder.frequencyDays, time: reminder.time, startDate: reminder.nextOccurrenceDate || reminder.startDate, timezone: reminder.timezone, leadUpEnabled: reminder.leadUpEnabled, leadUpDays: reminder.leadUpDays, status: reminder.status });
    setMessage("");
  }

  async function save() {
    if (!user || busy) return;
    const title = form.title.trim();
    if (!title) { setMessage("Give this reminder a name before saving it."); return; }
    setBusy(true); setMessage("");
    try {
      const next: ReminderInput = {
        ...form,
        kind,
        title,
        description: form.description?.trim() ?? "",
        snakeId: form.snakeId ?? null,
        snakeName: snakes.find((snake) => snake.id === form.snakeId)?.name ?? null,
        frequencyDays: Math.max(1, Math.min(3650, Math.round(Number(form.frequencyDays) || 1))),
        time: form.time || "09:00",
        startDate: form.startDate || localDateKey(),
        timezone: form.timezone || "Europe/London",
        leadUpDays: Math.max(1, Math.min(30, Math.round(Number(form.leadUpDays) || 1))),
        status: "active",
      };
      if (editingId) await updateReminder(user.uid, editingId, next);
      else await createReminder(user.uid, next);
      setReminders((await listReminders(user.uid)).filter((reminder) => reminder.kind === kind));
      setMessage(editingId ? "✅ Reminder updated." : "✅ Recurring reminder created.");
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this reminder.");
    } finally { setBusy(false); }
  }

  async function toggle(reminder: Reminder) {
    if (!user || busy) return;
    setBusy(true); setMessage("");
    try {
      await setReminderPaused(user.uid, reminder, reminder.status === "active");
      setReminders((await listReminders(user.uid)).filter((item) => item.kind === kind));
      setMessage(reminder.status === "active" ? `⏸️ ${reminder.title} paused.` : `▶️ ${reminder.title} resumed.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to change reminder status."); }
    finally { setBusy(false); }
  }

  async function remove(reminder: Reminder) {
    if (!user || busy) return;
    if (!window.confirm(`Delete “${reminder.title}”? This does not remove any tracker records.`)) return;
    setBusy(true); setMessage("");
    try {
      await deleteReminder(user.uid, reminder.id);
      setReminders((current) => current.filter((item) => item.id !== reminder.id));
      if (editingId === reminder.id) resetForm();
      setMessage(`🗑️ ${reminder.title} deleted.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete this reminder."); }
    finally { setBusy(false); }
  }

  return <main className="tt-reminder-type-page">
    <BackHomeButton fallback="/reminders" />
    <nav className="tt-reminder-breadcrumbs" aria-label="Reminder navigation"><Link to="/reminders">🔔 Reminder Hub</Link><span>›</span><strong>{definition.icon} {definition.label}</strong></nav>

    <section className="tt-reminder-type-hero">
      <div><p className="tt-reminder-type-eyebrow">REMINDER TYPE</p><h1>{definition.icon} {definition.label} Reminders</h1><p>{definition.description}</p></div>
      <div className="tt-reminder-type-stats"><span><strong>{activeReminders.length}</strong> active</span><span><strong>{pausedReminders.length}</strong> paused</span></div>
    </section>

    <section className="tt-reminder-editor-card">
      <div className="tt-reminder-editor-head"><div><p className="tt-reminder-type-eyebrow">{editingId ? "EDIT REMINDER" : "NEW REMINDER"}</p><h2>{editingId ? "Change this schedule" : `Create a ${definition.label.toLowerCase()} reminder`}</h2><p>This is a separate reminder record. Creating another one never replaces an existing reminder.</p></div>{editingId && <button type="button" className="tt-reminder-secondary" onClick={resetForm}>Cancel edit</button>}</div>
      <div className="tt-reminder-editor-grid">
        <label><span>Reminder name</span><input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder={definition.defaultTitle} /></label>
        <label><span>Applies to</span><select value={form.snakeId ?? "all"} onChange={(event) => updateForm("snakeId", event.target.value === "all" ? null : event.target.value)}><option value="all">🐍 All my snakes</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>🐍 {snake.name}</option>)}</select></label>
        <label className="wide"><span>Repeat every</span><div className="tt-reminder-frequency"><input type="number" min="1" max="3650" value={form.frequencyDays} onChange={(event) => updateForm("frequencyDays", Math.max(1, Number(event.target.value) || 1))} /><strong>days</strong><small>The schedule keeps repeating until you change or pause it.</small></div></label>
        <label><span>First due date</span><input type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} /></label>
        <label><span>Reminder time</span><input type="time" value={form.time} onChange={(event) => updateForm("time", event.target.value)} /></label>
        <label className="wide"><span>Lead-up reminders</span><div className="tt-reminder-leadup-row"><input type="checkbox" checked={form.leadUpEnabled} onChange={(event) => updateForm("leadUpEnabled", event.target.checked)} /><span>Remind me daily before the main reminder</span>{form.leadUpEnabled && <select value={Math.min(form.leadUpDays, Math.max(1, form.frequencyDays - 1))} onChange={(event) => updateForm("leadUpDays", Number(event.target.value))}>{Array.from({ length: Math.max(1, Math.min(14, Math.max(1, form.frequencyDays - 1))) }, (_, index) => index + 1).map((days) => <option key={days} value={days}>{days} day{days === 1 ? "" : "s"} before</option>)}</select>}</div></label>
        <label className="wide"><span>Optional note</span><textarea rows={3} value={form.description ?? ""} onChange={(event) => updateForm("description", event.target.value)} placeholder="What should the keeper remember or check?" /></label>
      </div>
      <div className="tt-reminder-editor-actions"><button type="button" className="tt-reminder-primary" onClick={() => void save()} disabled={busy || loadingData}>{busy ? "Saving…" : editingId ? "Save changes" : `Create ${definition.label.toLowerCase()} reminder`}</button>{message && <p className="tt-reminder-message" role="status">{message}</p>}</div>
    </section>

    <section className="tt-reminder-type-list">
      <div className="tt-reminder-type-list-head"><div><p className="tt-reminder-type-eyebrow">SCHEDULES</p><h2>Your {definition.label.toLowerCase()} reminders</h2></div><Link to="/reminders">View all reminder types →</Link></div>
      {activeReminders.length === 0 && pausedReminders.length === 0 ? <div className="tt-reminder-type-empty"><strong>No {definition.label.toLowerCase()} reminders yet.</strong><p>Create one above. You can have as many independent {definition.label.toLowerCase()} schedules as you need.</p></div> : <div className="tt-reminder-type-cards">
        {[...activeReminders, ...pausedReminders].map((reminder) => <article key={reminder.id} className="tt-reminder-type-card"><div className="tt-reminder-type-card-icon">{definition.icon}</div><div className="tt-reminder-type-card-main"><div className="tt-reminder-type-card-title"><div><span>{reminder.snakeName ? reminder.snakeName : "All snakes"}</span><h3>{reminder.title}</h3></div><em>{reminder.status === "active" ? "🟢 Active" : "⏸️ Paused"}</em></div><p className="tt-reminder-next"><strong>{reminder.nextPhase === "lead-up" ? "Lead-up" : "Next"}</strong> {formatNext(reminder.nextNotificationAt)}</p><div className="tt-reminder-meta"><span>Every {reminder.frequencyDays} days</span><span>{reminder.time}</span>{reminder.leadUpEnabled && <span>+ {reminder.leadUpDays} day lead-up</span>}</div><div className="tt-reminder-actions"><button type="button" onClick={() => edit(reminder)}>Edit</button><button type="button" onClick={() => void toggle(reminder)}>{reminder.status === "active" ? "Pause" : "Resume"}</button><button type="button" className="danger" onClick={() => void remove(reminder)}>Delete</button></div></div></article>)}
      </div>}
    </section>

    <nav className="tt-reminder-type-switcher" aria-label="Other reminder types"><strong>Other reminder types</strong>{REMINDER_DEFINITIONS.filter((item) => item.kind !== kind).map((item) => <Link key={item.kind} to={`/reminders/${item.kind}`}>{item.icon} {item.label}</Link>)}</nav>
  </main>;
}
