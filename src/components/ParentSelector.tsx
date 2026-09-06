import { useMemo, useState } from "react";
import type { MorphDefinition } from "../data/morphs";
import { resolveStrictMorph } from "../utils/geneticsIdentity";
import { rankMorphSearch, normaliseSearch } from "../utils/searchRelevance";
import type { Het, HetPercentage } from "../types/genetics";
import type { Snake } from "../types/Snake";
import "../styles/het-confidence.css";

export type ParentSelection = {
  snakeId?: string;
  morphs: string[];
  hets: Het[];
  knownGeneCopies?: Record<string, 1 | 2>;
  customMorph?: string;
  customHets?: string;
};

type ParentSex = "Female" | "Male";
type ParentSelectorProps = { title: string; sex: ParentSex; parent: ParentSelection; snakes: Snake[]; morphOptions: MorphDefinition[]; hetOptions: MorphDefinition[]; onChange: (parent: ParentSelection) => void };
const HET_PERCENTAGES: HetPercentage[] = ["100%", "66%", "50%"];

function canonicalMorph(value: unknown): MorphDefinition | undefined { if (typeof value !== "string" || !value.trim()) return undefined; return resolveStrictMorph(value); }
function canonicalGeneId(value: unknown): string | undefined { return canonicalMorph(value)?.geneId ?? (typeof value === "string" && value.trim() ? value.trim() : undefined); }
function parseHetPercentage(value: unknown): HetPercentage { if (value === "50%" || value === "66%" || value === "100%") return value; const numeric = typeof value === "number" ? value : Number(String(value).replace("%", "").trim()); if (numeric === 50) return "50%"; if (numeric === 66) return "66%"; return "100%"; }
function normaliseSnakeHets(value: unknown): Het[] { if (!Array.isArray(value)) return []; return value.map((entry): Het | null => { if (typeof entry === "string" && entry.trim()) return { gene: canonicalGeneId(entry) ?? entry.trim(), percentage: "100%" }; if (!entry || typeof entry !== "object") return null; const record = entry as Record<string, unknown>; const gene = record.gene ?? record.geneId ?? record.name ?? record.morph; if (typeof gene !== "string" || !gene.trim()) return null; return { gene: canonicalGeneId(gene) ?? gene.trim(), percentage: parseHetPercentage(record.percentage) }; }).filter((het): het is Het => het !== null); }

export function snakeToSelection(snake: Snake): ParentSelection {
  const morphs = (Array.isArray(snake.morphs) ? snake.morphs : []).filter((value): value is string => typeof value === "string" && !!value.trim()).map((value) => canonicalGeneId(value) ?? value.trim());
  const profile = snake.geneticsProfile;
  const profileVisuals = profile?.visualMorphs ?? [];
  const mergedMorphs = [...morphs, ...profileVisuals.map((value) => canonicalGeneId(value) ?? value.trim())];
  const uniqueMorphs = [...new Set(mergedMorphs)];
  const hets = normaliseSnakeHets(snake.hets);
  const uniqueHets = hets.filter((het, index, list) => list.findIndex((candidate) => candidate.gene === het.gene) === index);
  const knownGeneCopies: Record<string, 1 | 2> = {};
  for (const record of profile?.genes ?? []) if ((record.status === "confirmed" || record.status === "probable") && (record.copies === 1 || record.copies === 2) && record.status === "confirmed") knownGeneCopies[record.geneId] = record.copies;
  for (const locus of profile?.loci ?? []) if (locus.status === "confirmed") {
    const a = locus.alleleA;
    const b = locus.alleleB;
    if (a && a === b) knownGeneCopies[a] = 2;
    else if (a && b && a !== "wild" && b === "wild") knownGeneCopies[a] = 1;
    else if (a && b && b !== "wild" && a === "wild") knownGeneCopies[b] = 1;
  }
  return { snakeId: snake.id, morphs: uniqueMorphs, hets: uniqueHets, knownGeneCopies: Object.keys(knownGeneCopies).length ? knownGeneCopies : undefined, customMorph: snake.customMorph || undefined, customHets: snake.customHets || undefined };
}

