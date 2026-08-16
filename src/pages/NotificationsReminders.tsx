import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { getUserSnakes } from "../services/snakeService";
import { registerNotificationDevice } from "../services/notificationService";
import { DEFAULT_NOTIFICATION_SETTINGS, getLocalTimezone, replaceFeedingReminderSequence } from "../services/reminderEngine";
import type { FeedingReminderSettings, MedicationReminder, NotificationSettings, ReminderRecord } from "../types/Notifications";
import type { Snake } from "../types/Snake";
import { generateId } from "../utils/generateId";
import BackHomeButton from "../components/BackHomeButton";

const today = () => new Date().toISOString().slice(0, 10);

export default function NotificationsReminders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings>({ ...DEFAULT_NOTIFICATION_SETTINGS, timezone: getLocalTimezone() });
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [feedingSettings, setFeedingSettings] = useState<Record<string, FeedingReminderSettings>>({});
  const [medications, setMedications] = useState<MedicationReminder[]>([]);
  const [history, setHistory] = useState<ReminderRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [medication, setMedication] = useState<MedicationReminder>({ id: "", name: "", dose: "", unit: "ml", frequency: "Daily", intervalDays: 1, scheduledTime: "20:00", startDate: today(), active: true });

  const selectedSnakeIds = useMemo(() => new Set(snakes.map((snake) => snake.id)), [snakes]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      try {
        const [settingsSnap, snakeList, medicationSnap, reminderSnap] = await Promise.all([
          import("firebase/firestore").then(({ getDoc }) => getDoc(doc(db, "users", user.uid, "notificationSettings", "main"))),
          getUserSnakes(user.uid),
          getDocs(collection(db, "users", user.uid, "medications")),
          getDocs(collection(db, "users", user.uid, "notificationHistory")),
        ]);
        if (!active) return;
        if (settingsSnap.exists()) setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, timezone: getLocalTimezone(), ...(settingsSnap.data() as Partial<NotificationSettings>) });
        setSnakes(snakeList.filter((snake) => Boolean(snake.id)));
        setMedications(medicationSnap.docs.map((item) => ({ id: item.id, ...item.data() } as MedicationReminder)));
        setHistory(reminderSnap.docs.map((item) => ({ id: item.id, ...item.data() } as ReminderRecord)).sort((a, b) => String((b.scheduledFor as { seconds?: number })?.seconds ?? "").localeCompare(String((a.scheduledFor as { seconds?: number })?.seconds ?? ""))));
        const scheduleDocs = await getDocs(collection(db, "users", user.uid, "reminderSettings"));
        const schedules: Record<string, FeedingReminderSettings> = {};
        scheduleDocs.forEach((item) => { schedules[item.id] = item.data() as FeedingReminderSettings; });
        setFeedingSettings(schedules);
      } catch (err) { setError(err instanceof Error ? err.message : "Unable to load notification settings."); }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  async function saveSettings(next: Partial<NotificationSettings>) {
    if (!user) return;
    setSaving(true); setError(""); setMessage("");
    const merged = { ...settings, ...next, timezone: getLocalTimezone() };
    try {
      await setDoc(doc(db, "users", user.uid, "notificationSettings", "main"), { ...merged, updatedAt: Timestamp.now(), timezoneUpdatedAt: Timestamp.now() }, { merge: true });
      setSettings(merged);
      setMessage("Notification settings saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save notification settings."); }
    finally { setSaving(false); }
  }

  async function enableNotifications() {
    if (!user) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await registerNotificationDevice(user.uid);
      if (!result.enabled) throw new Error(result.reason === "missing-vapid-key" ? "Push setup is not finished yet. Add VITE_FIREBASE_VAPID_KEY from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates before enabling notifications." : `Notifications could not be enabled (${result.reason ?? "unknown reason"}).`);
      await saveSettings({ pushEnabled: true });
      setMessage("🔔 Notifications are enabled on this device.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to enable notifications."); }
    finally { setSaving(false); }
  }

  async function saveSnakeSchedule(snake: Snake) {
    if (!user) return;
    const schedule = feedingSettings[snake.id] ?? { enabled: true, intervalDays: 7, nextFeedingDate: today(), feedingTime: "18:00", preparationReminderTime: "18:00", tMinus2Enabled: true, tMinus1Enabled: true, feedingDayEnabled: true, timezone: getLocalTimezone() };
    setSaving(true); setError(""); setMessage("");
    try {
      await setDoc(doc(db, "users", user.uid, "reminderSettings", snake.id), { ...schedule, timezone: getLocalTimezone(), updatedAt: Timestamp.now() }, { merge: true });
      if (schedule.enabled && settings.feedingEnabled) {
        await replaceFeedingReminderSequence(user.uid, { uid: user.uid, snakeId: snake.id, snakeName: snake.name, feedingDate: schedule.nextFeedingDate, feedingTime: schedule.feedingTime, preparationReminderTime: schedule.preparationReminderTime, timezone: schedule.timezone, tMinus2Enabled: schedule.tMinus2Enabled, tMinus1Enabled: schedule.tMinus1Enabled, feedingDayEnabled: schedule.feedingDayEnabled });
      }
      setMessage(`${snake.name}'s feeding reminder sequence is scheduled.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save this snake's reminder schedule."); }
    finally { setSaving(false); }
  }

  async function saveMedication() {
    if (!user || !medication.name.trim() || !medication.dose.trim()) { setError("Medication name and recorded dose are required."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const id = medication.id || generateId();
      await setDoc(doc(db, "users", user.uid, "medications", id), { ...medication, id, name: medication.name.trim(), dose: medication.dose.trim(), updatedAt: Timestamp.now(), createdAt: medication.createdAt ?? Timestamp.now() }, { merge: true });
      const reminderId = `medication-${id}-${medication.startDate}-${medication.scheduledTime}`;
      const first = new Date(`${medication.startDate}T${medication.scheduledTime}:00`);
      if (medication.active && settings.medicationEnabled && !Number.isNaN(first.getTime())) {
        await setDoc(doc(db, "users", user.uid, "reminders", reminderId), { id: reminderId, uid: user.uid, type: "medication", stage: "due", status: "scheduled", title: "💊 Medication reminder", body: `Medication tonight: ${medication.dose} ${medication.unit}. This is the medication schedule you recorded.`, deepLink: "/account/settings/notifications", scheduledFor: Timestamp.fromDate(first), timezone: getLocalTimezone(), sequenceId: `medication-${id}`, respectQuietHours: !settings.medicationCanNotifyDuringQuietHours, medicationId: id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
      }
      setMedications((current) => [{ ...medication, id }, ...current.filter((item) => item.id !== id)]);
      setMedication({ id: "", name: "", dose: "", unit: "ml", frequency: "Daily", intervalDays: 1, scheduledTime: "20:00", startDate: today(), active: true });
      setMessage("Medication reminder saved. Tiny Titans only reminds you of information you recorded; it does not prescribe or calculate doses.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save medication reminder."); }
    finally { setSaving(false); }
  }

  return <main className="page-container notification-page"><BackHomeButton /><header className="page-header"><p className="personalisation-eyebrow">My Account</p><h1>🔔 Notifications & Smart Reminders</h1><p>Get structured feeding, weighing, shed and keeper reminders even when Tiny Titans is not open.</p></header>
    {error && <section className="tracker-card" role="alert">⚠️ {error}</section>}{message && <section className="tracker-card" role="status">✅ {message}</section>}
    <section className="personalisation-card"><h2>🔔 Push notifications</h2><p>We will explain the permission request before your browser or device asks for notification access.</p><button className="account-button" type="button" onClick={() => void enableNotifications()} disabled={saving || settings.pushEnabled}>{settings.pushEnabled ? "✓ Notifications enabled" : "Enable Notifications"}</button><p><small>Current device timezone: <strong>{settings.timezone}</strong></small></p></section>
    <section className="personalisation-card"><h2>Reminder types</h2>{(["feedingEnabled", "weighingEnabled", "shedEnabled", "medicationEnabled", "otherEnabled"] as const).map((key) => <label key={key} className="notification-toggle"><span>{key === "feedingEnabled" ? "🍽️ Feeding" : key === "weighingEnabled" ? "⚖️ Weighing" : key === "shedEnabled" ? "🐍 Shed checks" : key === "medicationEnabled" ? "💊 Medication" : "🔔 Other reminders"}</span><input type="checkbox" checked={settings[key]} onChange={(e) => void saveSettings({ [key]: e.target.checked })} disabled={saving} /></label>)}</section>
    <section className="personalisation-card"><h2>🌙 Quiet hours</h2><label className="notification-toggle"><span>Respect quiet hours</span><input type="checkbox" checked={settings.quietHoursEnabled} onChange={(e) => void saveSettings({ quietHoursEnabled: e.target.checked })} /></label><div className="notification-grid"><label>From<input type="time" value={settings.quietStart} onChange={(e) => void saveSettings({ quietStart: e.target.value })} /></label><label>To<input type="time" value={settings.quietEnd} onChange={(e) => void saveSettings({ quietEnd: e.target.value })} /></label></div><label className="notification-toggle"><span>Allow recorded medication reminders during quiet hours</span><input type="checkbox" checked={settings.medicationCanNotifyDuringQuietHours} onChange={(e) => void saveSettings({ medicationCanNotifyDuringQuietHours: e.target.checked })} /></label></section>
    <section className="personalisation-card"><h2>🍽️ Per-snake feeding schedules</h2><p>Each snake has its own schedule. Changing a date replaces the old T-2/T-1/feeding-day sequence rather than leaving orphaned reminders behind.</p>{snakes.map((snake) => { const current = feedingSettings[snake.id] ?? { enabled: true, intervalDays: 7, nextFeedingDate: today(), feedingTime: "18:00", preparationReminderTime: "18:00", tMinus2Enabled: true, tMinus1Enabled: true, feedingDayEnabled: true, timezone: getLocalTimezone() }; return <div className="notification-snake-card" key={snake.id}><h3>🐍 {snake.name}</h3><label className="notification-toggle"><span>Feeding reminders</span><input type="checkbox" checked={current.enabled} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, enabled: e.target.checked } }))} /></label><div className="notification-grid"><label>Interval (days)<input type="number" min="1" max="365" value={current.intervalDays} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, intervalDays: Number(e.target.value) || 1 } }))} /></label><label>Next feeding date<input type="date" value={current.nextFeedingDate} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, nextFeedingDate: e.target.value } }))} /></label><label>Feeding time<input type="time" value={current.feedingTime} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, feedingTime: e.target.value } }))} /></label><label>Preparation reminder<input type="time" value={current.preparationReminderTime} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, preparationReminderTime: e.target.value } }))} /></label></div><div className="notification-checks"><label><input type="checkbox" checked={current.tMinus2Enabled} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, tMinus2Enabled: e.target.checked } }))} /> T-2 stock check</label><label><input type="checkbox" checked={current.tMinus1Enabled} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, tMinus1Enabled: e.target.checked } }))} /> T-1 preparation</label><label><input type="checkbox" checked={current.feedingDayEnabled} onChange={(e) => setFeedingSettings((all) => ({ ...all, [snake.id]: { ...current, feedingDayEnabled: e.target.checked } }))} /> Feeding day</label></div><button className="account-button" type="button" onClick={() => void saveSnakeSchedule(snake)} disabled={saving}>Save {snake.name}'s schedule</button></div> })}{snakes.length === 0 && <p>No snakes found yet.</p>}</section>
    <section className="personalisation-card"><h2>💊 Medication reminders</h2><p>Medication reminders reflect information you enter based on advice from your veterinary or medical professional. Tiny Titans does not prescribe medication, calculate doses or replace professional advice.</p><div className="notification-grid"><label>Name<input value={medication.name} onChange={(e) => setMedication({ ...medication, name: e.target.value })} /></label><label>Recorded dose<input value={medication.dose} onChange={(e) => setMedication({ ...medication, dose: e.target.value })} placeholder="e.g. 0.2" /></label><label>Unit<input value={medication.unit} onChange={(e) => setMedication({ ...medication, unit: e.target.value })} placeholder="ml / mg / tablets / drops" /></label><label>Frequency<input value={medication.frequency} onChange={(e) => setMedication({ ...medication, frequency: e.target.value })} /></label><label>Interval days<input type="number" min="1" value={medication.intervalDays} onChange={(e) => setMedication({ ...medication, intervalDays: Number(e.target.value) || 1 })} /></label><label>Reminder time<input type="time" value={medication.scheduledTime} onChange={(e) => setMedication({ ...medication, scheduledTime: e.target.value })} /></label><label>Start date<input type="date" value={medication.startDate} onChange={(e) => setMedication({ ...medication, startDate: e.target.value })} /></label><label>End date<input type="date" value={medication.endDate ?? ""} onChange={(e) => setMedication({ ...medication, endDate: e.target.value || undefined })} /></label></div><label>Notes<textarea value={medication.notes ?? ""} onChange={(e) => setMedication({ ...medication, notes: e.target.value })} rows={3} /></label><button className="account-button" type="button" onClick={() => void saveMedication()} disabled={saving}>Save Medication Reminder</button>{medications.length > 0 && <div className="notification-history-list">{medications.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{item.dose} {item.unit} · {item.frequency} · {item.scheduledTime}</span></div>)}</div>}</section>
    <section className="personalisation-card"><h2>📜 Reminder history</h2>{history.length === 0 ? <p>No notification history yet. Upcoming reminders will appear here after the scheduler begins processing.</p> : history.slice(0, 30).map((item) => <div className="notification-history-row" key={item.id}><strong>{item.title}</strong><span>{item.status}</span><small>{item.body}</small></div>)}</section>
  </main>;
}
