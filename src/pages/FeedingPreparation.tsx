import { useEffect, useMemo, useState } from "react";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/AuthContext";
import { getUserSnakes } from "../services/snakeService";
import { getFeedingSchedule, saveFeedingSchedule } from "../services/feedingScheduleService";
import type { FeedingSchedule, Snake } from "../types/Snake";
import { getNotificationPermissionState, getNotificationSettings } from "../services/notificationService";
import type { NotificationSettings } from "../types/Notifications";

export default function FeedingPreparation() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [schedule, setSchedule] = useState<FeedingSchedule | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({ enabled: false, feedingPreparationEnabled: true });
  const [permission, setPermission] = useState(getNotificationPermissionState());
  const [saving, setSaving] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) { setSnakes([]); setLoadingPage(false); return; }
    void Promise.all([getUserSnakes(user.uid), getNotificationSettings(user.uid)])
      .then(([loadedSnakes, loadedNotifications]) => {
        const valid = loadedSnakes.filter((snake) => Boolean(snake?.id));
        setSnakes(valid);
        setSelectedSnakeId((current) => valid.some((snake) => snake.id === current) ? current : valid[0]?.id ?? "");
        setNotifications(loadedNotifications);
        setPermission(getNotificationPermissionState());
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load feeding preparation settings."))
      .finally(() => setLoadingPage(false));
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (!user || !selectedSnakeId) { setSchedule(null); return; }
    const snake = snakes.find((item) => item.id === selectedSnakeId);
    void getFeedingSchedule(user.uid, selectedSnakeId, snake?.lastMealDate)
      .then(setSchedule)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load this feeding schedule."));
  }, [user, selectedSnakeId, snakes]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);

  async function saveSchedule() {
    if (!user || !selectedSnakeId || !schedule || saving) return;
    setSaving(true); setMessage("");
    try {
      const saved = await saveFeedingSchedule(user.uid, selectedSnakeId, schedule);
      setSchedule(saved);
      setMessage("Feeding schedule saved. The preparation micro-system will now use this date.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this feeding schedule.");
    } finally { setSaving(false); }
  }

  if (loading || profileLoading || loadingPage) return <div className="page-container"><BackHomeButton /><div className="tracker-card"><p>Loading Tiny Titans...</p></div></div>;

  return <div className="page-container">
    <BackHomeButton />
    <h1>🧊 Feeding Preparation</h1>
    <p>Set a recurring feeding date and Tiny Titans will handle the preparation reminders automatically.</p>

    <div className="tracker-card">
      <h2>🔔 Micro-system status</h2>
      <p><strong>Device permission:</strong> {permission === "granted" ? "Granted" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Not supported" : "Not enabled"}</p>
      <p><strong>Global notifications:</strong> {notifications.enabled ? "Enabled" : "Disabled"}</p>
      <p><strong>Feeding preparation:</strong> {notifications.feedingPreparationEnabled ? "Enabled" : "Disabled"}</p>
      {permission !== "granted" || !notifications.enabled ? <p>Enable notifications from <strong>Settings → Notifications</strong> before expecting phone/browser alerts while Tiny Titans is closed.</p> : <p>✅ Background notification delivery is configured for this device.</p>}
    </div>

    {snakes.length === 0 ? <div className="tracker-card"><h3>No snakes found 🐍</h3><p>Add a snake before configuring feeding reminders.</p></div> : <>
      <div className="tracker-card">
        <h2>🐍 Snake</h2>
        <label htmlFor="preparation-snake">Configure feeding reminders for</label>
        <select id="preparation-snake" value={selectedSnakeId} onChange={(event) => setSelectedSnakeId(event.target.value)} disabled={saving}>
          {snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}
        </select>
        {selectedSnake && <p>🧬 {selectedSnake.morphs?.join(", ") || "Morph not recorded"}</p>}
      </div>

      {schedule && <div className="tracker-card">
        <h2>⏰ Recurring feeding schedule</h2>
        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}><input type="checkbox" checked={schedule.enabled} onChange={(event) => setSchedule({ ...schedule, enabled: event.target.checked })} disabled={saving} /> Enable recurring feeding schedule</label>
        <label htmlFor="feeding-interval">Feed every</label>
        <select id="feeding-interval" value={schedule.intervalDays} onChange={(event) => setSchedule({ ...schedule, intervalDays: Number(event.target.value) })} disabled={saving || !schedule.enabled}>
          {[5, 7, 10, 14, 21, 28, 30].map((days) => <option key={days} value={days}>{days} days</option>)}
        </select>
        <label htmlFor="next-feeding-date">Next feeding date</label>
        <input id="next-feeding-date" type="date" value={schedule.nextFeedingDate} onChange={(event) => setSchedule({ ...schedule, nextFeedingDate: event.target.value })} disabled={saving || !schedule.enabled} />
        <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px" }}><input type="checkbox" checked={schedule.notificationsEnabled} onChange={(event) => setSchedule({ ...schedule, notificationsEnabled: event.target.checked })} disabled={saving || !schedule.enabled} /> Send feeding preparation notifications for this snake</label>
        <p><small>Notifications are sent at the configured daily reminder run: 2 days before, 1 day before, and on feeding day.</small></p>
        <button type="button" onClick={() => void saveSchedule()} disabled={saving}>{saving ? "💾 Saving…" : "💾 Save Feeding Schedule"}</button>
      </div>}
    </>}
    {message && <div className="tracker-card" role="status">ℹ️ {message}</div>}
  </div>;
}
