import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { MorphDefinition } from "../data/morphs";
import { normaliseSearch, rankMorphSearch } from "../utils/searchRelevance";
import { reverseMorph, type MorphReversalResult, type ReverseTreeNode } from "../utils/geneticsReversal";
import "./MorphReversalTheme.css";

type MorphReversalPanelProps = {
  morphs: MorphDefinition[];
};

function formatCopies(copies: number): string {
  return `×${copies}`;
}

function TreeNode({ node, depth = 0 }: { node: ReverseTreeNode; depth?: number }) {
  return (
    <div className="morph-reversal-tree-node" style={{ marginLeft: `${depth * 16}px` }}>
      <div className="morph-reversal-tree-line">
        <span className="morph-reversal-tree-marker" aria-hidden="true">{node.children.length ? "▾" : "•"}</span>
        <strong>{node.name}</strong>
        <span className="morph-reversal-tree-copy">{formatCopies(node.copies)}</span>
      </div>
      {node.children.map((child) => (
        <TreeNode key={`${child.id}-${child.copies}-${depth}`} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function ReversalResults({ result, onReverseComponent }: { result: MorphReversalResult; onReverseComponent: (name: string) => void }) {
  return (
    <div className="morph-reversal-results">
      <div className="morph-reversal-result-header">
        <div>
          <span className="calculator-kicker">GENETIC DECOMPOSITION</span>
          <h3>{result.canonicalName}</h3>
          <p>{result.recognised ? "Database-recognised morphology." : "Calculated combination; no dedicated database name matched the complete signature."}</p>
        </div>
        <span className={`morph-reversal-status ${result.recognised ? "is-recognised" : "is-calculated"}`}>
          {result.recognised ? "Recognised" : "Calculated"}
        </span>
      </div>

      {result.alternateNames.length > 0 && (
        <div className="morph-reversal-callout">
          <strong>Also recognised as:</strong>
          <span>{result.alternateNames.join(" · ")}</span>
        </div>
      )}

      <section className="morph-reversal-section">
        <div className="morph-reversal-section-heading">
          <div>
            <span className="morph-reversal-eyebrow">DIRECT BUILD</span>
            <h4>What the named morph contains</h4>
          </div>
        </div>
        <div className="morph-reversal-chip-grid">
          {result.directComponents.map((component) => (
            <button
              key={`${component.morphId}-${component.copies}`}
              type="button"
              className="morph-reversal-chip"
              onClick={() => onReverseComponent(component.name)}
              title={`Reverse ${component.name} further`}
            >
              <span>{component.name}</span>
              <strong>{formatCopies(component.copies)}</strong>
              <small>Reverse ↩</small>
            </button>
          ))}
        </div>
      </section>

      <section className="morph-reversal-section">
        <div className="morph-reversal-section-heading">
          <div>
            <span className="morph-reversal-eyebrow">UNDERLYING LOCI</span>
            <h4>Actual genetic requirements</h4>
          </div>
        </div>
        <div className="morph-reversal-locus-grid">
          {result.underlyingLoci.map((locus) => (
            <article key={locus.geneId} className="morph-reversal-locus-card">
              <div className="morph-reversal-locus-header">
                <div>
                  <strong>{locus.name}</strong>
                  <small>{locus.inheritance}</small>
                </div>
                <span>{formatCopies(locus.copies)}</span>
              </div>
              <div className="morph-reversal-state">Required state: <strong>{locus.expressedState}</strong></div>
              <div className="morph-reversal-routes">
                <span className="morph-reversal-eyebrow">VALID ONE-GENERATION ROUTES</span>
                {locus.routes.map((route) => (
                  <div key={`${route.mother.copies}-${route.father.copies}`} className="morph-reversal-route">
                    <span>{route.mother.label}</span>
                    <span className="morph-reversal-route-x">×</span>
                    <span>{route.father.label}</span>
                    <strong>{Number(route.childProbability.toFixed(4))}%</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="morph-reversal-section">
        <div className="morph-reversal-section-heading">
          <div>
            <span className="morph-reversal-eyebrow">REVERSE TREE</span>
            <h4>Follow the construction backwards</h4>
          </div>
        </div>
        <div className="morph-reversal-tree">
          <TreeNode node={result.tree} />
        </div>
      </section>

      <div className="morph-reversal-caveat">
        <strong>Genetics guardrail:</strong> {result.caveat}
      </div>
    </div>
  );
}

export default function MorphReversalPanel({ morphs }: MorphReversalPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMorph = searchParams.get("morph")?.trim() ?? "";
  const [query, setQuery] = useState(requestedMorph);
  const [result, setResult] = useState<MorphReversalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const options = useMemo(
    () => morphs.filter(
      (morph) =>
        morph.verification !== "Unverified" &&
        morph.verification !== "Disputed" &&
        (morph.kind === "Gene" || morph.kind === "Super" || morph.kind === "Combination"),
    ),
    [morphs],
  );

  const searchResults = useMemo(() => {
    const needle = normaliseSearch(query);
    if (!needle) return options.slice(0, 12);
    return rankMorphSearch(options, query, "strict").slice(0, 12);
  }, [options, query]);

  useEffect(() => {
    if (!requestedMorph || requestedMorph === query) return;
    setQuery(requestedMorph);
  }, [requestedMorph, query]);

  function resolve(value = query) {
    const clean = value.trim();
    if (!clean) {
      setError("Enter a morph or recognised combination.");
      setResult(null);
      return;
    }

    const resolved = reverseMorph(clean);
    if (!resolved) {
      setError("That morph could not be resolved from the current recognised genetics library.");
      setResult(null);
      return;
    }

    setQuery(resolved.canonicalName);
    setSearchOpen(false);
    setSearchParams((current) => {
      current.set("mode", "reversal");
      current.set("morph", resolved.canonicalName);
      return current;
    }, { replace: true });
    setError(null);
    setResult(resolved);
  }

  useEffect(() => {
    if (requestedMorph) {
      const resolved = reverseMorph(requestedMorph);
      if (resolved) {
        setResult(resolved);
        setQuery(resolved.canonicalName);
      }
    }
  }, [requestedMorph]);

  function reverseComponent(name: string) {
    setQuery(name);
    resolve(name);
  }

  return (
    <section className="calculator-results morph-reversal-panel">
      <div className="calculator-results-header">
        <div>
          <span className="calculator-kicker">REVERSE GENETICS LAB</span>
          <h2>Morph Reversal</h2>
          <p>Enter a combo morph and Tiny Titans works backwards from the phenotype to its named components, underlying loci, and valid parent-state routes.</p>
        </div>
        <span className="morph-reversal-lab-badge">↩ Build backwards</span>
      </div>

      <div className="morph-reversal-search">
        <div className="morph-reversal-search-row">
          <label htmlFor="morph-reversal-input">Morph / combination</label>
          <div className="morph-reversal-input-wrap">
            <input
              id="morph-reversal-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
                setResult(null);
                setError(null);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  resolve();
                }
                if (event.key === "Escape") setSearchOpen(false);
              }}
              placeholder="Search or type a morph name..."
              autoComplete="off"
              role="combobox"
              aria-expanded={searchOpen}
              aria-controls="morph-reversal-suggestions"
              aria-autocomplete="list"
            />
            <button type="button" onClick={() => resolve()} className="morph-reversal-resolve-button">Reverse</button>
          </div>
        </div>

        {searchOpen && (
          <div id="morph-reversal-suggestions" className="morph-reversal-suggestions" role="listbox" aria-label="Matching recognised morphs">
            {searchResults.map((morph) => (
              <button key={morph.geneId} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => resolve(morph.name)}>
                <strong>{morph.name}</strong>
                <small>{morph.kind}{morph.aliases?.length ? ` · ${morph.aliases.join(", ")}` : ""}</small>
              </button>
            ))}
            {!searchResults.length && (
              <p className="genetics-dropdown-empty">No matching recognised genetics. You can still free-type a name and press Reverse.</p>
            )}
          </div>
        )}

        {error && <div className="calculator-note-warning morph-reversal-error" role="alert">{error}</div>}
      </div>

      {result ? (
        <ReversalResults result={result} onReverseComponent={reverseComponent} />
      ) : (
        <div className="calculator-empty morph-reversal-empty">
          <div className="calculator-empty-icon">↩️</div>
          <h3>Put a morph name into the lab</h3>
          <p>Try a single gene, a Super form, or a recognised combination. The reversal never invents ancestry when the database cannot prove it.</p>
        </div>
      )}
    </section>
  );
}
