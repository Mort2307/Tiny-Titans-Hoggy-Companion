import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { createReminder, defaultReminderInput, deleteReminder, listReminders, setReminderPaused, updateReminder } from "../services/reminderService";
import type { Reminder, ReminderInput, ReminderKind } from "../types/Reminder";
import { REMINDER_DEFINITIONS } from "../types/Reminder";
import "./Reminders.css";

type SnakeOption = { id: string; name: string };

const TYPE_MAP = new Map(REMINDER_DEFINITIONS.map((definition) => [definition.kind, definition]));
const DEFAULT_KIND: ReminderKind = "weight";

function localDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
  return formatter.format(new Date());
}

function readableDate(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function relativeDate(value: string | undefined) {
  if (!value) return "No schedule";
  const diff = new Date(value).getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function buildInitial(kind: ReminderKind, snakeId: string | null, snakes: SnakeOption[]): ReminderInput {
  const base = defaultReminderInput(kind, snakeId);
  const snake = snakes.find((item) => item.id === snakeId);
  return { ...base, snakeName: snake?.name ?? null };
}

export default function Reminders() {
  const { user, loading, profileLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedKind = searchParams.get("type") as ReminderKind | null;
  const [snakes, setSnakes] = useState<SnakeOption[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [kind, setKind] = useState<ReminderKind>(TYPE_MAP.has(requestedKind || DEFAULT_KIND) ? (requestedKind || DEFAULT_KIND) : DEFAULT_KIND);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReminderInput>(() => defaultReminderInput(DEFAULT_KIND));
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (requestedKind && TYPE_MAP.has(requestedKind)) setKind(requestedKind);
  }, [requestedKind]);

  useEffect(() => {
    if (!user || loading || profileLoading) return;
    let active = true;
    setLoadingData(true);
    void Promise.all([getUserSnakes(user.uid), listReminders(user.uid)]).then(([loadedSnakes, loadedReminders]) => {
      if (!active) return;
      const nextSnakes = loadedSnakes.map((snake) => ({ id: snake.id, name: snake.name }));
      setSnakes(nextSnakes);
      setReminders(loadedReminders);
      setForm((current) => ({ ...current, snakeId: current.snakeId ?? nextSnakes[0]?.id ?? null, snakeName: nextSnakes.find((item) => item.id === current.snakeId)?.name ?? current.snakeName }));
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Unable to load reminders."); }).finally(() => { if (active) setLoadingData(false); });
    return () => { active = false; };
  }, [user, loading, profileLoading]);

  const definition = TYPE_MAP.get(kind) ?? TYPE_MAP.get(DEFAULT_KIND)!;
  const activeReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "active"), [reminders]);
  const pausedReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "paused"), [reminders]);

  function selectKind(nextKind: ReminderKind) {
    setKind(nextKind);
    setEditingId(null);
    setForm(buildInitial(nextKind, snakes[0]?.id ?? null, snakes));
    setMessage("");
    setSearchParams(nextKind === DEFAULT_KIND ? {} : { type: nextKind });
  }

  function updateForm<K extends keyof ReminderInput>(key: K, value: ReminderInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(reminder: Reminder) {
    setEditingId(reminder.id);
    setKind(reminder.kind);
    setForm({ id: reminder.id, kind: reminder.kind, title: reminder.title, description: reminder.description ?? "", snakeId: reminder.snakeId ?? null, snakeName: reminder.snakeName ?? null, frequencyDays: reminder.frequencyDays, time: reminder.time, startDate: reminder.nextOccurrenceDate || reminder.startDate, timezone: reminder.timezone, leadUpEnabled: reminder.leadUpEnabled, leadUpDays: reminder.leadUpDays, status: reminder.status });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!user || saving) return;
    if (!form.title.trim()) { setMessage("Give this reminder a name before saving it."); return; }
    setSaving(true); setMessage("");
    try {
      const normalised: ReminderInput = { ...form, title: form.title.trim(), description: form.description?.trim() ?? "", snakeName: snakes.find((item) => item.id === form.snakeId)?.name ?? null, timezone: form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London", frequencyDays: Math.max(1, Math.min(3650, Math.round(Number(form.frequencyDays) || 1))), leadUpDays: Math.max(1, Math.min(30, Math.round(Number(form.leadUpDays) || 1))), startDate: form.startDate || localDateKey(), status: "active" };
      if (editingId) {
        await updateReminder(user.uid, editingId, normalised);
        const updated = await listReminders(user.uid);
        setReminders(updated);
        setMessage("✅ Reminder updated. Its recurring schedule has been recalculated.");
      } else {
        const created = await createReminder(user.uid, normalised);
        setReminders((current) => [...current, created].sort((a, b) => a.nextNotificationAt.localeCompare(b.nextNotificationAt)));
        setMessage(`✅ ${normalised.title} is live. ${normalised.frequencyDays} day recurrence is active until you change it.`);
        setEditingId(null);
        setForm(buildInitial(kind, normalised.snakeId ?? null, snakes));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this reminder.");
    } finally { setSaving(false); }
  }

  async function toggle(reminder: Reminder) {
    if (!user || saving) return;
    setSaving(true); setMessage("");
    try {
      await setReminderPaused(user.uid, reminder, reminder.status === "active");
      setReminders(await listReminders(user.uid));
      setMessage(reminder.status === "active" ? `⏸️ ${reminder.title} paused.` : `▶️ ${reminder.title} resumed.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to change reminder status."); }
    finally { setSaving(false); }
  }

  async function remove(reminder: Reminder) {
    if (!user || saving) return;
    if (!window.confirm(`Delete “${reminder.title}”${reminder.snakeName ? ` for ${reminder.snakeName}` : ""}? This only removes the reminder, not any tracker records.`)) return;
    setSaving(true); setMessage("");
    try { await deleteReminder(user.uid, reminder.id); setReminders((current) => current.filter((item) => item.id !== reminder.id)); if (editingId === reminder.id) { setEditingId(null); setForm(buildInitial(kind, snakes[0]?.id ?? null, snakes)); } setMessage(`🗑️ ${reminder.title} deleted.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete this reminder."); }
    finally { setSaving(false); }
  }

  if (!user) return <main className="tt-reminders-page"><BackHomeButton /><section className="tt-reminder-hero"><h1>🔔 Reminder Hub</h1><p>Please sign in to manage your Tiny Titans reminders.</p></section></main>;

  return <main className="tt-reminders-page">
    <BackHomeButton />
    <section className="tt-reminder-hero">
      <div><p className="tt-reminder-eyebrow">Keeper routine · reminder engine</p><h1>🔔 Reminder Hub</h1><p>One place for every recurring nudge. Create as many independent reminders as you need; each one keeps its own schedule until you change or pause it.</p></div>
      <div className="tt-reminder-hero-stats"><span><strong>{activeReminders.length}</strong> active</span><span><strong>{pausedReminders.length}</strong> paused</span><span><strong>{reminders.length}</strong> total</span></div>
    </section>

    <section className="tt-reminder-tiles" aria-label="Reminder types">{REMINDER_DEFINITIONS.map((item) => <button key={item.kind} type="button" className={kind === item.kind ? "selected" : ""} onClick={() => selectKind(item.kind)}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.description}</small></button>)}</section>

    <section className="tt-reminder-builder">
      <div className="tt-reminder-builder-head"><div><p className="tt-reminder-eyebrow">{editingId ? "Editing reminder" : "New reminder"}</p><h2>{definition.icon} {definition.label} reminder</h2><p>{definition.description}</p></div>{editingId && <button type="button" className="tt-reminder-secondary" onClick={() => { setEditingId(null); setForm(buildInitial(kind, snakes[0]?.id ?? null, snakes)); }}>Cancel edit</button>}</div>
      <div className="tt-reminder-form">
        <label><span>Reminder selection</span><select value={kind} onChange={(event) => selectKind(event.target.value as ReminderKind)}>{REMINDER_DEFINITIONS.map((item) => <option key={item.kind} value={item.kind}>{item.icon} {item.label} — {item.description}</option>)}</select></label>
        {kind === "custom" && <label><span>Custom reminder name</span><input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="e.g. Check enclosure plants" /></label>}
        {kind !== "custom" && <label><span>Reminder name</span><input value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></label>}
        <label><span>Applies to</span><select value={form.snakeId ?? "all"} onChange={(event) => { const id = event.target.value === "all" ? null : event.target.value; updateForm("snakeId", id); updateForm("snakeName", snakes.find((snake) => snake.id === id)?.name ?? null); }}><option value="all">🐍 All my snakes</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>🐍 {snake.name}</option>)}</select></label>
        <div className="tt-reminder-schedule-card"><div><span className="tt-reminder-field-title">Repeat</span><strong>Every <input className="tt-reminder-days" type="number" min="1" max="3650" value={form.frequencyDays} onChange={(event) => updateForm("frequencyDays", Math.max(1, Number(event.target.value)))} /> days</strong><small>Never stops automatically. The next cycle is calculated from the stored occurrence date.</small></div><label><span>Reminder time</span><input type="time" value={form.time} onChange={(event) => updateForm("time", event.target.value)} /></label></div>
        <div className="tt-reminder-form-grid"><label><span>First occurrence</span><input type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} /></label><label><span>Time zone</span><select value={form.timezone} onChange={(event) => updateForm("timezone", event.target.value)}><option value="Europe/London">Europe/London</option><option value={Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London"}>{Intl.DateTimeFormat().resolvedOptions().timeZone || "Device time zone"}</option></select></label></div>
        <div className="tt-reminder-leadup"><div><strong>Lead-up reminders</strong><p>Send a reminder each day before the main reminder, then continue with the normal recurrence.</p></div><input type="checkbox" checked={form.leadUpEnabled} onChange={(event) => updateForm("leadUpEnabled", event.target.checked)} aria-label="Enable lead-up reminders" />{form.leadUpEnabled && <label><span>Lead-up days</span><select value={form.leadUpDays} onChange={(event) => updateForm("leadUpDays", Number(event.target.value))}>{Array.from({ length: 14 }, (_, index) => index + 1).map((days) => <option key={days} value={days}>{days} day{days === 1 ? "" : "s"} before</option>)}</select></label>}</div>
        <label><span>Optional note</span><textarea rows={3} value={form.description ?? ""} onChange={(event) => updateForm("description", event.target.value)} placeholder="Why this reminder matters, what to check, or anything else useful." /></label>
        <div className="tt-reminder-preview"><span>Next notification</span><strong>{readableDate((editingId ? reminders.find((item) => item.id === editingId)?.nextNotificationAt : undefined) || new Date(`${form.startDate}T${form.time}:00`).toISOString())}</strong><small>{form.leadUpEnabled ? `Lead-up phase: ${form.leadUpDays} day${form.leadUpDays === 1 ? "" : "s"} before the due date.` : "Main reminder only."}</small></div>
        <button type="button" className="tt-reminder-primary" onClick={() => void save()} disabled={saving || loadingData}>{saving ? "Saving…" : editingId ? "Save changes" : "Create recurring reminder"}</button>
      </div>
      {message && <div className="tt-reminder-message" role="status">{message}</div>}
    </section>

    <section className="tt-reminder-list"><div className="tt-reminder-list-head"><div><p className="tt-reminder-eyebrow">Your reminder stack</p><h2>Active reminders</h2></div><span>{activeReminders.length} running</span></div>{activeReminders.length === 0 ? <div className="tt-reminder-empty"><strong>No active reminders yet.</strong><p>Pick a tile above and create your first recurring reminder. You can then add another without replacing this one.</p></div> : <div className="tt-reminder-cards">{activeReminders.map((reminder) => { const item = TYPE_MAP.get(reminder.kind)!; return <article key={reminder.id} className="tt-reminder-card"><div className="tt-reminder-card-icon">{item.icon}</div><div className="tt-reminder-card-main"><div className="tt-reminder-card-top"><div><span>{item.label}{reminder.snakeName ? ` · ${reminder.snakeName}` : " · All snakes"}</span><h3>{reminder.title}</h3></div><em>🟢 Active</em></div><p>{relativeDate(reminder.nextNotificationAt)} · next {readableDate(reminder.nextNotificationAt)}</p><div className="tt-reminder-card-meta"><span>Every {reminder.frequencyDays} days</span><span>{reminder.time}</span>{reminder.leadUpEnabled && <span>+ {reminder.leadUpDays} day lead-up</span>}</div><div className="tt-reminder-card-actions"><button type="button" onClick={() => startEdit(reminder)}>Edit</button><button type="button" onClick={() => void toggle(reminder)}>Pause</button><button type="button" className="danger" onClick={() => void remove(reminder)}>Delete</button></div></div></article>; })}</div>}</section>

    {pausedReminders.length > 0 && <section className="tt-reminder-list tt-reminder-paused"><div className="tt-reminder-list-head"><div><p className="tt-reminder-eyebrow">On the shelf</p><h2>Paused reminders</h2></div><span>{pausedReminders.length} paused</span></div><div className="tt-reminder-cards">{pausedReminders.map((reminder) => { const item = TYPE_MAP.get(reminder.kind)!; return <article key={reminder.id} className="tt-reminder-card paused"><div className="tt-reminder-card-icon">{item.icon}</div><div className="tt-reminder-card-main"><div className="tt-reminder-card-top"><div><span>{item.label}{reminder.snakeName ? ` · ${reminder.snakeName}` : " · All snakes"}</span><h3>{reminder.title}</h3></div><em>⏸️ Paused</em></div><p>Every {reminder.frequencyDays} days · last scheduled occurrence {reminder.nextOccurrenceDate}</p><div className="tt-reminder-card-actions"><button type="button" onClick={() => void toggle(reminder)}>Resume</button><button type="button" onClick={() => startEdit(reminder)}>Edit</button><button type="button" className="danger" onClick={() => void remove(reminder)}>Delete</button></div></div></article>; })}</div></section>}

    <section className="tt-reminder-footnote"><strong>🔔 Device delivery is separate.</strong><span>The Hub controls what and when Tiny Titans should remind you. Browser/device notification permission controls whether those reminders can reach you.</span></section>
  </main>;
}
