import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import "./styles/tiny-titans-modern.css";
import "./styles/selector-scroll.css";
import "./styles/husbandry-equipment.css";

import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AppUpdatePrompt, { setTinyTitansUpdateHandler, notifyTinyTitansUpdateAvailable } from "./components/AppUpdatePrompt";
import { AuthProvider } from "./context/AuthContext";

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() { notifyTinyTitansUpdateAvailable(); },
  onRegisteredSW(_swUrl, registration) { if (!registration) return; window.setInterval(() => { void registration.update(); }, 60 * 60 * 1000); },
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

createRoot(document.getElementById("root")!).render(<StrictMode><AuthProvider><SelectorGrabScrollManager /><AppUpdatePrompt /><AppErrorBoundary><App /></AppErrorBoundary></AuthProvider></StrictMode>);
