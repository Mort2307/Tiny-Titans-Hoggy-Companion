import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import "../styles/AppUpdatePrompt.css";

declare const __TINY_TITANS_BUILD_ID__: string;

type Phase = "checking" | "ready" | "updating" | "failed";
type CheckMode = "startup" | "resume" | "poll";
type ReleaseManifest = { buildId: string; releasedAt: string; mandatory: boolean };

const BUILD_ID = __TINY_TITANS_BUILD_ID__;
const ATTEMPTS_KEY = "tiny-titans-release-attempts-v1";
const MAX_AUTOMATIC_ATTEMPTS = 2;
const CHECK_INTERVAL_MS = 45_000;
const FETCH_TIMEOUT_MS = 5_000;

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

  await registration.update();

  // Installing an update can be asynchronous even after update() resolves.
  for (let i = 0; i < 20 && !registration.waiting; i += 1) {
    if (!registration.installing && i >= 4) break;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
  }

  if (registration.waiting) {
    const activation = waitForControllerChange(4_000);
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    if (await activation) return;
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
 * before the service worker eventually offers its update button.
 *
 * During an active session, preserve in-progress forms: show a persistent
 * notice and enforce the update when the app is next freshly opened.
 */
export default function ReleaseCheckGuard({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(import.meta.env.DEV ? "ready" : "checking");
  const [pendingBuild, setPendingBuild] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const touchedSession = useRef(false);
  const phaseRef = useRef<Phase>(phase);
  const pendingBuildRef = useRef<string | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { pendingBuildRef.current = pendingBuild; }, [pendingBuild]);

  const applyUpdate = useCallback(async (buildId: string, manual = false) => {
    if (!manual && getAttempts(buildId) >= MAX_AUTOMATIC_ATTEMPTS) {
      setPhase("failed");
      setMessage("This device could not complete its automatic update. Retry while connected to the internet.");
      return;
    }

    setPhase("updating");
    setMessage("");
    try {
      await installLatestRelease(buildId);
    } catch (error) {
      console.warn("[Tiny Titans] Release install failed", error);
      setPhase("failed");
      setMessage("Tiny Titans could not install the update. Check your connection and retry.");
    }
  }, []);

  const check = useCallback(async (mode: CheckMode) => {
    if (inFlight.current || (mode !== "startup" && phaseRef.current !== "ready")) return;
    if (!navigator.onLine) {
      if (mode === "startup") setPhase("ready");
      return;
    }
    inFlight.current = true;
    try {
      const release = await fetchRelease();
      if (release.buildId === BUILD_ID) {
        clearAttempts();
        removeObsoleteCacheBuster();
        setPendingBuild(null);
        if (mode === "startup") setPhase("ready");
        return;
      }

      setPendingBuild(release.buildId);

      // Never discard a keeper's in-progress feeding/weight entry by forcing
      // a reload partway through an active session.
      if (mode === "startup" || (mode === "resume" && !touchedSession.current)) {
        await applyUpdate(release.buildId);
      }
    } catch (error) {
      console.debug("[Tiny Titans] Release check unavailable; keep app accessible", error);
      if (mode === "startup") setPhase("ready");
    } finally {
      inFlight.current = false;
    }
  }, [applyUpdate]);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const markInteraction = () => { touchedSession.current = true; };
    const onResume = () => { if (document.visibilityState === "visible") void check("resume"); };
    const onVisibility = () => { if (document.visibilityState === "visible") void check("resume"); };

    document.addEventListener("pointerdown", markInteraction, { capture: true });
    document.addEventListener("keydown", markInteraction, { capture: true });
    document.addEventListener("input", markInteraction, { capture: true });
    window.addEventListener("focus", onResume);
    window.addEventListener("online", onResume);
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
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [check]);

  if (phase !== "ready") {
    return (
      <div className="tt-update-backdrop">
        <section className="tt-update-panel" role="status" aria-live="polite" aria-label="Tiny Titans release status">
          <div className="tt-update-logo" aria-hidden="true"><TinyTitansIcon name="reptiles" size={54} /></div>
          <p className="tt-update-kicker">TINY TITANS · LIVE RELEASE</p>
          <h2>{phase === "checking" ? "Checking your app version…" : phase === "updating" ? "Updating Tiny Titans…" : "Update needs attention"}</h2>
          <p>{phase === "checking"
            ? "Checking the latest release before you start recording care."
            : phase === "updating"
              ? "Your records remain in your account. The app will reopen on the latest version."
              : message}</p>
          {phase === "failed" && (
            <div className="tt-update-actions">
              <button type="button" className="tt-update-primary" onClick={() => pendingBuildRef.current && void applyUpdate(pendingBuildRef.current, true)}>Retry update</button>
              <button type="button" className="tt-update-secondary" onClick={() => setPhase("ready")}>Continue temporarily</button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <>
      {children}
      {pendingBuild && (
        <aside className="tt-release-banner" role="status" aria-live="polite">
          <span><strong>New Tiny Titans version ready</strong><small>Finish and save your current work before updating. The next fresh launch will update automatically.</small></span>
          <button type="button" onClick={() => void applyUpdate(pendingBuild, true)}>Update now</button>
        </aside>
      )}
    </>
  );
}
