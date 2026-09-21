import { lazy, Suspense, useEffect, useState } from "react";

const DeferredIntelligenceRuntimeBootstrap = lazy(() => import("./IntelligenceRuntimeBootstrap"));
const DeferredLiveWorldTracker = lazy(() => import("./LiveWorldTracker"));
const DeferredNotificationBridge = lazy(() => import("./NotificationBridge"));
const DeferredRescueInvitationBridge = lazy(() => import("./RescueInvitationBridge"));

function DeferredRuntimeServices() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = () => {
      if (!cancelled) setReady(true);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(start, { timeout: 1500 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(start, 900);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <DeferredIntelligenceRuntimeBootstrap />
      <DeferredLiveWorldTracker />
      <DeferredNotificationBridge />
      <DeferredRescueInvitationBridge />
    </Suspense>
  );
}

export default DeferredRuntimeServices;
