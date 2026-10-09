import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import {
  TINY_TITANS_SW_UPDATE_EVENT,
  TINY_TITANS_OFFLINE_READY_EVENT,
  hasTinyTitansOfflineReadyNotification,
} from "../services/pwaUpdateService";
import "../styles/AppUpdatePrompt.css";

declare const __TINY_TITANS_BUILD_ID__: string;

type Phase = "checking" | "ready" | "required" | "updating" | "failed";
type CheckMode = "startup" | "resume" | "poll";
type ReleaseManifest = { buildId: string; releasedAt: string; mandatory: boolean };

const BUILD_ID = __TINY_TITANS_BUILD_ID__;
const ATTEMPTS_KEY = "tiny-titans-release-attempts-v1";
const MAX_AUTOMATIC_ATTEMPTS = 2; // Used to explain repeated manual update failures.
const CHECK_INTERVAL_MS = 45_000;
const FETCH_TIMEOUT_MS = 5_000;
const MIN_STARTUP_CHECK_MS = 450;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getAttempts(buildId: string): number {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) ?? "{}") as {
      buildId?: string; attempts?: number;
    };
    return saved.buildId === buildId ? saved.attempts ?? 0 : 0;
  } catch {
    return 0;
  }
}

function trackAttempt(buildId: string) {
  try {
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify({
      buildId,
      attempts: getAttempts(buildId) + 1,
    }));
  } catch {
    // Storage can be unavailable in private browsing; the update still works.
  }
}

function clearAttempts() {
  try {
    sessionStorage.removeItem(ATTEMPTS_KEY);
  } catch {
    // No-op when session storage is disabled.
  }
}

async function fetchRelease(): Promise<ReleaseManifest> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // This endpoint is generated for every production build, excluded from the
    // Workbox precache and served by Firebase Hosting with no-store headers.
    const response = await fetch(`/release.json?checked=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Release check HTTP ${response.status}`);
    const release: unknown = await response.json();
    if (
      typeof release !== "object" ||
      release === null ||
      !("buildId" in release) ||
      typeof release.buildId !== "string" ||
      !release.buildId.startsWith("tt-")
    ) {
      throw new Error("Invalid Tiny Titans release manifest");
    }
    return release as ReleaseManifest;
  } finally {
    window.clearTimeout(timeout);
  }
}

function waitForControllerChange(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!("serviceWorker" in navigator)) {
      resolve(false);
      return;
    }
    let settled = false;
    const complete = (changed: boolean) => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      window.clearTimeout(timeout);
      resolve(changed);
    };
    const onChange = () => complete(true);
    const timeout = window.setTimeout(() => complete(false), timeoutMs);
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
  });
}

async function activateUpdatedAppShell() {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration(window.location.href);
  if (!registration) return;

  // Never unregister the separate Firebase Messaging push worker.
  const script = registration.active?.scriptURL;
  if (!script || !new URL(script).pathname.endsWith("/sw.js")) return;

  const previousActiveWorker = registration.active;
  await registration.update();

  // Installing an update can be asynchronous even after update() resolves.
  for (let i = 0; i < 20 && !registration.waiting; i += 1) {
    if (registration.active && registration.active !== previousActiveWorker) return;
    if (!registration.installing && i >= 4) break;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
  }

  if (registration.active && registration.active !== previousActiveWorker) return;

  if (registration.waiting) {
    const activation = waitForControllerChange(4_000);
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    const controllerChanged = await activation;
    if (controllerChanged || (registration.active && registration.active !== previousActiveWorker)) return;
  }

  // The release manifest is newer, but an old Workbox controller can still
  // serve an outdated index.html. Remove only that app-shell registration.
  // No Cache Storage, Firestore data, or user records are deleted.
  await registration.unregister();
}

async function installLatestRelease(buildId: string) {
  trackAttempt(buildId);
  await activateUpdatedAppShell();

  const target = new URL(window.location.href);
  target.searchParams.set("tt_release", buildId);
  window.location.replace(target.toString());
}

function removeObsoleteCacheBuster() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("tt_release")) return;
  url.searchParams.delete("tt_release");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

