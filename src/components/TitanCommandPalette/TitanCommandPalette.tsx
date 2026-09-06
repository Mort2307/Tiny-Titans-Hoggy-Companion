import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tinyTitansPageRegistry } from "../../config/tinyTitansPageRegistry";
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
    setQuery("");
    window.setTimeout(() => document.getElementById("tt-command-search")?.focus(), 0);
  }, [open]);

  const currentGroup = tinyTitansPageRegistry.find((page) => location.pathname === page.path)?.group;
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tinyTitansPageRegistry
      .map((page) => {
        let score = 0;
        if (!normalized && page.group === currentGroup) score += 20;
        if (page.label.toLowerCase() === normalized) score += 100;
        if (page.label.toLowerCase().includes(normalized)) score += 50;
        if (page.description.toLowerCase().includes(normalized)) score += 10;
        if (page.path === location.pathname) score -= 1000;
        return { page, score };
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
      <button type="button" className="tt-command-trigger" onClick={() => setOpen(true)} aria-label="Open Tiny Titans command palette">
        <span aria-hidden="true">⌕</span><span>Jump to…</span><kbd>⌘K</kbd>
      </button>
      {open && (
        <div className="tt-command-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="tt-command-dialog" role="dialog" aria-modal="true" aria-labelledby="tt-command-title" onMouseDown={(event) => event.stopPropagation()}>
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
            <footer className="tt-command-footer"><span>Enter a destination name to move directly to a page.</span><kbd>Esc</kbd></footer>
          </section>
        </div>
      )}
    </>
  );
}

export default TitanCommandPalette;
