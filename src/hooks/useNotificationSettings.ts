import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import {
  disableNotifications,
  enableNotifications,
  getNotificationDeviceStatus,
  getNotificationPermissionState,
  getNotificationSettings,
  refreshNotificationRegistration,
  saveNotificationSettings,
} from "../services/notificationService";
import { sendOwnNotificationTest } from "../services/selfNotificationTestService";
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationPermissionState, type NotificationSettings } from "../types/Notifications";

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({ ...DEFAULT_NOTIFICATION_SETTINGS });
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
    if (!user) {
      setDeviceStatus(null);
      return;
    }
    let active = true;
    void getNotificationSettings(user.uid).then((next) => {
      if (active) setSettings(next);
    }).catch(() => undefined);
    void refreshDeviceStatus(user.uid).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  async function enable() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await enableNotifications(user.uid);
      setPermission(result);
      if (result === "granted") {
        setSettings(await getNotificationSettings(user.uid));
        const status = await refreshDeviceStatus(user.uid);
        setMessage(status.registered
          ? "Notifications are enabled and this device is registered for push delivery."
          : "Notifications are permitted, but this device is not registered for push delivery yet. Use Repair connection to try again.");
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

  async function repair() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await enableNotifications(user.uid);
      setPermission(result);
      if (result !== "granted") throw new Error("Tiny Titans could not re-register this browser for notifications.");
      setSettings(await getNotificationSettings(user.uid));
      const status = await refreshDeviceStatus(user.uid);
      setMessage(status.registered
        ? "✅ Notification connection repaired. This device is registered for push delivery."
        : "⚠️ The browser still has permission, but Firebase did not return a usable push token. Check the browser console and service-worker registration, then retry.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to repair notification delivery.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
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

  async function sendTest() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await sendOwnNotificationTest("general");
      setMessage(result.status === "sent"
        ? `✅ Test notification sent to ${result.sentCount} registered device${result.sentCount === 1 ? "" : "s"}. Check your phone now.`
        : "⚠️ Firebase recorded no delivery token for this account. Repair the connection and try again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send the notification test.");
    } finally {
      setBusy(false);
    }
  }

  const locked = busy || !settings.enabled;
  const ready = permission === "granted" && settings.enabled && deviceStatus?.registered === true;
  const needsRepair = permission === "granted" && settings.enabled && !deviceStatus?.registered;

  return { settings, permission, deviceStatus, busy, message, locked, ready, needsRepair, enable, repair, disable, save, sendTest };
}