function toggleValue(values: string[], value: string): string[] { const canonical = canonicalGeneId(value) ?? value; return values.includes(canonical) ? values.filter((entry) => entry !== canonical) : [...values, canonical]; }
function MultiSelectDropdown({ label, options, selected, onToggle, searchPlaceholder, hetMode = false }: { label: string; options: MorphDefinition[]; selected: string[]; onToggle: (geneId: string) => void; searchPlaceholder: string; hetMode?: boolean }) {
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false);
  const filtered = useMemo(() => !normaliseSearch(query) ? options : rankMorphSearch(options, query, "strict"), [options, query]);
  return <div className="genetics-dropdown"><button type="button" className="genetics-dropdown-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>{label}</span><span className="genetics-dropdown-count">{selected.length ? `${selected.length} selected` : "Select"}</span><span aria-hidden="true">{open ? "▴" : "▾"}</span></button>{open && <div className="genetics-dropdown-panel" role="region" aria-label={label}><div className="genetics-dropdown-search-wrap"><input className="genetics-dropdown-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} type="search" aria-label={searchPlaceholder} />{query && <button type="button" className="genetics-dropdown-search-clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}</div><div className="genetics-dropdown-options" role="group" aria-label={`${label} options`}>{filtered.map((option) => { const geneId = option.geneId; const checked = selected.includes(geneId); return <label key={geneId} className="genetics-dropdown-option"><input type="checkbox" checked={checked} onChange={() => onToggle(geneId)} /><span><strong>{option.name}</strong><small>{hetMode ? `Het ${option.inheritance}` : `${option.kind}${option.inheritance ? ` · ${option.inheritance}` : ""}`}</small></span></label>; })}{!filtered.length && <p className="genetics-dropdown-empty">No relevant genetics found. Try the canonical name.</p>}</div><button type="button" className="genetics-dropdown-done" onClick={() => setOpen(false)}>Done</button></div>}</div>;
}

