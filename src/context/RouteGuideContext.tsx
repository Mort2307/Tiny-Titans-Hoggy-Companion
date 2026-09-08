import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { RouteGuideDefinition, RouteGuideStep } from "../types/routeGuide";
import "../styles/RouteGuide.css";

type RouteGuideContextValue = {
  active: boolean;
  guide: RouteGuideDefinition | null;
  currentStep: number;
  totalSteps: number;
  startGuide: (guide: RouteGuideDefinition) => void;
  cancelGuide: () => void;
};

const RouteGuideContext = createContext<RouteGuideContextValue | undefined>(undefined);
const TARGET_ATTRIBUTE = "data-route-guide-target";

function getTargetSelector(target: string) {
  return `[${TARGET_ATTRIBUTE}="${CSS.escape(target)}"]`;
}

function matchesPath(currentPath: string, expectedPath: string) {
  return currentPath === expectedPath || (expectedPath !== "/" && currentPath.startsWith(`${expectedPath}/`));
}

export function RouteGuideProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<RouteGuideDefinition | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const waitFrameRef = useRef<number | null>(null);

  const cancelGuide = useCallback(() => {
    if (waitFrameRef.current !== null) cancelAnimationFrame(waitFrameRef.current);
    waitFrameRef.current = null;
    setGuide(null);
    setCurrentStep(0);
    setTargetRect(null);
    targetRef.current = null;
  }, []);

  const startGuide = useCallback((nextGuide: RouteGuideDefinition) => {
    if (!nextGuide.steps.length) return;
    setGuide(nextGuide);
    setCurrentStep(0);
    setTargetRect(null);
    targetRef.current = null;
    if (!matchesPath(location.pathname, nextGuide.steps[0].path)) navigate(nextGuide.steps[0].path);
  }, [location.pathname, navigate]);

  const step: RouteGuideStep | null = guide?.steps[currentStep] ?? null;

  const advance = useCallback(() => {
    if (!guide) return;
    if (currentStep >= guide.steps.length - 1) {
      cancelGuide();
      return;
    }
    const nextIndex = currentStep + 1;
    const nextStep = guide.steps[nextIndex];
    setCurrentStep(nextIndex);
    setTargetRect(null);
    targetRef.current = null;
    if (!matchesPath(location.pathname, nextStep.path)) navigate(nextStep.path);
  }, [cancelGuide, currentStep, guide, location.pathname, navigate]);

  useEffect(() => {
    if (!guide || !step) return;
    if (!matchesPath(location.pathname, step.path)) {
      navigate(step.path);
      return;
    }

    let active = true;
    const locate = () => {
      if (!active) return;
      const element = document.querySelector(getTargetSelector(step.target)) as HTMLElement | null;
      if (!element) {
        waitFrameRef.current = requestAnimationFrame(locate);
        return;
      }
      targetRef.current = element;
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      const update = () => {
        if (!targetRef.current) return;
        setTargetRect(targetRef.current.getBoundingClientRect());
      };
      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    };
    const cleanup = locate();
    return () => {
      active = false;
      if (waitFrameRef.current !== null) cancelAnimationFrame(waitFrameRef.current);
      if (typeof cleanup === "function") cleanup();
    };
  }, [guide, location.pathname, navigate, step]);

  useEffect(() => {
    if (!guide || !step) return;
    const onClick = (event: MouseEvent) => {
      const element = document.querySelector(getTargetSelector(step.target));
      const clicked = event.target instanceof Element ? event.target.closest(`[${TARGET_ATTRIBUTE}]`) : null;
      if (!element || clicked !== element) return;
      window.setTimeout(() => advance(), 80);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [advance, guide, step]);

  const value = useMemo<RouteGuideContextValue>(() => ({ active: Boolean(guide), guide, currentStep, totalSteps: guide?.steps.length ?? 0, startGuide, cancelGuide }), [cancelGuide, currentStep, guide, startGuide]);

  return <RouteGuideContext.Provider value={value}>
    {children}
    {guide && step && <div className="route-guide-layer" aria-live="polite">
      {targetRect && <div className="route-guide-spotlight" style={{ left: targetRect.left - 8, top: targetRect.top - 8, width: targetRect.width + 16, height: targetRect.height + 16 }} aria-hidden="true" />}
      <div className="route-guide-backdrop" aria-hidden="true" />
      <aside className="route-guide-card" role="dialog" aria-label={`Guided route step ${currentStep + 1} of ${guide.steps.length}`}>
        <div className="route-guide-card-top"><span>🧭 FOLLOW THE ROUTE</span><button type="button" onClick={cancelGuide} aria-label="Stop guided route">×</button></div>
        <strong>{step.title ?? guide.title}</strong>
        <p>{step.instruction ?? "Follow the glowing control to continue."}</p>
        <small>Step {currentStep + 1} of {guide.steps.length}</small>
      </aside>
    </div>}
  </RouteGuideContext.Provider>;
}

export function useRouteGuide() {
  const context = useContext(RouteGuideContext);
  if (!context) throw new Error("useRouteGuide must be used within RouteGuideProvider");
  return context;
}
