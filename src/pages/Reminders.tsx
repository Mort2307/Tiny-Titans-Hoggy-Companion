import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { listReminders } from "../services/reminderService";
import type { Reminder } from "../types/Reminder";
import { REMINDER_DEFINITIONS } from "../types/Reminder";
import "./Reminders.css";

const DAY_MS = 86400000;

function todayFor(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyToUtc(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function fullDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(dateKeyToUtc(dateKey));
}

function timeLabel(value: string | undefined) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: false }).format(new Date(2000, 0, 1, hour, minute));
}

function dayDifference(fromKey: string, toKey: string) {
  return Math.round((dateKeyToUtc(toKey).getTime() - dateKeyToUtc(fromKey).getTime()) / DAY_MS);
}

function reminderTiming(reminder: Reminder) {
  const timezone = reminder.timezone || "Europe/London";
  const today = todayFor(timezone);
  const date = reminder.nextOccurrenceDate;
  const days = dayDifference(today, date);
  const time = timeLabel(reminder.time);

  if (days < 0) return { tone: "overdue", label: `${Math.abs(days)} DAY${Math.abs(days) === 1 ? "" : "S"} OVERDUE`, detail: `${fullDate(date)}${time ? ` · ${time}` : ""}` };
  if (days === 0) return { tone: "today", label: "TODAY", detail: `${fullDate(date)}${time ? ` · ${time}` : ""}` };
  if (days === 1) return { tone: "tomorrow", label: "TOMORROW", detail: `${fullDate(date)}${time ? ` · ${time}` : ""}` };
  return { tone: "upcoming", label: `IN ${days} DAYS`, detail: `${fullDate(date)}${time ? ` · ${time}` : ""}` };
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
    setError("");
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
  const appTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  const appToday = todayFor(appTimezone);

  if (!user) return <main className="tt-reminders-page"><BackHomeButton fallback="/" /><section className="tt-reminder-hero"><h1>🔔 Reminder Hub</h1><p>Please sign in to manage your Tiny Titans reminders.</p></section></main>;

  return <main className="tt-reminders-page">
    <BackHomeButton fallback="/" />
    <section className="tt-reminder-hero">
      <div><p className="tt-reminder-eyebrow">Keeper routine · reminder hub</p><h1>🔔 Reminder Hub</h1><p>Pick a reminder type to open its dedicated workspace. Dates are shown using the reminder's timezone so “today” always means the correct local day.</p></div>
      <div className="tt-reminder-hero-stats">
        <span><strong>TODAY</strong><b>{fullDate(appToday)}</b></span>
        <span><strong>{activeReminders.length}</strong> active</span>
        <span><strong>{pausedReminders.length}</strong> paused</span>
      </div>
    </section>

    <section className="tt-reminder-tiles" aria-label="Reminder types">
      {REMINDER_DEFINITIONS.map((item) => <Link key={item.kind} to={`/reminders/${item.kind}`} className="tt-reminder-tile">
        <span className="tt-reminder-tile-icon" aria-hidden="true">{item.icon}</span>
        <span className="tt-reminder-tile-copy"><strong>{item.label}</strong><small>{item.description}</small><em>{countFor(item.kind)} configured · Open →</em></span>
      </Link>)}
    </section>

    <section className="tt-reminder-overview-grid">
      <article className="tt-reminder-overview-card tt-reminder-next-card">
        <span className="tt-reminder-eyebrow">NEXT REMINDER</span>
        {nextReminder && nextDefinition ? <>
          <h2>{nextDefinition.icon} {nextReminder.title}</h2>
          <p className="tt-reminder-next-snake">{nextReminder.snakeName || "All snakes"}</p>
          <div className={`tt-reminder-date-status tt-reminder-date-status--${reminderTiming(nextReminder).tone}`}>
            <strong>{reminderTiming(nextReminder).label}</strong>
            <span>{reminderTiming(nextReminder).detail}</span>
          </div>
        </> : <>
          <h2>No upcoming reminders</h2>
          <p>Choose a reminder type above to create your first recurring schedule.</p>
        </>}
      </article>
      <article className="tt-reminder-overview-card"><span className="tt-reminder-eyebrow">HOW TO READ DATES</span><h2>No mystery dates.</h2><p>Every reminder now shows a clear status first, followed by the full weekday, date, year and scheduled time. A missed past occurrence cannot be labelled as your next reminder.</p></article>
    </section>

    {loadingData && <p className="tt-reminder-message" role="status">Loading your reminder stack…</p>}
    {error && <p className="tt-reminder-message" role="alert">{error}</p>}
  </main>;
}
