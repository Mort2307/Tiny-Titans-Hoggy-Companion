import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansEmptyState from "../components/TinyTitansEmptyState";
import { useAuth } from "../context/useAuth";
import { useLiveWorldTime } from "../context/WorldTimeContext";
import { listReminders } from "../services/reminderService";
import type { Reminder } from "../types/Reminder";
import { REMINDER_DEFINITIONS } from "../types/Reminder";
import "./Reminders.css";

const DAY_MS = 86400000;

function todayFor(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyToUtc(dateKey: string) { return new Date(`${dateKey}T00:00:00Z`); }
function fullDate(dateKey: string) { return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(dateKeyToUtc(dateKey)); }
function timeLabel(value: string | undefined) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: false }).format(new Date(2000, 0, 1, hour, minute));
}
function dayDifference(fromKey: string, toKey: string) { return Math.round((dateKeyToUtc(toKey).getTime() - dateKeyToUtc(fromKey).getTime()) / DAY_MS); }
function reminderTiming(reminder: Reminder, now: Date) {
  const timezone = reminder.timezone || "Europe/London";
  const today = todayFor(timezone, now);
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
  const world = useLiveWorldTime();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user || loading || profileLoading) return;
    let active = true;
    setLoadingData(true);
    setError("");
    void listReminders(user.uid).then((loaded) => { if (active) setReminders(loaded); }).catch((loadError) => { if (active) { setReminders([]); setError(loadError instanceof Error ? loadError.message : "Unable to load reminders."); } }).finally(() => { if (active) setLoadingData(false); });
    return () => { active = false; };
  }, [user, loading, profileLoading, retryCount]);

  const activeReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "active").sort((a, b) => {
    const aAt = Date.parse(a.nextNotificationAt || "") || Date.parse(a.nextOccurrenceDate + "T00:00:00Z");
    const bAt = Date.parse(b.nextNotificationAt || "") || Date.parse(b.nextOccurrenceDate + "T00:00:00Z");
    return (Number.isFinite(aAt) ? aAt : Infinity) - (Number.isFinite(bAt) ? bAt : Infinity);
  }), [reminders]);
  const pausedReminders = useMemo(() => reminders.filter((reminder) => reminder.status === "paused"), [reminders]);
  const countFor = (kind: string) => reminders.filter((reminder) => reminder.kind === kind && reminder.status !== "completed").length;
  const nextReminder = activeReminders[0];
  const nextDefinition = nextReminder ? REMINDER_DEFINITIONS.find((item) => item.kind === nextReminder.kind) : null;
  const appToday = world.localDateKey;
  const timing = nextReminder ? reminderTiming(nextReminder, world.observedAt) : null;

  if (!user) return <main className="tt-reminders-page"><BackHomeButton fallback="/" /><section className="tt-reminder-hero"><h1><TinyTitansIcon name="reminders" size={28} /> Reminder Hub</h1><p>Please sign in to manage your Tiny Titans reminders.</p></section></main>;

  return <main className="tt-reminders-page">
    <BackHomeButton fallback="/" />
    <section className="tt-reminder-hero">
      <div><p className="tt-reminder-eyebrow">Keeper routine · reminder hub</p><h1><TinyTitansIcon name="reminders" size={28} /> Reminder Hub</h1><p>Dates use the shared live world clock. Your device timezone is tracked separately from each reminder's scheduled timezone, so travel does not silently rewrite your routines.</p></div>
      <div className="tt-reminder-hero-stats">
        <span><strong>TODAY</strong><b>{fullDate(appToday)}</b></span>
        <span><strong>{world.localTime}</strong>{world.timezone} · {world.utcOffsetLabel}</span>
        <span><strong>{loadingData || error ? "—" : activeReminders.length}</strong> active</span>
        <span><strong>{loadingData || error ? "—" : pausedReminders.length}</strong> paused</span>
      </div>
    </section>

    <section className="tt-reminder-tiles" aria-label="Reminder types">
      {REMINDER_DEFINITIONS.map((item) => <Link key={item.kind} to={`/reminders/${item.kind}`} className="tt-reminder-tile">
        <span className="tt-reminder-tile-icon" aria-hidden="true"><TinyTitansIcon name={item.icon} size={26} /></span>
        <span className="tt-reminder-tile-copy"><strong>{item.label}</strong><small>{item.description}</small><em>{loadingData || error ? "Not available" : countFor(item.kind) + " configured"} · Open <TinyTitansIcon name="forward" size={14} /></em></span>
      </Link>)}
    </section>

    <section className="tt-reminder-overview-grid">
      <article className="tt-reminder-overview-card tt-reminder-next-card">
        <span className="tt-reminder-eyebrow">NEXT REMINDER · {world.timezone}</span>
        {!loadingData && !error && nextReminder && nextDefinition && timing ? <>
          <h2><TinyTitansIcon name={nextDefinition.icon} size={22} /> {nextReminder.title}</h2>
          <p className="tt-reminder-next-snake">{nextReminder.snakeName || "All snakes"}</p>
          <div className={`tt-reminder-date-status tt-reminder-date-status--${timing.tone}`}>
            <strong>{timing.label}</strong>
            <span>{timing.detail}</span>
          </div>
        </> : <TinyTitansEmptyState compact icon="reminders" title="No upcoming reminders" description="Choose a reminder type above to create your first recurring keeper schedule." />}
      </article>
      <article className="tt-reminder-overview-card"><span className="tt-reminder-eyebrow">LIVE WORLD CLOCK</span><h2>{world.localTime}</h2><p>{world.localDate} · {world.timezoneLabel}{world.dstActive ? " · DST active" : ""}</p><p>No mystery dates: the app recalculates your live local day whenever the app wakes, regains focus, comes online, or detects a timezone change.</p></article>
    </section>

    {loadingData && <p className="tt-reminder-message" role="status">Loading your reminder stack…</p>}
    {error && <div className="tt-reminder-message" role="alert"><p>Could not load your reminders: {error}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)}>Try again</button></div>}
  </main>;
}
