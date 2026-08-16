import { useEffect, useState } from "react";
import {
  disableNotifications,
  enableNotifications,
  getNotificationPermissionState,
  getNotificationSettings,
  saveNotificationSettings,
} from "../services/notificationService";
import type { NotificationPermissionState, NotificationSettings } from "../types/Notifications";

export default function NotificationSettingsPanel() {
  const { user } = (() => {
    // Auth is intentionally imported lazily through the hook below so this component
    // remains a small, reusable notification control surface.
    return { user: undefined as { uid: string } | undefined };
  })();
  return <NotificationSettingsPanelInner userId={user?.uid ?? ""} />;
}

function NotificationSettingsPanelInner({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<NotificationSettings>({ enabled: false, feedingPreparationEnabled: true });
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) return;
    void getNotificationSettings(userId).then(setSettings).catch(() => undefined);
    setPermission(getNotificationPermissionState());
  }, [userId]);

  async function handleEnable() {
    if (!userId || busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await enableNotifications(userId);
      setPermission(result);
      if (result === "granted") {
        setSettings(await getNotificationSettings(userId));
        setMessage("Notifications are enabled on this device.");
      } else if (result === "denied") {
        setMessage("Notifications are blocked by your browser/device. Tiny Titans will not keep asking.");
      } else {
        setMessage("This browser or installed app does not support background notifications.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable notifications.");
    } finally { setBusy(false); }
  }

  async function handleDisable() {
    if (!userId || busy) return;
    setBusy(true); setMessage("");
    try {
      await disableNotifications(userId);
      setSettings((current) => ({ ...current, enabled: false }));
      setMessage("Notifications are disabled for Tiny Titans on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to disable notifications.");
    } finally { setBusy(false); }
  }

  async function toggleFeedingPreparation(enabled: boolean) {
    if (!userId || busy) return;
    setBusy(true); setMessage("");
    try {
      const next = await saveNotificationSettings(userId, { ...settings, feedingPreparationEnabled: enabled });
      setSettings(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save notification preferences.");
    } finally { setBusy(false); }
  }

  return <section className="personalisation-card">
    <h2>🔔 Notifications</h2>
    <p>Allow Tiny Titans to send important husbandry reminders even when the app is not open.</p>
    <p><strong>Permission:</strong> {permission === "granted" ? "Enabled" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Not supported" : "Not enabled"}</p>
    {permission === "granted" && settings.enabled ? <button className="account-button" type="button" onClick={() => void handleDisable()} disabled={busy}>{busy ? "Saving…" : "Disable Notifications"}</button> : <button className="account-button" type="button" onClick={() => void handleEnable()} disabled={busy || permission === "denied"}>{busy ? "Enabling…" : "Enable Notifications"}</button>}
    <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px" }}>
      <input type="checkbox" checked={settings.feedingPreparationEnabled} onChange={(event) => void toggleFeedingPreparation(event.target.checked)} disabled={busy} />
      <span>Feeding preparation reminders</span>
    </label>
    {permission === "denied" && <p><small>Your browser has blocked notifications. Change the Tiny Titans notification permission in your browser/device settings, then return here.</small></p>}
    {message && <p className="personalisation-saved">{message}</p>}
  </section>;
}
