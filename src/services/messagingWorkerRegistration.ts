/** Firebase Messaging runs on a dedicated, NON-controlling scope.
 * navigator.serviceWorker.ready resolves the page's app-shell worker instead
 * and does not guarantee /firebase-messaging/ is active.
 */
const FCM_SCOPE = "/firebase-messaging/";
const FCM_SCRIPT = "/firebase-messaging-sw.js";
const ACTIVATION_LIMIT_MS = 15000;
let registrationInFlight: Promise<ServiceWorkerRegistration> | null = null;

function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === "activated") return Promise.resolve(registration);

  return new Promise((resolve, reject) => {
    let finished = false;
    const observed = new Set<ServiceWorker>();
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      registration.removeEventListener("updatefound", watchWorkers);
      for (const worker of observed) worker.removeEventListener("statechange", onStateChange);
      if (error) reject(error);
      else resolve(registration);
    };
    const onStateChange = () => {
      if (registration.active?.state === "activated") finish();
    };
    const watchWorkers = () => {
      for (const worker of [registration.active, registration.installing, registration.waiting]) {
        if (!worker || observed.has(worker)) continue;
        observed.add(worker);
        worker.addEventListener("statechange", onStateChange);
      }
      onStateChange();
    };
    const timeoutId = window.setTimeout(() =>
      finish(new Error("TinyTitans' messaging service worker did not activate. Check the internet connection, then use Repair connection in Notification settings.")),
    ACTIVATION_LIMIT_MS);
    registration.addEventListener("updatefound", watchWorkers);
    watchWorkers();
  });
}

async function establishMessagingWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("This browser does not support service workers.");
  }
  // Registering against the same URL and scope reuses the existing push worker.
  // It does not unregister or invalidate an existing FCM token.
  let registration = await navigator.serviceWorker.register(FCM_SCRIPT, { scope: FCM_SCOPE });
  if (registration.active?.state === "activated") return registration;
  try { await registration.update(); } catch { /* activation check below reports the state */ }

  try {
    return await waitForActiveWorker(registration);
  } catch (error) {
    // Only a registration with no active worker can be safely replaced.
    // Never touch the PWA app shell or an active FCM registration.
    if (registration.active) throw error;
    try {
      const removed = await registration.unregister();
      if (removed) {
        registration = await navigator.serviceWorker.register(FCM_SCRIPT, { scope: FCM_SCOPE });
        return await waitForActiveWorker(registration);
      }
    } catch { /* report the initial activation error for consistent UX */ }
    throw error;
  }
}

export async function registerActiveMessagingWorker(): Promise<ServiceWorkerRegistration> {
  if (!registrationInFlight) {
    registrationInFlight = establishMessagingWorker().finally(() => { registrationInFlight = null; });
  }
  return registrationInFlight;
}
