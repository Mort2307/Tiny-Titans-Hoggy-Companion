import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import "./styles/tiny-titans-modern.css";
import "./styles/tiny-titans-design-system.css";
import "./styles/tiny-titans-home-overrides.css";
import "./styles/selector-scroll.css";
import "./styles/husbandry-equipment.css";
import "./styles/tiny-titans-professional-ui.css";
import "./styles/tiny-titans-professional-hardening.css";
import "./styles/tiny-titans-final-polish.css";
import "./styles/tiny-titans-family-professional.css";
import "./styles/tiny-titans-page-consistency.css";
import "./styles/tiny-titans-premium-overhaul.css";
import "./styles/tiny-titans-product-polish.css";
import "./styles/tiny-titans-creator-command.css";
import "./styles/tiny-titans-creator-status.css";
import "./styles/tiny-titans-command.css";
import "./styles/tiny-titans-app-polish-v3.css";
import "./styles/tiny-titans-layout-final.css";
import "./styles/tiny-titans-final-formatting.css";
import "./styles/tiny-titans-enclosure-intelligence-polish.css";
import "./styles/tiny-titans-enclosure-formatting.css";
import "./styles/tiny-titans-brand-theme.css";
import "./styles/tiny-titans-brand-glow.css";
import "./styles/tiny-titans-intelligence-growth.css";
import "./styles/contributor-thank-you.css";
import "./styles/tiny-titans-paid-room-retirement.css";

import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AppUpdatePrompt, { setTinyTitansUpdateHandler, notifyTinyTitansUpdateAvailable } from "./components/AppUpdatePrompt";
import DateDisplayNormalizer from "./components/DateDisplayNormalizer";
import IntelligenceRuntimeBootstrap from "./components/IntelligenceRuntimeBootstrap";
import LiveWorldTracker from "./components/LiveWorldTracker";
import NotificationBridge from "./components/NotificationBridge";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceBrandingProvider } from "./context/WorkspaceBrandingContext";
import { WorldTimeProvider } from "./context/WorldTimeContext";
import { CopyQualityGuard } from "./utils/copyQuality";

const updateServiceWorker = import.meta.env.DEV ? async (_reloadPage = false) => undefined : registerSW({
  immediate: true,
  onNeedRefresh() { notifyTinyTitansUpdateAvailable(); },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      void registration.update().catch(() => undefined);
    };
    window.setTimeout(checkForUpdate, 10 * 1000);
    window.setInterval(checkForUpdate, 5 * 60 * 1000);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);
  },
  onOfflineReady() {},
});

setTinyTitansUpdateHandler(async () => { await updateServiceWorker(true); });

async function clearStaleDevPwaState() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    }
  } catch (error) {
    console.warn("Tiny Titans could not fully clear stale dev PWA state", error);
  }
}

void clearStaleDevPwaState();

export function SelectorGrabScrollManager() {
  useEffect(() => {
    let active: HTMLDivElement | null = null; let pointerId: number | null = null; let startY = 0; let startScrollTop = 0; let dragged = false; let suppressClick = false;
    const getSelector = (target: EventTarget | null) => { if (!(target instanceof Element)) return null; return target.closest<HTMLDivElement>(".multi-select-options"); };
    const onPointerDown = (event: PointerEvent) => { if (event.pointerType === "mouse" && event.button !== 0) return; const selector = getSelector(event.target); if (!selector) return; active = selector; pointerId = event.pointerId; startY = event.clientY; startScrollTop = selector.scrollTop; dragged = false; suppressClick = false; };
    const onPointerMove = (event: PointerEvent) => { if (!active || pointerId !== event.pointerId) return; const deltaY = event.clientY - startY; if (Math.abs(deltaY) > 5) dragged = true; if (!dragged) return; active.scrollTop = startScrollTop - deltaY; event.preventDefault(); };
    const onPointerEnd = (event: PointerEvent) => { if (pointerId !== event.pointerId) return; suppressClick = dragged; active = null; pointerId = null; dragged = false; };
    const onClickCapture = (event: MouseEvent) => { if (!suppressClick) return; suppressClick = false; event.preventDefault(); event.stopPropagation(); };
    document.addEventListener("pointerdown", onPointerDown, true); document.addEventListener("pointermove", onPointerMove, { capture: true, passive: false }); document.addEventListener("pointerup", onPointerEnd, true); document.addEventListener("pointercancel", onPointerEnd, true); document.addEventListener("click", onClickCapture, true);
    return () => { document.removeEventListener("pointerdown", onPointerDown, true); document.removeEventListener("pointermove", onPointerMove, true); document.removeEventListener("pointerup", onPointerEnd, true); document.removeEventListener("pointercancel", onPointerEnd, true); document.removeEventListener("click", onClickCapture, true); };
  }, []);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <WorkspaceBrandingProvider>
        <WorldTimeProvider>
          <IntelligenceRuntimeBootstrap />
          <LiveWorldTracker />
          <SelectorGrabScrollManager />
          <DateDisplayNormalizer />
          <NotificationBridge />
          <CopyQualityGuard />
          <AppErrorBoundary><App /></AppErrorBoundary>
          <AppUpdatePrompt />
        </WorldTimeProvider>
      </WorkspaceBrandingProvider>
    </AuthProvider>
  </StrictMode>,
);
