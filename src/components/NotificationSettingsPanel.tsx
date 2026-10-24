import { useState } from "react";
import { Link } from "react-router-dom";
import { registerActiveMessagingWorker } from "../services/messagingWorkerRegistration";
import { useNotificationSettings } from "../hooks/useNotificationSettings";
import type { NotificationSettings } from "../types/Notifications";
import TinyTitansIcon from "./TinyTitansIcon";

export default function NotificationSettingsPanel() {
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewIcon = async () => {
    if (previewBusy) return;
    setPreviewBusy(true);
    setPreviewMessage("");
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        throw new Error("Please enable notifications on this device first.");
      }
      const worker = await registerActiveMessagingWorker();
      await worker.showNotification("TinyTitans notification logo test", {
        body: "Expanded notification: full TinyTitans logo. Android status bar: monochrome TinyTitans symbol.",
        icon: new URL("/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg?v=3", location.origin).href,
        badge: new URL("/tiny-titans-notification-badge.png?icon-preview=2", location.origin).href,
        tag: "tiny-titans-icon-preview",
        data: { url: "/account/settings" },
      });
      setPreviewMessage("Display check requested. Check the notification shade and the small Android status icon. This is a local preview, not an FCM delivery test.");
    } catch (error) {
      setPreviewMessage(error instanceof Error ? error.message : "Could not preview notification artwork.");
    } finally { setPreviewBusy(false); }
  };
  const {
    settings, permission, deviceStatus, busy, message, locked, ready, needsRepair,
    enable, repair, disable, save, sendTest,
  } = useNotificationSettings();

  const update = (patch: Partial<NotificationSettings>) => void save({ ...settings, ...patch });

  return (
    <div className="tt-notification-settings">
      <div className="tt-notification-status-row">
        <div><span className="tt-notification-status-dot" aria-hidden="true" /><strong>{ready ? "Ready to receive reminders" : needsRepair ? "Notification connection needs repair" : "Notifications not active"}</strong></div>
        <span className="tt-notification-permission">{deviceStatus?.installRequired ? "Home Screen install required" : permission === "granted" ? deviceStatus?.registered ? `Push registered · ${deviceStatus.tokenCount} device${deviceStatus.tokenCount === 1 ? "" : "s"}` : "Permission granted" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Unsupported" : "Needs setup"}</span>
      </div>

      <div className="tt-notification-enable-row">
        <div><strong>Device notifications</strong><p>Allow Tiny Titans to alert you even when the app is not the page you are looking at.</p></div>
        {permission === "granted" && settings.enabled
          ? <div className="tt-notification-enable-actions"><button className="tt-settings-control-button" type="button" onClick={() => void repair()} disabled={busy}>{busy ? "Repairing…" : "Repair connection"}</button><button className="tt-settings-control-button secondary" type="button" onClick={() => void disable()} disabled={busy}>{busy ? "Saving…" : "Disable"}</button></div>
          : <button className="tt-settings-control-button" type="button" onClick={() => void enable()} disabled={busy || permission === "denied"}>{busy ? "Enabling…" : "Enable notifications"}</button>}
      </div>

      <div className="tt-notification-device-tools">
        <div><strong><TinyTitansIcon name="messages" size={16} /> Delivery check</strong><p>{deviceStatus?.installRequired ? "On iPhone or iPad, add Tiny Titans to your Home Screen first." : deviceStatus?.registered ? `${deviceStatus.tokenCount} registered device${deviceStatus.tokenCount === 1 ? "" : "s"} · service worker ${deviceStatus.serviceWorkerReady ? "ready" : "not ready"}.` : "Register this device, then send a live test notification before relying on scheduled reminders."}</p></div>
        <button className="tt-settings-control-button secondary" type="button" disabled={!ready || busy} onClick={() => void sendTest()}>{busy ? "Working…" : "Send test to my devices"}</button>
        <button className="tt-settings-control-button secondary" type="button" disabled={previewBusy || permission !== "granted"} onClick={() => void previewIcon()}>{previewBusy ? "Previewing…" : "Preview notification logo"}</button>
      </div>

      <div className="tt-notification-setting-group">
        <div className="tt-notification-setting-row"><div><strong><TinyTitansIcon name="feeding" size={16} /> Feeding reminders</strong><p>Alert when a scheduled feeding is due.</p></div><input type="checkbox" checked={settings.feedingRemindersEnabled} onChange={(event) => update({ feedingRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Feeding reminders" /></div>
        <div className="tt-notification-setting-row"><div><strong><TinyTitansIcon name="feeding" size={16} /> Feeding preparation</strong><p>Prepare prey ahead of the next scheduled meal.</p></div><input type="checkbox" checked={settings.feedingPreparationEnabled} onChange={(event) => update({ feedingPreparationEnabled: event.target.checked })} disabled={locked} aria-label="Feeding preparation reminders" /></div>
        {settings.feedingPreparationEnabled && <div className="tt-notification-inline-fields"><label>Preparation lead time<select value={settings.feedingPreparationDaysBefore} onChange={(event) => update({ feedingPreparationDaysBefore: Number(event.target.value) })} disabled={locked}>{Array.from({ length: 31 }, (_, days) => <option key={days} value={days}>{days === 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"} before`}</option>)}</select></label><label>Preparation time<input type="time" value={settings.feedingPreparationTime} onChange={(event) => update({ feedingPreparationTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong><TinyTitansIcon name="weight" size={16} /> Weight reminders</strong><p>Detailed recurring schedules now live in the Reminder Hub.</p><Link className="tt-notification-reminder-link" to="/reminders?type=weight">Open Weight reminders <TinyTitansIcon name="forward" size={13} /></Link></div><input type="checkbox" checked={settings.weightRemindersEnabled} onChange={(event) => update({ weightRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Legacy weight reminders" /></div>
        {settings.weightRemindersEnabled && <div className="tt-notification-inline-fields single"><label>Legacy weight reminder time<input type="time" value={settings.weightReminderTime} onChange={(event) => update({ weightReminderTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong><TinyTitansIcon name="shed" size={16} /> Shed cycle reminders</strong><p>Get a check-in when a snake has remained in an active shed cycle for the configured number of days.</p></div><input type="checkbox" checked={settings.shedRemindersEnabled} onChange={(event) => update({ shedRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Shed cycle reminders" /></div>
        {settings.shedRemindersEnabled && <div className="tt-notification-inline-fields"><label>Active-cycle check-in<select value={settings.shedReminderDays} onChange={(event) => update({ shedReminderDays: Number(event.target.value) })} disabled={locked}>{Array.from({ length: 30 }, (_, index) => { const days = index + 1; return <option key={days} value={days}>{days} day{days === 1 ? "" : "s"}</option>; })}</select></label><label>Check-in time<input type="time" value={settings.shedReminderTime} onChange={(event) => update({ shedReminderTime: event.target.value })} disabled={locked} /></label></div>}
        <div className="tt-notification-setting-row"><div><strong><TinyTitansIcon name="vet" size={16} /> Health, medication & vet</strong><p>Keep treatment and follow-up deadlines from disappearing into the void.</p></div><input type="checkbox" checked={settings.healthRemindersEnabled} onChange={(event) => update({ healthRemindersEnabled: event.target.checked })} disabled={locked} aria-label="Health reminders" /></div>
        {settings.healthRemindersEnabled && <div className="tt-notification-inline-fields"><label>Missed medication follow-up<select value={settings.medicationMissedFollowUpMinutes} onChange={(event) => update({ medicationMissedFollowUpMinutes: Number(event.target.value) })} disabled={locked}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="720">12 hours</option></select></label><label>Health follow-up lead<select value={settings.healthFollowUpLeadDays} onChange={(event) => update({ healthFollowUpLeadDays: Number(event.target.value) })} disabled={locked}><option value="0">Same day</option><option value="1">1 day before</option><option value="2">2 days before</option><option value="3">3 days before</option><option value="7">7 days before</option><option value="14">14 days before</option></select></label></div>}
      </div>

      {previewMessage && <div className="tt-notification-settings-message" role="status">{previewMessage}</div>}
      {message && <div className="tt-notification-settings-message" role="status">{message}</div>}
    </div>
  );
}
