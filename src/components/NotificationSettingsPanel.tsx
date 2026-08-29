import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { disableNotifications, enableNotifications, getNotificationPermissionState, getNotificationSettings, saveNotificationSettings } from "../services/notificationService";
import type { NotificationPermissionState, NotificationSettings } from "../types/Notifications";

const defaultSettings: NotificationSettings = { enabled: false, feedingPreparationEnabled: false, feedingPreparationDaysBefore: 0, feedingPreparationTime: "08:00", feedingRemindersEnabled: true, weightRemindersEnabled: true, weightReminderTime: "09:00", healthRemindersEnabled: true, healthReminderFollowUpEnabled: true, medicationMissedFollowUpMinutes: 60, healthFollowUpLeadDays: 1 };

export default function NotificationSettingsPanel() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (!user) return; void getNotificationSettings(user.uid).then(setSettings).catch(() => undefined); }, [user]);

  async function handleEnable() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await enableNotifications(user.uid);
      setPermission(result);
      if (result === "granted") {
        setSettings(await getNotificationSettings(user.uid));
        setMessage("Notifications are enabled on this device.");
      } else if (result === "denied") {
        setMessage("Notifications are blocked by your browser/device. Change the Tiny Titans notification permission in browser settings.");
      } else {
        setMessage("This browser or installed app does not support background notifications.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await disableNotifications(user.uid);
      setSettings((current) => ({ ...current, enabled: false }));
      setMessage("Notifications are disabled for Tiny Titans on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function save(next: NotificationSettings) {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      setSettings(await saveNotificationSettings(user.uid, next));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save notification preferences.");
    } finally {
      setBusy(false);
    }
  }

  const locked = busy || !settings.enabled;
  return (
    <div className="tt-notification-settings">
      <div className="tt-notification-status-row">
        <div>
          <span className="tt-notification-status-dot" aria-hidden="true" />
          <strong>{permission === "granted" && settings.enabled ? "Ready to receive reminders" : "Notifications not active"}</strong>
        </div>
        <span className="tt-notification-permission">{permission === "granted" ? "Permission granted" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Unsupported" : "Needs setup"}</span>
      </div>

      <div className="tt-notification-enable-row">
        <div><strong>Device notifications</strong><p>Allow Tiny Titans to alert you even when the app is not the page you are looking at.</p></div>
        {permission === "granted" && settings.enabled ? <button className="tt-settings-control-button secondary" type="button" onClick={() => void handleDisable()} disabled={busy}>{busy ? "Saving…" : "Disable"}</button> : <button className="tt-settings-control-button" type="button" onClick={() => void handleEnable()} disabled={busy || permission === "denied"}>{busy ? "Enabling…" : "Enable notifications"}</button>}
      </div>

      <div className="tt-notification-setting-group">
        <div className="tt-notification-setting-row"><div><strong>🍽️ Feeding reminders</strong><p>Alert when a scheduled feeding is due.</p></div><input type="checkbox" checked={settings.feedingRemindersEnabled} onChange={(event) => void save({ ...settings, feedingRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Feeding reminders" /></div>
        <div className="tt-notification-setting-row"><div><strong>🥩 Feeding preparation</strong><p>Prepare prey ahead of the next scheduled meal.</p></div><input type="checkbox" checked={settings.feedingPreparationEnabled} onChange={(event) => void save({ ...settings, feedingPreparationEnabled: event.target.checked })} disabled={locked} aria-label="Feeding preparation reminders" /></div>
        {settings.feedingPreparationEnabled && <div className="tt-notification-inline-fields"><label>Preparation lead time<select value={settings.feedingPreparationDaysBefore} onChange={(event) => void save({ ...settings, feedingPreparationDaysBefore: Number(event.target.value) })} disabled={locked}>{Array.from({ length: 31 }, (_, days) => <option key={days} value={days}>{days === 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"} before`}</option>)}</select></label><label>Preparation time<input type="time" value={settings.feedingPreparationTime} onChange={(event) => void save({ ...settings, feedingPreparationTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong>⚖️ Weight reminders</strong><p>Follow each snake's weekly, fortnightly, three-week or monthly cadence.</p></div><input type="checkbox" checked={settings.weightRemindersEnabled} onChange={(event) => void save({ ...settings, weightRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Weight reminders" /></div>
        {settings.weightRemindersEnabled && <div className="tt-notification-inline-fields single"><label>Weight reminder time<input type="time" value={settings.weightReminderTime} onChange={(event) => void save({ ...settings, weightReminderTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong>🩺 Health, medication & vet</strong><p>Keep treatment and follow-up deadlines from disappearing into the void.</p></div><input type="checkbox" checked={settings.healthRemindersEnabled} onChange={(event) => void save({ ...settings, healthRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Health reminders" /></div>
        {settings.healthRemindersEnabled && <div className="tt-notification-inline-fields"><label>Missed medication follow-up<select value={settings.medicationMissedFollowUpMinutes} onChange={(event) => void save({ ...settings, medicationMissedFollowUpMinutes: Number(event.target.value) })} disabled={locked}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="720">12 hours</option></select></label><label>Health follow-up lead<select value={settings.healthFollowUpLeadDays} onChange={(event) => void save({ ...settings, healthFollowUpLeadDays: Number(event.target.value) })} disabled={locked}><option value="0">Same day</option><option value="1">1 day before</option><option value="2">2 days before</option><option value="3">3 days before</option><option value="7">7 days before</option><option value="14">14 days before</option></select></label></div>}
      </div>

      {message && <div className="tt-notification-settings-message" role={message.includes("enabled") || message.includes("disabled") ? "status" : "alert"}>{message}</div>}
    </div>
  );
}
