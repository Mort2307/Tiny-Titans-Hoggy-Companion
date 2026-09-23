import { useLayoutEffect } from "react";

export function useLayoutScrollRestoration(key: string) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const historyWithRestoration = window.history as History & {
      scrollRestoration?: "auto" | "manual";
    };

    if (historyWithRestoration.scrollRestoration) {
      historyWithRestoration.scrollRestoration = "manual";
    }

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();

    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll();
      window.requestAnimationFrame(resetScroll);
    });

    const timeout = window.setTimeout(resetScroll, 80);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(timeout);
    };
  }, [key]);
}
