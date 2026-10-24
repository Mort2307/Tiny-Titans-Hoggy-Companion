/** Nightjar-style update control, adapted to TinyTitans' separate FCM worker.
 * Normal updates never unregister a push worker or wipe user data.
 */
declare const __TINY_TITANS_SOURCE_COMMIT__: string;

export type TinyTitansReleaseStatus = {
  currentCommit: string | null;
  latestCommit: string | null;
  latestDeployedAt: string | null;
  updateAvailable: boolean;
  checked: boolean;
};

export const runningTinyTitansCommit = (): string | null => {
  const value = typeof __TINY_TITANS_SOURCE_COMMIT__ === "string" ? __TINY_TITANS_SOURCE_COMMIT__ : "";
  return /^[a-f0-9]{40}$/i.test(value) ? value : null;
};

export async function checkTinyTitansRelease(): Promise<TinyTitansReleaseStatus> {
  const currentCommit = runningTinyTitansCommit();
  const base: TinyTitansReleaseStatus = {
    currentCommit, latestCommit: null, latestDeployedAt: null, updateAvailable: false, checked: false,
  };
  try {
    const response = await fetch("/version.json?update-check=" + Date.now(), {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    if (!response.ok) return base;
    const data = await response.json() as { project?: unknown; sourceCommit?: unknown; generatedAt?: unknown };
    if (data.project !== "tinytitans-hoggy-companion" ||
        typeof data.sourceCommit !== "string" || !/^[a-f0-9]{40}$/i.test(data.sourceCommit)) return base;
    const latestCommit = data.sourceCommit;
    return {
      currentCommit, latestCommit,
      latestDeployedAt: typeof data.generatedAt === "string" ? data.generatedAt : null,
      updateAvailable: Boolean(currentCommit && latestCommit !== currentCommit),
      checked: true,
    };
  } catch {
    return base;
  }
}

function markRefreshed(): void {
  try { sessionStorage.setItem("tiny-titans:update-refreshed", new Date().toISOString()); } catch { /* optional */ }
}
function reloadFresh(): void {
  markRefreshed();
  const url = new URL(location.href);
  url.searchParams.set("tiny-titans-refresh", String(Date.now()));
  window.location.replace(url.toString());
}
function isAppShellWorker(reg: ServiceWorkerRegistration): boolean {
  const workers = [reg.active, reg.waiting, reg.installing].filter(Boolean);
  return workers.some((worker) => Boolean(worker?.scriptURL && !worker.scriptURL.includes("firebase-messaging-sw.js")))
    && !reg.scope.includes("/firebase-messaging/");
}
async function refreshAppWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration || !isAppShellWorker(registration)) return;
  try { await registration.update(); } catch { /* reload may still succeed */ }
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
}
async function clearAppCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const names = await caches.keys();
  await Promise.all(names.filter((name) => /^(?:workbox-|tinytitans-|tiny-titans-)/.test(name)).map((name) => caches.delete(name)));
}

/** An ordinary update keeps the existing FCM worker and device token. */
export async function applyTinyTitansSafeUpdate(): Promise<void> {
  try {
    await refreshAppWorker();
    // A new Hosting revision must never be hidden by an old Workbox app-shell cache.
    // Only TinyTitans app caches are cleared; FCM registration and user records remain intact.
    await clearAppCaches();
  } finally { reloadFresh(); }
}

/** Recovery action: clears only application caches and its PWA worker, NOT FCM. */
export async function forceTinyTitansRefresh(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter(isAppShellWorker).map((reg) => reg.unregister()));
    }
    await clearAppCaches();
  } finally { reloadFresh(); }
}

export function consumeTinyTitansRefreshedNotice(): boolean {
  try {
    const value = sessionStorage.getItem("tiny-titans:update-refreshed");
    if (!value) return false;
    sessionStorage.removeItem("tiny-titans:update-refreshed");
    return true;
  } catch { return false; }
}
