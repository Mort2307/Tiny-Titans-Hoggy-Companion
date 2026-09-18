import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { disableNotifications, enableNotifications, getNotificationDeviceStatus, getNotificationPermissionState, getNotificationSettings, refreshNotificationRegistration, saveNotificationSettings } from "../services/notificationService";
import { sendOwnNotificationTest } from "../services/selfNotificationTestService";
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationPermissionState, type NotificationSettings } from "../types/Notifications";

const defaultSettings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };

export default function NotificationSettingsPanel() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionState());
  const [deviceStatus, setDeviceStatus] = useState<Awaited<ReturnType<typeof getNotificationDeviceStatus>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshDeviceStatus(uid: string) {
    let status = await getNotificationDeviceStatus(uid);
    if (status.settingsEnabled && status.permission === "granted" && status.supported) {
      await refreshNotificationRegistration(uid);
      status = await getNotificationDeviceStatus(uid);
    }
    setPermission(status.permission);
    setDeviceStatus(status);
    return status;
  }

  useEffect(() => {
    if (!user) { setDeviceStatus(null); return; }
    let active = true;
    void getNotificationSettings(user.uid).then((next) => { if (active) setSettings(next); }).catch(() => undefined);
    void refreshDeviceStatus(user.uid).then(() => undefined).catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  async function handleEnable() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await enableNotifications(user.uid);
      setPermission(result);
      if (result === "granted") {
        setSettings(await getNotificationSettings(user.uid));
        const status = await refreshDeviceStatus(user.uid);
        setMessage(status.registered ? "Notifications are enabled and this device is registered for push delivery." : "Notifications are permitted, but this device is not registered for push delivery yet. Use Repair connection to try again.");
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

  async function handleRepair() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await enableNotifications(user.uid);
      setPermission(result);
      if (result !== "granted") throw new Error("Tiny Titans could not re-register this browser for notifications.");
      setSettings(await getNotificationSettings(user.uid));
      const status = await refreshDeviceStatus(user.uid);
      setMessage(status.registered ? "✅ Notification connection repaired. This device is registered for push delivery." : "⚠️ The browser still has permission, but Firebase did not return a usable push token. Check the browser console and service-worker registration, then retry.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to repair notification delivery.");
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
      setDeviceStatus(null);
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
  const ready = permission === "granted" && settings.enabled && deviceStatus?.registered === true;
  const needsRepair = permission === "granted" && settings.enabled && !deviceStatus?.registered;
  return (
    <div className="tt-notification-settings">
      <div className="tt-notification-status-row">
        <div>
          <span className="tt-notification-status-dot" aria-hidden="true" />
          <strong>{ready ? "Ready to receive reminders" : needsRepair ? "Notification connection needs repair" : "Notifications not active"}</strong>
        </div>
        <span className="tt-notification-permission">{deviceStatus?.installRequired ? "Home Screen install required" : permission === "granted" ? deviceStatus?.registered ? `Push registered · ${deviceStatus.tokenCount} device${deviceStatus.tokenCount === 1 ? "" : "s"}` : "Permission granted" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Unsupported" : "Needs setup"}</span>
      </div>

      <div className="tt-notification-enable-row">
        <div><strong>Device notifications</strong><p>Allow Tiny Titans to alert you even when the app is not the page you are looking at.</p></div>
        {permission === "granted" && settings.enabled ? <div className="tt-notification-enable-actions"><button className="tt-settings-control-button" type="button" onClick={() => void handleRepair()} disabled={busy}>{busy ? "Repairing…" : "Repair connection"}</button><button className="tt-settings-control-button secondary" type="button" onClick={() => void handleDisable()} disabled={busy}>{busy ? "Saving…" : "Disable"}</button></div> : <button className="tt-settings-control-button" type="button" onClick={() => void handleEnable()} disabled={busy || permission === "denied"}>{busy ? "Enabling…" : "Enable notifications"}</button>}
      </div>

      <div className="tt-notification-device-tools">
        <div>
          <strong>📱 Delivery check</strong>
          <p>{deviceStatus?.installRequired ? "On iPhone or iPad, add Tiny Titans to your Home Screen first." : deviceStatus?.registered ? `${deviceStatus.tokenCount} registered device${deviceStatus.tokenCount === 1 ? "" : "s"} · service worker ${deviceStatus.serviceWorkerReady ? "ready" : "not ready"}.` : "Register this device, then send a live test notification before relying on scheduled reminders."}</p>
        </div>
        <button className="tt-settings-control-button secondary" type="button" disabled={!ready || busy} onClick={async () => { if (!user || busy) return; setBusy(true); setMessage(""); try { const result = await sendOwnNotificationTest("general"); setMessage(result.status === "sent" ? `✅ Test notification sent to ${result.sentCount} registered device${result.sentCount === 1 ? "" : "s"}. Check your phone now.` : "⚠️ Firebase recorded no delivery token for this account. Repair the connection and try again."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to send the notification test."); } finally { setBusy(false); } }}>{busy ? "Working…" : "Send test to my devices"}</button>
      </div>
      <div className="tt-notification-setting-group">
        <div className="tt-notification-setting-row"><div><strong>🍽️ Feeding reminders</strong><p>Alert when a scheduled feeding is due.</p></div><input type="checkbox" checked={settings.feedingRemindersEnabled} onChange={(event) => void save({ ...settings, feedingRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Feeding reminders" /></div>
        <div className="tt-notification-setting-row"><div><strong>🥩 Feeding preparation</strong><p>Prepare prey ahead of the next scheduled meal.</p></div><input type="checkbox" checked={settings.feedingPreparationEnabled} onChange={(event) => void save({ ...settings, feedingPreparationEnabled: event.target.checked })} disabled={locked} aria-label="Feeding preparation reminders" /></div>
        {settings.feedingPreparationEnabled && <div className="tt-notification-inline-fields"><label>Preparation lead time<select value={settings.feedingPreparationDaysBefore} onChange={(event) => void save({ ...settings, feedingPreparationDaysBefore: Number(event.target.value) })} disabled={locked}>{Array.from({ length: 31 }, (_, days) => <option key={days} value={days}>{days === 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"} before`}</option>)}</select></label><label>Preparation time<input type="time" value={settings.feedingPreparationTime} onChange={(event) => void save({ ...settings, feedingPreparationTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong>⚖️ Weight reminders</strong><p>Detailed recurring schedules now live in the Reminder Hub.</p><Link className="tt-notification-reminder-link" to="/reminders?type=weight">Open Weight reminders →</Link></div><input type="checkbox" checked={settings.weightRemindersEnabled} onChange={(event) => void save({ ...settings, weightRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Legacy weight reminders" /></div>
        {settings.weightRemindersEnabled && <div className="tt-notification-inline-fields single"><label>Legacy weight reminder time<input type="time" value={settings.weightReminderTime} onChange={(event) => void save({ ...settings, weightReminderTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong>🐍 Shed cycle reminders</strong><p>Get a check-in when a snake has remained in an active shed cycle for the configured number of days.</p></div><input type="checkbox" checked={settings.shedRemindersEnabled} onChange={(event) => void save({ ...settings, shedRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Shed cycle reminders" /></div>
        {settings.shedRemindersEnabled && <div className="tt-notification-inline-fields"><label>Active-cycle check-in<select value={settings.shedReminderDays} onChange={(event) => void save({ ...settings, shedReminderDays: Number(event.target.value) })} disabled={locked}>{Array.from({ length: 30 }, (_, index) => { const days = index + 1; return <option key={days} value={days}>{days} day{days === 1 ? "" : "s"}</option>; })}</select></label><label>Check-in time<input type="time" value={settings.shedReminderTime} onChange={(event) => void save({ ...settings, shedReminderTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong>🩺 Health, medication & vet</strong><p>Keep treatment and follow-up deadlines from disappearing into the void.</p></div><input type="checkbox" checked={settings.healthRemindersEnabled} onChange={(event) => void save({ ...settings, healthRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Health reminders" /></div>
        {settings.healthRemindersEnabled && <div className="tt-notification-inline-fields"><label>Missed medication follow-up<select value={settings.medicationMissedFollowUpMinutes} onChange={(event) => void save({ ...settings, medicationMissedFollowUpMinutes: Number(event.target.value) })} disabled={locked}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="720">12 hours</option></select></label><label>Health follow-up lead<select value={settings.healthFollowUpLeadDays} onChange={(event) => void save({ ...settings, healthFollowUpLeadDays: Number(event.target.value) })} disabled={locked}><option value="0">Same day</option><option value="1">1 day before</option><option value="2">2 days before</option><option value="3">3 days before</option><option value="7">7 days before</option><option value="14">14 days before</option></select></label></div>}
      </div>

      {message && <div className="tt-notification-settings-message" role="status">{message}</div>}
    </div>
  );
}