export default function ParentSelector({ title, sex, parent, snakes, morphOptions, hetOptions, onChange }: ParentSelectorProps) {
  const allowedSnakes = useMemo(() => snakes.filter((snake) => String(snake.sex).trim().toLowerCase() === sex.toLowerCase()), [snakes, sex]);
  const selectedSnake = allowedSnakes.find((snake) => snake.id === parent.snakeId);
  const selectedMorphNames = parent.morphs.map((id) => morphOptions.find((morph) => morph.geneId === id)?.name ?? id);
  const selectedHetIds = parent.hets.map((het) => canonicalGeneId(het?.gene)).filter((value): value is string => Boolean(value));

  function toggleMorph(geneId: string) { const canonical = canonicalGeneId(geneId); if (!canonical) return; const nextMorphs = toggleValue(parent.morphs, canonical); const known = { ...(parent.knownGeneCopies ?? {}) }; if (!nextMorphs.includes(canonical)) delete known[canonical]; onChange({ ...parent, snakeId: undefined, morphs: nextMorphs, knownGeneCopies: Object.keys(known).length ? known : undefined }); }
  function toggleHet(geneId: string) { const canonical = canonicalGeneId(geneId); if (!canonical) return; const exists = selectedHetIds.includes(canonical); const next = exists ? parent.hets.filter((het) => canonicalGeneId(het?.gene) !== canonical) : [...parent.hets, { gene: canonical, percentage: "100%" } as Het]; const visualSelected = parent.morphs.map(canonicalGeneId).filter((value): value is string => Boolean(value)); const cleanedHets = next.filter((het) => !visualSelected.includes(canonicalGeneId(het.gene) ?? "")); onChange({ ...parent, snakeId: undefined, hets: cleanedHets }); }
  function changeHetPercentage(gene: string, percentage: HetPercentage) { const canonical = canonicalGeneId(gene) ?? gene; onChange({ ...parent, snakeId: undefined, hets: parent.hets.map((het) => canonicalGeneId(het.gene) === canonical ? { ...het, percentage } : het) }); }
  function changeGeneCopies(gene: string, copies: 1 | 2 | undefined) { const known = { ...(parent.knownGeneCopies ?? {}) }; if (copies === undefined) delete known[gene]; else known[gene] = copies; onChange({ ...parent, snakeId: undefined, knownGeneCopies: Object.keys(known).length ? known : undefined }); }
  function handleSnakeChange(id: string) { if (!id) { onChange({ morphs: [], hets: [] }); return; } const snake = allowedSnakes.find((candidate) => candidate.id === id); if (snake) onChange(snakeToSelection(snake)); }

  return <section className="genetics-parent-selector"><div className="genetics-parent-heading"><div><h3>{title}</h3><p>{sex}-only saved snakes, or build the genetics manually.</p></div></div><div className="genetics-snake-select-wrap"><label htmlFor={`${title}-snake-select`}>Saved {sex} Snake</label><select id={`${title}-snake-select`} className="genetics-snake-select" value={selectedSnake?.id ?? ""} onChange={(event) => handleSnakeChange(event.target.value)}><option value="">Manual genetics</option>{allowedSnakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name} · {snake.sex} · {snake.morphs.length ? snake.morphs.join(", ") : "Normal"}</option>)}</select></div>{selectedSnake && <div className="genetics-snake-summary"><strong>{selectedSnake.name}</strong><span>{selectedSnake.sex}</span><span>{selectedSnake.morphs.length ? selectedSnake.morphs.join(" · ") : "Normal"}</span>{selectedSnake.hets.length > 0 && <span>{normaliseSnakeHets(selectedSnake.hets).map((het) => `${het.percentage} Het ${canonicalMorph(het.gene)?.name ?? het.gene}`).join(" · ")}</span>}</div>}<div className="genetics-selector-group"><h4>Visual Morphs & Confirmed Phenotypes</h4><MultiSelectDropdown label="Select visual morphs" options={morphOptions} selected={parent.morphs} onToggle={toggleMorph} searchPlaceholder="Search exact morph or gene..." />{selectedMorphNames.length > 0 && <div className="genetics-selected-tags">{selectedMorphNames.map((name) => { const morph = morphOptions.find((entry) => entry.name === name || entry.geneId === name); const copies = morph ? parent.knownGeneCopies?.[morph.geneId] : undefined; const inheritance = morph?.inheritance; const needsZygosity = inheritance === "Dominant" || inheritance === "Incomplete Dominant"; return <div key={name} className="genetics-morph-selection-row"><span className="genetics-selection-chip genetics-selection-chip-visual">{name}</span>{needsZygosity && <div className="genetics-gene-copy-controls" role="group" aria-label={`${name} gene copy state`}><span>Copies:</span><button type="button" className={copies === 1 ? "is-selected" : ""} onClick={() => changeGeneCopies(morph!.geneId, 1)} aria-pressed={copies === 1}>1</button><button type="button" className={copies === 2 ? "is-selected" : ""} onClick={() => changeGeneCopies(morph!.geneId, 2)} aria-pressed={copies === 2}>2</button><button type="button" className={!copies ? "is-selected" : ""} onClick={() => changeGeneCopies(morph!.geneId, undefined)} aria-pressed={!copies}>Unknown</button></div>}</div>; })}</div>}</div><div className="genetics-selector-group"><h4>Known Hets</h4><p className="genetics-het-confidence-help">Select the gene, then choose the confidence for that het: 100%, 66% or 50%.</p><MultiSelectDropdown label="Select het genetics" options={hetOptions} selected={selectedHetIds} onToggle={toggleHet} searchPlaceholder="Search exact het-capable gene..." hetMode />{parent.hets.length > 0 && <div className="genetics-selected-tags genetics-selected-hets">{parent.hets.map((het) => { const geneId = canonicalGeneId(het.gene) ?? het.gene; const name = canonicalMorph(het.gene)?.name ?? het.gene; return <div key={`${geneId}-${het.percentage}`} className="genetics-het-selection-row"><span className="genetics-selection-chip genetics-selection-chip-het">{name}</span><div className="genetics-het-confidence" role="group" aria-label={`${name} het confidence`}>{HET_PERCENTAGES.map((percentage) => <button key={percentage} type="button" className={het.percentage === percentage ? "is-selected" : ""} onClick={() => changeHetPercentage(geneId, percentage)} aria-pressed={het.percentage === percentage}>{percentage}</button>)}</div><span className="genetics-het-label">Het</span></div>; })}</div>}</div>{(parent.customMorph || parent.customHets) && <div className="genetics-custom-warning"><strong>Unresolved recorded genetics</strong><span>{parent.customMorph ? `Custom morph: ${parent.customMorph}. ` : ""}{parent.customHets ? `Custom hets: ${parent.customHets}.` : ""} These are shown for reference but are not silently treated as confirmed calculator genetics.</span></div>}</section>;
}
