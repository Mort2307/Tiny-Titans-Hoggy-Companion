import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { disableNotifications, enableNotifications, getNotificationPermissionState, getNotificationSettings, saveNotificationSettings } from "../services/notificationService";
import type { NotificationPermissionState, NotificationSettings } from "../types/Notifications";

const defaultSettings: NotificationSettings = {
  enabled: false,
  feedingPreparationEnabled: false,
  feedingPreparationDaysBefore: 0,
  feedingPreparationTime: "08:00",
};

export default function NotificationSettingsPanel() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    void getNotificationSettings(user.uid).then(setSettings).catch(() => undefined);
    setPermission(getNotificationPermissionState());
  }, [user]);

  async function handleEnable() {
    if (!user || busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await enableNotifications(user.uid);
      setPermission(result);
      if (result === "granted") { setSettings(await getNotificationSettings(user.uid)); setMessage("Notifications are enabled on this device."); }
      else if (result === "denied") setMessage("Notifications are blocked by your browser/device. Tiny Titans will not keep asking.");
      else setMessage("This browser or installed app does not support background notifications.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to enable notifications."); }
    finally { setBusy(false); }
  }

  async function handleDisable() {
    if (!user || busy) return;
    setBusy(true); setMessage("");
    try { await disableNotifications(user.uid); setSettings((current) => ({ ...current, enabled: false })); setMessage("Notifications are disabled for Tiny Titans on this device."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to disable notifications."); }
    finally { setBusy(false); }
  }

  async function save(next: NotificationSettings) {
    if (!user || busy) return;
    setBusy(true); setMessage("");
    try { setSettings(await saveNotificationSettings(user.uid, next)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save notification preferences."); }
    finally { setBusy(false); }
  }

  return <section className="personalisation-card">
    <h2>🔔 Notifications</h2>
    <p>Feeding preparation reminders are completely keeper-controlled. Tiny Titans never assumes a preparation window and never changes a feeding date because of a reminder.</p>
    <p><strong>Permission:</strong> {permission === "granted" ? "Enabled" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Not supported" : "Not enabled"}</p>
    {permission === "granted" && settings.enabled ? <button className="account-button" type="button" onClick={() => void handleDisable()} disabled={busy}>{busy ? "Saving…" : "Disable Notifications"}</button> : <button className="account-button" type="button" onClick={() => void handleEnable()} disabled={busy || permission === "denied"}>{busy ? "Enabling…" : "Enable Notifications"}</button>}

    <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px" }}>
      <input type="checkbox" checked={settings.feedingPreparationEnabled} onChange={(event) => void save({ ...settings, feedingPreparationEnabled: event.target.checked })} disabled={busy || !settings.enabled} />
      <span><strong>Feeding preparation reminders</strong></span>
    </label>

    <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
      <label htmlFor="global-feeding-prep-days">Default preparation lead time</label>
      <select id="global-feeding-prep-days" value={settings.feedingPreparationDaysBefore} onChange={(event) => void save({ ...settings, feedingPreparationDaysBefore: Number(event.target.value) })} disabled={busy || !settings.enabled || !settings.feedingPreparationEnabled}>
        {Array.from({ length: 31 }, (_, days) => <option key={days} value={days}>{days === 0 ? "On feeding day" : `${days} day${days === 1 ? "" : "s"} before feeding`}</option>)}
      </select>

      <label htmlFor="global-feeding-prep-time">Default reminder time</label>
      <input id="global-feeding-prep-time" type="time" value={settings.feedingPreparationTime} onChange={(event) => void save({ ...settings, feedingPreparationTime: event.target.value })} disabled={busy || !settings.enabled || !settings.feedingPreparationEnabled} />

      <small>This is only a global default. Every snake can have its own reminder timing in Feeding → Feeding Preparation, including a different lead time or reminder time.</small>
    </div>
    {permission === "denied" && <p><small>Your browser has blocked notifications. Change the Tiny Titans notification permission in your browser/device settings, then return here.</small></p>}
    {message && <p className="personalisation-saved">{message}</p>}
  </section>;
}
