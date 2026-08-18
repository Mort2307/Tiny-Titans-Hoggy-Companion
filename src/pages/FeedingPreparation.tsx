import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import TinyTitansDateInput from "../components/TinyTitansDateInput";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getFeedingSchedule, saveFeedingSchedule } from "../services/feedingScheduleService";
import type { FeedingSchedule, Snake } from "../types/Snake";
import { getNotificationPermissionState, getNotificationSettings } from "../services/notificationService";
import type { NotificationSettings } from "../types/Notifications";

const defaultNotifications: NotificationSettings = { enabled: false, feedingPreparationEnabled: false, feedingPreparationDaysBefore: 0, feedingPreparationTime: "08:00" };

export default function FeedingPreparation() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]); const [selectedSnakeId, setSelectedSnakeId] = useState(""); const [schedule, setSchedule] = useState<FeedingSchedule | null>(null); const [loadedScheduleKey, setLoadedScheduleKey] = useState<string | null>(null); const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications); const [permission, setPermission] = useState(getNotificationPermissionState()); const [saving, setSaving] = useState(false); const [loadingPage, setLoadingPage] = useState(true); const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    void Promise.all([getUserSnakes(user.uid), getNotificationSettings(user.uid)]).then(([loadedSnakes, loadedNotifications]) => { const valid = loadedSnakes.filter((snake) => Boolean(snake?.id)); setSnakes(valid); setSelectedSnakeId((current) => valid.some((snake) => snake.id === current) ? current : valid[0]?.id ?? ""); setNotifications(loadedNotifications); setPermission(getNotificationPermissionState()); }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load feeding preparation settings.")).finally(() => setLoadingPage(false));
  }, [user, loading, profileLoading]);

  const scheduleKey = user && selectedSnakeId ? `${user.uid}:${selectedSnakeId}` : null;

  useEffect(() => {
    if (!user || !selectedSnakeId) return;
    const snake = snakes.find((item) => item.id === selectedSnakeId);
    void getFeedingSchedule(user.uid, selectedSnakeId, snake?.lastMealDate).then((loaded) => { setSchedule(loaded); setLoadedScheduleKey(scheduleKey); }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load this feeding schedule."));
  }, [user, selectedSnakeId, snakes, scheduleKey]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const visibleSchedule = scheduleKey && loadedScheduleKey === scheduleKey ? schedule : null;
  const usingGlobalReminder = visibleSchedule ? visibleSchedule.preparationReminderDaysBefore === notifications.feedingPreparationDaysBefore && visibleSchedule.preparationReminderTime === notifications.feedingPreparationTime : true;

  async function saveSchedule() {
    if (!user || !selectedSnakeId || !visibleSchedule || saving) return;
    setSaving(true); setMessage("");
    try { const saved = await saveFeedingSchedule(user.uid, selectedSnakeId, visibleSchedule); setSchedule(saved); setLoadedScheduleKey(scheduleKey); setMessage("Feeding schedule saved. Your chosen preparation reminder will be used without changing the feeding date."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save this feeding schedule."); } finally { setSaving(false); }
  }

  function useGlobalReminder() { if (!visibleSchedule) return; setSchedule({ ...visibleSchedule, preparationReminderDaysBefore: notifications.feedingPreparationDaysBefore, preparationReminderTime: notifications.feedingPreparationTime, preparationReminderEnabled: notifications.feedingPreparationEnabled }); }

  if (loading || profileLoading || (Boolean(user) && loadingPage)) return <div className="page-container"><BackHomeButton /><div className="tracker-card"><p>Loading Tiny Titans...</p></div></div>;

  const snakeContent = snakes.length === 0
    ? <div className="tracker-card"><h3>No snakes found 🐍</h3><p>Add a snake before configuring feeding reminders.</p><button type="button" onClick={() => navigate("/snakes/new")}>➕ Add Your First Snake</button></div>
    : <>
        <div className="tracker-card"><h2>🐍 Snake</h2><label htmlFor="preparation-snake">Configure feeding reminders for</label><select id="preparation-snake" value={selectedSnakeId} onChange={(event) => setSelectedSnakeId(event.target.value)} disabled={saving}>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select>{selectedSnake && <p>🧬 {selectedSnake.morphs?.join(", ") || "Morph not recorded"}</p>}</div>
        {visibleSchedule && <div className="tracker-card">
          <h2>⏰ Recurring feeding schedule</h2>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}><input type="checkbox" checked={visibleSchedule.enabled} onChange={(event) => setSchedule({ ...visibleSchedule, enabled: event.target.checked })} disabled={saving} />Enable recurring feeding schedule</label>
          <label htmlFor="feeding-interval">Feed every</label><select id="feeding-interval" value={visibleSchedule.intervalDays} onChange={(event) => setSchedule({ ...visibleSchedule, intervalDays: Number(event.target.value) })} disabled={saving || !visibleSchedule.enabled}>{[5, 7, 10, 14, 21, 28, 30].map((days) => <option key={days} value={days}>{days} days</option>)}</select>
          <TinyTitansDateInput id="next-feeding-date" label="Next feeding date" value={visibleSchedule.nextFeedingDate} onChange={(value) => setSchedule({ ...visibleSchedule, nextFeedingDate: value })} disabled={saving || !visibleSchedule.enabled} helpText="Type DD/MM/YYYY or use the calendar." />
          <h3 style={{ marginTop: "20px" }}>🔔 Preparation reminder for {selectedSnake?.name || "this snake"}</h3>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}><input type="checkbox" checked={visibleSchedule.notificationsEnabled} onChange={(event) => setSchedule({ ...visibleSchedule, notificationsEnabled: event.target.checked })} disabled={saving || !visibleSchedule.enabled} />Allow feeding notifications for this snake</label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}><input type="checkbox" checked={visibleSchedule.preparationReminderEnabled} onChange={(event) => setSchedule({ ...visibleSchedule, preparationReminderEnabled: event.target.checked })} disabled={saving || !visibleSchedule.enabled || !visibleSchedule.notificationsEnabled} />Send preparation reminder</label>
          <label htmlFor="snake-prep-days">Remind me</label><select id="snake-prep-days" value={visibleSchedule.preparationReminderDaysBefore} onChange={(event) => setSchedule({ ...visibleSchedule, preparationReminderDaysBefore: Number(event.target.value) })} disabled={saving || !visibleSchedule.enabled || !visibleSchedule.notificationsEnabled || !visibleSchedule.preparationReminderEnabled}>{Array.from({ length: 31 }, (_, days) => <option key={days} value={days}>{days === 0 ? "On feeding day" : `${days} day${days === 1 ? "" : "s"} before feeding`}</option>)}</select>
          <label htmlFor="snake-prep-time">At</label><input id="snake-prep-time" type="time" value={visibleSchedule.preparationReminderTime} onChange={(event) => setSchedule({ ...visibleSchedule, preparationReminderTime: event.target.value })} disabled={saving || !visibleSchedule.enabled || !visibleSchedule.notificationsEnabled || !visibleSchedule.preparationReminderEnabled} />
          <p><small>You can choose any lead time from the same day through 30 days before feeding, plus any time of day. This reminder timing is completely independent of the feeding interval.</small></p>
          {!usingGlobalReminder && <button type="button" onClick={useGlobalReminder} disabled={saving}>↩ Use my global notification timing</button>}
          <button type="button" onClick={() => void saveSchedule()} disabled={saving}>{saving ? "💾 Saving…" : "💾 Save Feeding Schedule"}</button>
        </div>}
      </>;

  return <div className="page-container"><BackHomeButton /><h1>🍽️ Feeding Preparation</h1><p>Take complete control of preparation reminders. Choose the lead time and time of day for each snake. Tiny Titans never assumes that two days is enough and never changes the scheduled feeding date because of a reminder.</p><div className="tracker-card"><h2>🔔 Notification status</h2><p><strong>Device permission:</strong> {permission === "granted" ? "Granted" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Not supported" : "Not enabled"}</p><p><strong>Global notifications:</strong> {notifications.enabled ? "Enabled" : "Disabled"}</p><p><strong>Feeding preparation:</strong> {notifications.feedingPreparationEnabled ? "Enabled" : "Disabled"}</p>{permission !== "granted" || !notifications.enabled ? <p>Enable notifications from <strong>Settings → Notifications</strong> before expecting phone/browser alerts while Tiny Titans is closed.</p> : <p>✅ Background notification delivery is configured for this device.</p>}</div>{snakeContent}{message && <div className="tracker-card" role="status">ℹ️ {message}</div>}</div>;
}
