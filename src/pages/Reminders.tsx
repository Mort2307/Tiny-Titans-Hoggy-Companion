import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { listReminders } from "../services/reminderService";
import type { Reminder } from "../types/Reminder";
import { REMINDER_DEFINITIONS } from "../types/Reminder";
import "./Reminders.css";

function relativeDate(value: string | undefined) {
  if (!value) return "No schedule";
  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return "No schedule";
  const days = Math.round(diff / 86400000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export default function Reminders() {
  const { user, loading, profileLoading } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || loading || profileLoading) return;
    let active = true;
    setLoadingData(true);
    void listReminders(user.uid).then((loaded) => {
      if (active) setReminders(loaded);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load reminders.");
    }).finally(() => {
      if (active) setLoadingData(false);
    });
    return () => { active = false; };
  }, [user, loading, profileLoading]);

  const activeReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "active"), [reminders]);
  const pausedReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "paused"), [reminders]);
  const countFor = (kind: string) => reminders.filter((reminder) => reminder.kind === kind).length;
  const nextReminder = activeReminders[0];
  const nextDefinition = nextReminder ? REMINDER_DEFINITIONS.find((item) => item.kind === nextReminder.kind) : null;

  if (!user) return <main className="tt-reminders-page"><BackHomeButton fallback="/" /><section className="tt-reminder-hero"><h1>🔔 Reminder Hub</h1><p>Please sign in to manage your Tiny Titans reminders.</p></section></main>;

  return <main className="tt-reminders-page">
    <BackHomeButton fallback="/" />
    <section className="tt-reminder-hero">
      <div><p className="tt-reminder-eyebrow">Keeper routine · reminder hub</p><h1>🔔 Reminder Hub</h1><p>Pick a reminder type to open its dedicated workspace. Each type has its own page, schedules and controls.</p></div>
      <div className="tt-reminder-hero-stats"><span><strong>{activeReminders.length}</strong> active</span><span><strong>{pausedReminders.length}</strong> paused</span><span><strong>{reminders.length}</strong> total</span></div>
    </section>

    <section className="tt-reminder-tiles" aria-label="Reminder types">
      {REMINDER_DEFINITIONS.map((item) => <Link key={item.kind} to={`/reminders/${item.kind}`} className="tt-reminder-tile">
        <span className="tt-reminder-tile-icon" aria-hidden="true">{item.icon}</span>
        <span className="tt-reminder-tile-copy"><strong>{item.label}</strong><small>{item.description}</small><em>{countFor(item.kind)} configured · Open →</em></span>
      </Link>)}
    </section>

    <section className="tt-reminder-overview-grid">
      <article className="tt-reminder-overview-card"><span className="tt-reminder-eyebrow">NEXT UP</span><h2>{nextDefinition ? `${nextDefinition.icon} ${nextReminder.title}` : "No reminders scheduled"}</h2><p>{nextReminder ? `${nextReminder.snakeName || "All snakes"} · ${relativeDate(nextReminder.nextNotificationAt)}` : "Choose a reminder type above to create your first recurring schedule."}</p></article>
      <article className="tt-reminder-overview-card"><span className="tt-reminder-eyebrow">DEDICATED WORKSPACES</span><h2>Every tile opens a real page.</h2><p>Weight, Feeding, Shedding, Health, Husbandry and Custom each have their own focused reminder workspace. No editor is injected underneath this hub.</p></article>
    </section>

    {loadingData && <p className="tt-reminder-message" role="status">Loading your reminder stack…</p>}
    {error && <p className="tt-reminder-message" role="alert">{error}</p>}
  </main>;
}
