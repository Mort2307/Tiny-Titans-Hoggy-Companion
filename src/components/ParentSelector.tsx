import { useMemo, useState } from "react";
import type { MorphDefinition } from "../data/morphs";
import { resolveStrictMorph } from "../utils/geneticsIdentity";
import { rankMorphSearch, normaliseSearch } from "../utils/searchRelevance";
import type { Het, HetPercentage } from "../types/genetics";
import type { Snake } from "../types/Snake";

export type ParentSelection = {
  snakeId?: string;
  morphs: string[];
  hets: Het[];
  customMorph?: string;
  customHets?: string;
};

type ParentSelectorProps = {
  title: string;
  parent: ParentSelection;
  snakes: Snake[];
  morphOptions: MorphDefinition[];
  hetOptions: MorphDefinition[];
  onChange: (parent: ParentSelection) => void;
};

function canonicalMorph(value: unknown): MorphDefinition | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return resolveStrictMorph(value);
}

function canonicalGeneId(value: unknown): string | undefined {
  return canonicalMorph(value)?.geneId ?? (typeof value === "string" && value.trim() ? value.trim() : undefined);
}

/**
 * Preserve the recorded het confidence exactly as stored.
 * Firestore/legacy records may contain either 66 or "66%".
 * Number("66%") is NaN, which previously caused the calculator
 * to silently fall back to 100%. That is not genetically valid.
 */
function parseHetPercentage(value: unknown): HetPercentage {
  if (value === "50%" || value === "66%" || value === "100%") return value;

  const numeric = typeof value === "number" ? value : Number(String(value).replace("%", "").trim());
  if (numeric === 50) return 50;
  if (numeric === 66) return 66;
  if (numeric === 100) return 100;

  return 100;
}

function normaliseSnakeHets(value: unknown): Het[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): Het | null => {
      if (typeof entry === "string" && entry.trim()) {
        return { gene: canonicalGeneId(entry) ?? entry.trim(), percentage: 100 };
      }

      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const gene = record.gene ?? record.geneId ?? record.name ?? record.morph;
      if (typeof gene !== "string" || !gene.trim()) return null;

      return {
        gene: canonicalGeneId(gene) ?? gene.trim(),
        percentage: parseHetPercentage(record.percentage),
      };
    })
    .filter((het): het is Het => het !== null);
}

export function snakeToSelection(snake: Snake): ParentSelection {
  const morphs = (Array.isArray(snake.morphs) ? snake.morphs : [])
    .filter((value): value is string => typeof value === "string" && !!value.trim())
    .map((value) => canonicalGeneId(value) ?? value.trim());
  const uniqueMorphs = [...new Set(morphs)];
  const hets = normaliseSnakeHets(snake.hets);
  const uniqueHets = hets.filter((het, index, list) => list.findIndex((candidate) => candidate.gene === het.gene) === index);
  return { snakeId: snake.id, morphs: uniqueMorphs, hets: uniqueHets, customMorph: snake.customMorph || undefined, customHets: snake.customHets || undefined };
}

function toggleValue(values: string[], value: string): string[] {
  const canonical = canonicalGeneId(value) ?? value;
  return values.includes(canonical) ? values.filter((entry) => entry !== canonical) : [...values, canonical];
}

