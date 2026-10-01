import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tinyTitansPageRegistry } from "../../config/tinyTitansPageRegistry";
import { scoreSearchCandidate } from "../../utils/searchRanking";
import "./TitanCommandPalette.css";

function resolveDestination(path: string, currentPath: string): string {
  if (!path) return "/";
  const [destinationPath, suffix = ""] = path.split(/(?=[?#])/);
  const animalMatch = currentPath.match(/^\/snakes\/([^/]+)(?:\/|$)/);

  if (animalMatch && ["/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry"].includes(destinationPath)) {
    return `/snakes/${encodeURIComponent(animalMatch[1])}${destinationPath}${suffix}`;
  }

  if (destinationPath.startsWith("/")) return path;
  return `/${path}`;
}

function TitanCommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    setQuery("");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => document.getElementById("tt-command-search")?.focus());

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? []);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) window.requestAnimationFrame(() => previousFocus.focus());
    };
  }, [open]);

  const currentGroup = tinyTitansPageRegistry.find((page) => location.pathname === page.path)?.group;
  const results = useMemo(() => {
    const normalized = query.trim();
    return tinyTitansPageRegistry
      .map((page, index) => {
        const labelScore = scoreSearchCandidate(normalized, page.label, "canonical");
        const descriptionScore = scoreSearchCandidate(normalized, page.description, "secondary");
        const pathScore = scoreSearchCandidate(normalized, page.path.replace(/[_-]+/g, " ").replaceAll("/", " "), "secondary");
        let score = Math.max(labelScore, descriptionScore, pathScore);
        if (!normalized && page.group === currentGroup) score += 20;
        if (page.path === location.pathname) score -= 1000;
        return { page, score: score - index * 0.0001 };
      })
      .filter(({ page, score }) => score > 0 && page.path !== location.pathname)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ page }) => page);
  }, [currentGroup, location.pathname, query]);

  const go = (path: string) => {
    setOpen(false);
    navigate(resolveDestination(path, location.pathname));
  };

  return (
    <>
      <button ref={triggerRef} type="button" className="tt-command-trigger" onClick={() => setOpen(true)} aria-label="Open Tiny Titans command palette">
        <span>Jump to…</span>
      </button>
      {open && (
        <div className="tt-command-backdrop" role="presentation" onPointerDown={() => setOpen(false)}>
          <section ref={dialogRef} className="tt-command-dialog" role="dialog" aria-modal="true" aria-labelledby="tt-command-title" onPointerDown={(event) => event.stopPropagation()}>
            <div className="tt-command-heading">
              <div><span className="tt-command-eyebrow">TINY TITANS</span><h2 id="tt-command-title">Jump anywhere</h2></div>
              <button type="button" className="tt-command-close" onClick={() => setOpen(false)} aria-label="Close command palette">×</button>
            </div>
            <input id="tt-command-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, tools and destinations…" autoComplete="off" />
            <div className="tt-command-results" role="listbox" aria-label="Tiny Titans destinations">
              {results.length ? results.map((page) => (
                <button key={page.id} type="button" className="tt-command-result" onClick={() => go(page.path)}>
                  <span className="tt-command-icon" aria-hidden="true">{page.icon}</span>
                  <span className="tt-command-copy"><strong>{page.label}</strong><small>{page.description}</small></span>
                  <span className="tt-command-arrow" aria-hidden="true">→</span>
                </button>
              )) : <div className="tt-command-empty">No matching destination. Try a broader search.</div>}
            </div>
            <footer className="tt-command-footer"><span>Exact matches and strong keeper terms are ranked first.</span><kbd>Esc</kbd></footer>
          </section>
        </div>
      )}
    </>
  );
}

export default TitanCommandPalette;
