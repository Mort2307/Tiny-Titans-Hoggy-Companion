import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import "./styles/tiny-titans-modern.css";
import "./styles/tiny-titans-design-system.css";
import "./styles/tiny-titans-home-overrides.css";
import "./styles/selector-scroll.css";
import "./styles/husbandry-equipment.css";
import "./styles/reptile-room-digital-twin.css";
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
import "./styles/reptile-room-3d-mobile.css";
import "./styles/reptile-room-3d-mobile-v2.css";
import "./styles/reptile-room-3d-mobile-brightness.css";
import "./styles/rr3d-layout-frame.css";
import "./styles/tiny-titans-app-polish-v3.css";
import "./styles/tiny-titans-layout-final.css";
import "./styles/tiny-titans-final-formatting.css";
import "./styles/tiny-titans-enclosure-intelligence-polish.css";
import "./styles/tiny-titans-enclosure-formatting.css";
import "./styles/reptile-room-3d-builder-mobile-overrides.css";
import "./styles/tiny-titans-brand-theme.css";

import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AppUpdatePrompt, { setTinyTitansUpdateHandler, notifyTinyTitansUpdateAvailable } from "./components/AppUpdatePrompt";
import { AuthProvider } from "./context/AuthContext";
import { CopyQualityGuard } from "./utils/copyQuality";

const updateServiceWorker = registerSW({
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

export function MobileReptileRoomToolsManager() {
  useEffect(() => {
    const isMobile = () => window.matchMedia("(max-width: 850px)").matches;
    const sync = () => {
      document.querySelectorAll<HTMLElement>(".rr3d-workspace").forEach((workspace) => {
        let launcher = workspace.querySelector<HTMLButtonElement>(".tt-mobile-room-tools-launcher");
        if (!launcher) {
          launcher = document.createElement("button");
          launcher.type = "button";
          launcher.className = "tt-mobile-room-tools-launcher";
          launcher.setAttribute("aria-controls", "rr3d-mobile-tools-panel");
          launcher.setAttribute("aria-expanded", "false");
          launcher.textContent = "TITANS TOOLS";
          workspace.appendChild(launcher);
        }
        const sidebar = workspace.querySelector<HTMLElement>(".rr3d-sidebar");
        if (!sidebar) return;
        sidebar.id = "rr3d-mobile-tools-panel";
        const open = sidebar.classList.contains("tt-mobile-room-tools-open");
        launcher.classList.toggle("is-open", open);
        launcher.setAttribute("aria-expanded", String(open));
        launcher.textContent = open ? "CLOSE TOOLS" : "TITANS TOOLS";
      });
    };
    const onClick = (event: MouseEvent) => {
      if (!isMobile()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const launcher = target.closest<HTMLButtonElement>(".tt-mobile-room-tools-launcher");
      if (!launcher) return;
      const workspace = launcher.closest<HTMLElement>(".rr3d-workspace");
      const sidebar = workspace?.querySelector<HTMLElement>(".rr3d-sidebar");
      if (!sidebar) return;
      sidebar.classList.toggle("tt-mobile-room-tools-open");
      sync();
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    sync();
    return () => { observer.disconnect(); document.removeEventListener("click", onClick, true); document.querySelectorAll(".tt-mobile-room-tools-launcher").forEach((element) => element.remove()); };
  }, []);
  return null;
}

createRoot(document.getElementById("root")!).render(<StrictMode><AuthProvider><SelectorGrabScrollManager /><MobileReptileRoomToolsManager /><CopyQualityGuard /><AppUpdatePrompt /><AppErrorBoundary><App /></AppErrorBoundary></AuthProvider></StrictMode>);