/**
 * Verifies an independently network-fetched release before mounting the app.
 * A user can no longer open an out-of-date session, log records and leave
 * before the service worker eventually offers its update button. The keeper
 * must explicitly press the required update button when a new build exists.
 *
 * During an active session, preserve in-progress forms: show a persistent
 * notice and enforce the update when the app is next freshly opened.
 */
export default function ReleaseCheckGuard({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(import.meta.env.DEV ? "ready" : "checking");
  const [pendingBuild, setPendingBuild] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [offlineReady, setOfflineReady] = useState(hasTinyTitansOfflineReadyNotification);
  const inFlight = useRef(false);
  const touchedSession = useRef(false);
  const phaseRef = useRef<Phase>(phase);
  const pendingBuildRef = useRef<string | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { pendingBuildRef.current = pendingBuild; }, [pendingBuild]);

  useEffect(() => {
    let timer: number | undefined;
    const showOfflineReady = () => {
      setOfflineReady(true);
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setOfflineReady(false);
        window.__tinyTitansOfflineReady = false;
      }, 4500);
    };
    window.addEventListener(TINY_TITANS_OFFLINE_READY_EVENT, showOfflineReady);
    if (hasTinyTitansOfflineReadyNotification()) {
      timer = window.setTimeout(() => {
        setOfflineReady(false);
        window.__tinyTitansOfflineReady = false;
      }, 4500);
    }
    return () => {
      window.removeEventListener(TINY_TITANS_OFFLINE_READY_EVENT, showOfflineReady);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const applyUpdate = useCallback(async (buildId: string) => {
    // Updating is user-initiated once a newer release is positively verified.
    // Never offer a "Later" escape when a mandatory online update is known.
    setPhase("updating");
    setMessage("");
    try {
      await installLatestRelease(buildId);
    } catch (error) {
      console.warn("[Tiny Titans] Release install failed", error);
      const attempts = getAttempts(buildId);
      setPhase("failed");
      setMessage(attempts >= MAX_AUTOMATIC_ATTEMPTS
        ? "The update has not completed after multiple attempts. Check your connection, then try again. Your saved records have not been removed."
        : "The update could not finish. Check your connection and try again. Your saved records are safe.");
    }
  }, []);

  const check = useCallback(async (mode: CheckMode) => {
    if (inFlight.current || (mode !== "startup" && phaseRef.current !== "ready")) return;
    if (!navigator.onLine) {
      // Offline users must still be able to access already-cached care records.
      // Once connected, the release checker runs again before they start work.
      if (mode === "startup") setPhase("ready");
      return;
    }

    inFlight.current = true;
    const startedAt = Date.now();
    try {
      const release = await fetchRelease();
      if (mode === "startup") {
        // Make the version-check progress visibly discernible even on fast Wi-Fi.
        await delay(Math.max(0, MIN_STARTUP_CHECK_MS - (Date.now() - startedAt)));
      }

      if (release.buildId === BUILD_ID) {
        clearAttempts();
        removeObsoleteCacheBuster();
        setPendingBuild(null);
        if (mode === "startup") setPhase("ready");
        return;
      }

      setPendingBuild(release.buildId);
      // A genuine new version must be installed BEFORE the workspace is mounted.
      // Background updates on an already-active session cannot erase unsaved forms.
      if (mode === "startup" || (mode === "resume" && !touchedSession.current)) {
        setPhase("required");
      }
    } catch (error) {
      console.debug("[Tiny Titans] Live version could not be checked", error);
      // A *failed* check does not prove an update exists. Preserve access to
      // animal care data while offline/Hosting is unavailable; retry on reconnect.
      if (mode === "startup") {
        await delay(Math.max(0, MIN_STARTUP_CHECK_MS - (Date.now() - startedAt)));
        setPhase("ready");
      }
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const markInteraction = () => { touchedSession.current = true; };
    const onResume = () => { if (document.visibilityState === "visible") void check("resume"); };
    const onVisibility = () => { if (document.visibilityState === "visible") void check("resume"); };
    const onWorkerChanged = () => { if (document.visibilityState === "visible") void check("poll"); };

    document.addEventListener("pointerdown", markInteraction, { capture: true });
    document.addEventListener("keydown", markInteraction, { capture: true });
    document.addEventListener("input", markInteraction, { capture: true });
    window.addEventListener("focus", onResume);
    window.addEventListener("online", onResume);
    window.addEventListener(TINY_TITANS_SW_UPDATE_EVENT, onWorkerChanged);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void check("poll");
    }, CHECK_INTERVAL_MS);
    void check("startup");

    return () => {
      document.removeEventListener("pointerdown", markInteraction, true);
      document.removeEventListener("keydown", markInteraction, true);
      document.removeEventListener("input", markInteraction, true);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("online", onResume);
      window.removeEventListener(TINY_TITANS_SW_UPDATE_EVENT, onWorkerChanged);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [check]);

  if (phase !== "ready") {
    const isBusy = phase === "checking" || phase === "updating";
    const isBlocking = phase === "required" || phase === "failed";
    return (
      <div className="tt-update-backdrop tt-release-gate-backdrop">
        <section
          className="tt-update-panel tt-release-gate-panel"
          role={isBlocking ? "alertdialog" : "status"}
          aria-modal={isBlocking ? true : undefined}
          aria-live={isBlocking ? "assertive" : "polite"}
          aria-labelledby="tt-release-gate-title"
          aria-describedby="tt-release-gate-description"
        >
          <div className="tt-update-logo" aria-hidden="true"><TinyTitansIcon name="reptiles" size={54} /></div>
          <p className="tt-update-kicker">TINY TITANS · APP UPDATES</p>
          <div className="tt-release-gate-status" aria-hidden="true">
            {isBusy ? <span className="tt-release-gate-spinner" /> : <span className="tt-release-gate-dot" />}
            <span>{phase === "checking" ? "Checking for updates"
              : phase === "required" ? "New version available"
                : phase === "updating" ? "Installing update"
                  : "Update interrupted"}</span>
          </div>
          <h2 id="tt-release-gate-title">
            {phase === "checking" ? "Checking Tiny Titans…"
              : phase === "required" ? "Update required"
                : phase === "updating" ? "Updating Tiny Titans…"
                  : "Update needs attention"}
          </h2>
          <p id="tt-release-gate-description">
            {phase === "checking"
              ? "Checking the latest version before you enter your keeper workspace."
              : phase === "required"
                ? "A newer Tiny Titans version is ready. Update the app before continuing. Your saved animal records and account data will be preserved."
                : phase === "updating"
                  ? "Applying the latest release. Tiny Titans will reopen automatically when the update is ready."
                  : message}
          </p>
          {isBusy && <div className="tt-release-gate-progress" aria-hidden="true"><span /></div>}
          {(phase === "required" || phase === "failed") && (
            <div className="tt-update-actions tt-release-gate-actions">
              <button
                type="button"
                className="tt-update-primary tt-release-gate-primary"
                autoFocus
                onClick={() => { if (pendingBuildRef.current) void applyUpdate(pendingBuildRef.current); }}
              >
                {phase === "required" ? "Update Tiny Titans" : "Retry update"}
              </button>
            </div>
          )}
          {phase === "required" && (
            <small className="tt-update-required">This update must be installed before opening Tiny Titans.</small>
          )}
          {phase === "failed" && (
            <small className="tt-update-required">The workspace will open when the update completes. Please retry while online.</small>
          )}
        </section>
      </div>
    );
  }

  return (
    <>
      {children}
      {offlineReady && !pendingBuild && (
        <div className="tt-offline-ready" role="status">
          <TinyTitansIcon name="check" size={16} />
          <span><strong>Ready offline</strong><small>Core Tiny Titans files are available on this device.</small></span>
        </div>
      )}
      {pendingBuild && (
        <aside className="tt-release-banner" role="status" aria-live="polite">
          <span>
            <strong>{confirmRestart ? "Ready to restart Tiny Titans?" : "New Tiny Titans version ready"}</strong>
            <small>{confirmRestart
              ? "Unsaved feeding, weight or other forms may be lost. Save your records before continuing."
              : "Save your current work first. The next fresh launch will update automatically."}</small>
          </span>
          {confirmRestart ? (
            <div className="tt-release-banner-actions">
              <button type="button" onClick={() => void applyUpdate(pendingBuild)}>Restart &amp; update</button>
              <button type="button" className="tt-release-banner-cancel" onClick={() => setConfirmRestart(false)}>Keep working</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmRestart(true)}>Update now</button>
          )}
        </aside>
      )}
    </>
  );
}
