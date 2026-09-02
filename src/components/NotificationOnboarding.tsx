import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { enableNotifications, getNotificationPermissionState, getNotificationSettings, hasRegisteredNotificationDevice } from "../services/notificationService";
import type { NotificationPermissionState } from "../types/Notifications";
import "../styles/notificationOnboarding.css";

const DISMISS_KEY_PREFIX = "tinytitans:notification-onboarding-dismissed:";
const DISMISS_DAYS = 30;

function getDismissedAt(uid: string) {
  try {
    const raw = window.localStorage.getItem(`${DISMISS_KEY_PREFIX}${uid}`);
    if (!raw) return null;
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function setDismissedAt(uid: string) {
  try {
    window.localStorage.setItem(`${DISMISS_KEY_PREFIX}${uid}`, String(Date.now()));
  } catch {
    // Local storage is only used for the non-critical dismissal preference.
  }
}

function isRecentlyDismissed(uid: string) {
  const timestamp = getDismissedAt(uid);
  return timestamp !== null && Date.now() - timestamp < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function NotificationOnboarding() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.uid || typeof window === "undefined") {
      setVisible(false);
      return;
    }

    let active = true;
    const evaluate = async () => {
      const currentPermission = getNotificationPermissionState();
      if (!active) return;
      setPermission(currentPermission);

      try {
        const settings = await getNotificationSettings(user.uid);
        if (!active) return;
        const registered = settings.enabled && currentPermission === "granted"
          ? await hasRegisteredNotificationDevice(user.uid)
          : false;
        if (!active) return;

        // The onboarding card is deliberately shown only when there is a useful action to take.
        const setupNeeded = currentPermission === "default" && !settings.enabled;
        const repairNeeded = currentPermission === "granted" && (!settings.enabled || !registered);
        setVisible((setupNeeded || repairNeeded) && !isRecentlyDismissed(user.uid));
      } catch {
        if (active) setVisible(currentPermission === "default" && !isRecentlyDismissed(user.uid));
      }
    };

    void evaluate();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  async function handleEnable() {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await enableNotifications(user.uid);
      setPermission(result);
      if (result === "granted") {
        const settings = await getNotificationSettings(user.uid);
        const registered = await hasRegisteredNotificationDevice(user.uid);
        if (settings.enabled && registered) {
          setVisible(false);
          setGuideOpen(false);
          setMessage("");
        } else {
          setMessage("Permission is allowed, but this device still needs its push connection repaired. Open Settings → Notifications and tap Repair connection.");
        }
      } else if (result === "denied") {
        setMessage("Notifications are blocked by your browser or device. Open the guide below for the steps to allow Tiny Titans again.");
        setGuideOpen(true);
      } else if (result === "unsupported") {
        setMessage("This browser or installed app does not support Tiny Titans background notifications.");
        setGuideOpen(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable notifications right now.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    if (user?.uid) setDismissedAt(user.uid);
    setVisible(false);
    setGuideOpen(false);
    setMessage("");
  }

  if (!user || !visible) {
    return guideOpen ? (
      <NotificationGuide permission={permission} message={message} onClose={() => setGuideOpen(false)} onEnable={() => void handleEnable()} busy={busy} />
    ) : null;
  }

  return (
    <>
      <aside className="tt-notification-onboarding" aria-label="Tiny Titans notification setup">
        <div className="tt-notification-onboarding-icon" aria-hidden="true">🔔</div>
        <div className="tt-notification-onboarding-copy">
          <div className="tt-notification-onboarding-eyebrow">Never miss a keeper reminder</div>
          <h2>Let Tiny Titans notify you</h2>
          <p>Get feeding, weight, shed and health reminders even when Tiny Titans is not the page you are looking at.</p>
          {message && <div className="tt-notification-onboarding-message" role="status">{message}</div>}
          <div className="tt-notification-onboarding-actions">
            <button type="button" className="tt-notification-primary" onClick={() => void handleEnable()} disabled={busy}>
              {busy ? "Enabling…" : "Enable notifications"}
            </button>
            <button type="button" className="tt-notification-secondary" onClick={() => setGuideOpen(true)} disabled={busy}>How to enable</button>
            <button type="button" className="tt-notification-dismiss" onClick={dismiss} disabled={busy}>Not now</button>
          </div>
        </div>
        <button type="button" className="tt-notification-onboarding-close" onClick={dismiss} disabled={busy} aria-label="Dismiss notification setup">×</button>
      </aside>
      {guideOpen && <NotificationGuide permission={permission} message={message} onClose={() => setGuideOpen(false)} onEnable={() => void handleEnable()} busy={busy} />}
    </>
  );
}

type NotificationGuideProps = {
  permission: NotificationPermissionState;
  message: string;
  onClose: () => void;
  onEnable: () => void;
  busy: boolean;
};

function NotificationGuide({ permission, message, onClose, onEnable, busy }: NotificationGuideProps) {
  return (
    <div className="tt-notification-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="tt-notification-guide" role="dialog" aria-modal="true" aria-labelledby="tt-notification-guide-title">
        <div className="tt-notification-guide-header">
          <div>
            <span className="tt-notification-guide-kicker">TINY TITANS • NOTIFICATIONS</span>
            <h2 id="tt-notification-guide-title">Get your keeper reminders</h2>
            <p>Use the button below first. Tiny Titans will ask your browser/device for permission and then register this device for push delivery.</p>
          </div>
          <button type="button" className="tt-notification-guide-close" onClick={onClose} aria-label="Close notification guide">×</button>
        </div>

        <div className="tt-notification-guide-grid">
          <article>
            <div className="tt-notification-guide-step">1</div>
            <h3>Tap Enable notifications</h3>
            <p>Do this while you are logged into Tiny Titans. The permission request must come from your direct tap.</p>
            {permission === "default" && <button type="button" className="tt-notification-primary tt-guide-action" onClick={onEnable} disabled={busy}>{busy ? "Enabling…" : "Enable now"}</button>}
          </article>

          <article>
            <div className="tt-notification-guide-step">2</div>
            <h3>Allow notifications</h3>
            <p>When your browser or device asks, choose <strong>Allow</strong>. Keep Tiny Titans notifications enabled in your device notification settings.</p>
          </article>

          <article>
            <div className="tt-notification-guide-step">3</div>
            <h3>Android / Chrome</h3>
            <p>For an installed app, check <strong>Phone Settings → Notifications → Tiny Titans</strong>. If permission is already allowed but delivery is not working, use <strong>Settings → Notifications → Repair connection</strong> in Tiny Titans.</p>
          </article>

          <article>
            <div className="tt-notification-guide-step">4</div>
            <h3>iPhone / iPad</h3>
            <p>Install Tiny Titans on your Home Screen from Safari, then open the Home Screen app and tap <strong>Enable notifications</strong>. Once allowed, notification controls are available in your iPhone/iPad notification settings.</p>
          </article>
        </div>

        {permission === "denied" && <div className="tt-notification-guide-warning"><strong>Notifications are currently blocked.</strong> Your browser/device must be changed to allow Tiny Titans notifications before the Enable button can register this device.</div>}
        {message && <div className="tt-notification-guide-result" role="status">{message}</div>}

        <div className="tt-notification-guide-footer">
          <span>Need to repair an existing connection?</span>
          <button type="button" className="tt-notification-secondary" onClick={onEnable} disabled={busy}>{busy ? "Repairing…" : "Enable / repair connection"}</button>
        </div>
      </section>
    </div>
  );
}