function MultiSelectDropdown({ label, options, selected, onToggle, searchPlaceholder, hetMode = false }: { label: string; options: MorphDefinition[]; selected: string[]; onToggle: (geneId: string) => void; searchPlaceholder: string; hetMode?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!normaliseSearch(query)) return options;
    return rankMorphSearch(options, query, "strict");
  }, [options, query]);

  return (
    <div className="genetics-dropdown">
      <button type="button" className="genetics-dropdown-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{label}</span><span className="genetics-dropdown-count">{selected.length ? `${selected.length} selected` : "Select"}</span><span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="genetics-dropdown-panel" role="region" aria-label={label}>
          <div className="genetics-dropdown-search-wrap">
            <input className="genetics-dropdown-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} type="search" aria-label={searchPlaceholder} />
            {query && <button type="button" className="genetics-dropdown-search-clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </div>
          <div className="genetics-dropdown-options" role="group" aria-label={`${label} options`}>
            {filtered.map((option) => {
              const geneId = option.geneId;
              const checked = selected.includes(geneId);
              return <label key={geneId} className="genetics-dropdown-option"><input type="checkbox" checked={checked} onChange={() => onToggle(geneId)} /><span><strong>{option.name}</strong><small>{hetMode ? `Het ${option.inheritance}` : `${option.kind}${option.inheritance ? ` · ${option.inheritance}` : ""}`}</small></span></label>;
            })}
            {!filtered.length && <p className="genetics-dropdown-empty">No relevant genetics found. Try the canonical name.</p>}
          </div>
          <button type="button" className="genetics-dropdown-done" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}

export default function ParentSelector({ title, parent, snakes, morphOptions, hetOptions, onChange }: ParentSelectorProps) {
  const selectedSnake = snakes.find((snake) => snake.id === parent.snakeId);
  const selectedMorphNames = parent.morphs.map((id) => morphOptions.find((morph) => morph.geneId === id)?.name ?? id);
  const selectedHetIds = parent.hets.map((het) => canonicalGeneId(het?.gene)).filter((value): value is string => Boolean(value));

  function toggleMorph(geneId: string) {
    const canonical = canonicalGeneId(geneId);
    if (!canonical) return;
    onChange({ ...parent, snakeId: undefined, morphs: toggleValue(parent.morphs, canonical) });
  }

  function toggleHet(geneId: string) {
    const canonical = canonicalGeneId(geneId);
    if (!canonical) return;
    const exists = selectedHetIds.includes(canonical);
    const next = exists ? parent.hets.filter((het) => canonicalGeneId(het?.gene) !== canonical) : [...parent.hets, { gene: canonical, percentage: 100 } as Het];
    const visualSelected = parent.morphs.map(canonicalGeneId).filter((value): value is string => Boolean(value));
    const cleanedHets = next.filter((het) => !visualSelected.includes(canonicalGeneId(het.gene) ?? ""));
    onChange({ ...parent, snakeId: undefined, hets: cleanedHets });
  }

  function handleSnakeChange(id: string) {
    if (!id) { onChange({ morphs: [], hets: [] }); return; }
    const snake = snakes.find((candidate) => candidate.id === id);
    if (snake) onChange(snakeToSelection(snake));
  }

  return (
    <section className="genetics-parent-selector">
      <div className="genetics-parent-heading"><div><h3>{title}</h3><p>Choose one of your snakes or build the genetics manually.</p></div></div>
      <div className="genetics-snake-select-wrap"><label htmlFor={`${title}-snake-select`}>Saved Snake</label><select id={`${title}-snake-select`} className="genetics-snake-select" value={parent.snakeId ?? ""} onChange={(event) => handleSnakeChange(event.target.value)}><option value="">Manual genetics</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name} · {snake.sex} · {snake.morphs.length ? snake.morphs.join(", ") : "Normal"}</option>)}</select></div>
      {selectedSnake && <div className="genetics-snake-summary"><strong>{selectedSnake.name}</strong><span>{selectedSnake.sex}</span><span>{selectedSnake.morphs.length ? selectedSnake.morphs.join(" · ") : "Normal"}</span>{selectedSnake.hets.length > 0 && <span>{normaliseSnakeHets(selectedSnake.hets).map((het) => `${het.percentage} Het ${het.gene}`).join(" · ")}</span>}</div>}
      <div className="genetics-selector-group"><h4>Visual Morphs & Confirmed Phenotypes</h4><MultiSelectDropdown label="Select visual morphs" options={morphOptions} selected={parent.morphs} onToggle={toggleMorph} searchPlaceholder="Search exact morph or gene..." />{selectedMorphNames.length > 0 && <div className="genetics-selected-tags">{selectedMorphNames.map((name) => <span key={name} className="genetics-selection-chip genetics-selection-chip-visual">{name}</span>)}</div>}</div>
      <div className="genetics-selector-group"><h4>Known Hets</h4><MultiSelectDropdown label="Select het genetics" options={hetOptions} selected={selectedHetIds} onToggle={toggleHet} searchPlaceholder="Search exact het-capable gene..." hetMode />{parent.hets.length > 0 && <div className="genetics-selected-tags">{parent.hets.map((het) => <span key={`${canonicalGeneId(het.gene)}-${het.percentage}`} className="genetics-selection-chip genetics-selection-chip-het">{het.percentage} Het {canonicalMorph(het.gene)?.name ?? het.gene}</span>)}</div>}</div>
      {(parent.customMorph || parent.customHets) && <div className="genetics-custom-warning"><strong>Unresolved recorded genetics</strong><span>{parent.customMorph ? `Custom morph: ${parent.customMorph}. ` : ""}{parent.customHets ? `Custom hets: ${parent.customHets}.` : ""} These are shown for reference but are not silently treated as confirmed calculator genetics.</span></div>}
    </section>
  );
}
