import { useMemo, useState } from "react";
import type { MorphDefinition } from "../data/morphs";
import { resolveStrictMorph } from "../utils/geneticsIdentity";
import { parseHetPercentage } from "../utils/geneticsHetScenarios";
import type { Het, HetPercentage } from "../types/genetics";
import type { Snake } from "../types/Snake";

export type ParentSelection = { snakeId?: string; morphs: string[]; hets: Het[]; customMorph?: string; customHets?: string };
type ParentSelectorProps = { title: string; parent: ParentSelection; snakes: Snake[]; morphOptions: MorphDefinition[]; hetOptions: MorphDefinition[]; onChange: (parent: ParentSelection) => void };
const HET_PERCENTAGES: HetPercentage[] = [50, 66, 100];
function canonicalMorph(value: unknown): MorphDefinition | undefined { if (typeof value !== "string" || !value.trim()) return undefined; return resolveStrictMorph(value); }
function canonicalGeneId(value: unknown): string | undefined { return canonicalMorph(value)?.geneId ?? (typeof value === "string" && value.trim() ? value.trim() : undefined); }
function parseCustomHetConfidence(customHets: unknown, gene: MorphDefinition): HetPercentage | undefined {
  if (typeof customHets !== "string" || !customHets.trim()) return undefined;
  const text = customHets.toLowerCase();
  const names = [gene.name, ...(gene.aliases ?? []), gene.geneId].filter(Boolean).map((value) => value.toLowerCase());
  if (!names.some((name) => text.includes(name))) return undefined;
  const match = text.match(/(?:50|66|100)\s*%?/);
  return match ? parseHetPercentage(match[0]) : undefined;
}
function normaliseSnakeHets(value: unknown, customHets?: unknown, hetOptions: MorphDefinition[] = []): Het[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry): Het | null => {
    if (typeof entry === "string" && entry.trim()) {
      const gene = canonicalGeneId(entry) ?? entry.trim();
      const definition = hetOptions.find((option) => option.geneId === gene || option.name.toLowerCase() === gene.toLowerCase());
      return { gene, percentage: parseCustomHetConfidence(customHets, definition ?? ({ name: gene, aliases: [], geneId: gene } as MorphDefinition)) ?? 100 };
    }
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const geneValue = record.gene ?? record.geneId ?? record.name ?? record.morph;
    if (typeof geneValue !== "string" || !geneValue.trim()) return null;
    const gene = canonicalGeneId(geneValue) ?? geneValue.trim();
    const definition = hetOptions.find((option) => option.geneId === gene || option.name.toLowerCase() === gene.toLowerCase());
    const rawPercentage = record.percentage ?? record.hetPercentage ?? record.probability ?? record.hetProbability ?? record.likelihood ?? record.percent;
    const customConfidence = parseCustomHetConfidence(customHets, definition ?? ({ name: gene, aliases: [], geneId: gene } as MorphDefinition));
    return { gene, percentage: customConfidence ?? parseHetPercentage(rawPercentage) };
  }).filter((het): het is Het => het !== null);
}
function snakeToSelection(snake: Snake, hetOptions: MorphDefinition[]): ParentSelection {
  const morphs = (Array.isArray(snake.morphs) ? snake.morphs : []).filter((value): value is string => typeof value === "string" && !!value.trim()).map((value) => canonicalGeneId(value) ?? value.trim());
  const uniqueMorphs = [...new Set(morphs)];
  const hets = normaliseSnakeHets(snake.hets, snake.customHets, hetOptions);
  const uniqueHets = hets.filter((het, index, list) => list.findIndex((candidate) => candidate.gene === het.gene) === index);
  return { snakeId: snake.id, morphs: uniqueMorphs, hets: uniqueHets, customMorph: snake.customMorph || undefined, customHets: snake.customHets || undefined };
}
function toggleValue(values: string[], value: string): string[] { const canonical = canonicalGeneId(value) ?? value; return values.includes(canonical) ? values.filter((entry) => entry !== canonical) : [...values, canonical]; }
function MultiSelectDropdown({ label, options, selected, onToggle, searchPlaceholder, hetMode = false }: { label: string; options: MorphDefinition[]; selected: string[]; onToggle: (geneId: string) => void; searchPlaceholder: string; hetMode?: boolean }) {
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? options.filter((option) => [option.name, ...(option.aliases ?? []), option.geneId].join(" ").toLowerCase().includes(q)) : options; }, [options, query]);
  return <div className="genetics-dropdown"><button type="button" className="genetics-dropdown-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>{label}</span><span className="genetics-dropdown-count">{selected.length ? `${selected.length} selected` : "Select"}</span><span aria-hidden="true">{open ? "▴" : "▾"}</span></button>{open && <div className="genetics-dropdown-panel" role="region" aria-label={label}><input className="genetics-dropdown-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} type="search" aria-label={searchPlaceholder} /><div className="genetics-dropdown-options" role="group" aria-label={`${label} options`}>{filtered.map((option) => { const geneId = option.geneId; const checked = selected.includes(geneId); return <label key={geneId} className="genetics-dropdown-option"><input type="checkbox" checked={checked} onChange={() => onToggle(geneId)} /><span><strong>{option.name}</strong><small>{hetMode ? `Het ${option.inheritance}` : `${option.kind}${option.inheritance ? ` · ${option.inheritance}` : ""}`}</small></span></label>; })}{!filtered.length && <p className="genetics-dropdown-empty">No matching genetics.</p>}</div><button type="button" className="genetics-dropdown-done" onClick={() => setOpen(false)}>Done</button></div>}</div>;
}
export default function ParentSelector({ title, parent, snakes, morphOptions, hetOptions, onChange }: ParentSelectorProps) {
  const selectedSnake = snakes.find((snake) => snake.id === parent.snakeId);
  const selectedMorphNames = parent.morphs.map((id) => morphOptions.find((morph) => morph.geneId === id)?.name ?? id);
  const selectedHetIds = parent.hets.map((het) => canonicalGeneId(het?.gene)).filter((value): value is string => Boolean(value));
  function toggleMorph(geneId: string) { const canonical = canonicalGeneId(geneId); if (!canonical) return; onChange({ ...parent, snakeId: undefined, morphs: toggleValue(parent.morphs, canonical) }); }
  function toggleHet(geneId: string) { const canonical = canonicalGeneId(geneId); if (!canonical) return; const exists = selectedHetIds.includes(canonical); const next = exists ? parent.hets.filter((het) => canonicalGeneId(het?.gene) !== canonical) : [...parent.hets, { gene: canonical, percentage: 100 as HetPercentage }]; const visualSelected = parent.morphs.map(canonicalGeneId).filter((value): value is string => Boolean(value)); const cleanedHets = next.filter((het) => !visualSelected.includes(canonicalGeneId(het.gene) ?? "")); onChange({ ...parent, snakeId: undefined, hets: cleanedHets }); }
  function updateHetPercentage(gene: string, percentage: HetPercentage) { onChange({ ...parent, hets: parent.hets.map((het) => canonicalGeneId(het.gene) === canonicalGeneId(gene) ? { ...het, percentage } : het) }); }
  function handleSnakeChange(id: string) { if (!id) { onChange({ morphs: [], hets: [] }); return; } const snake = snakes.find((candidate) => candidate.id === id); if (snake) onChange(snakeToSelection(snake, hetOptions)); }
  const displayedSnakeHets = selectedSnake ? normaliseSnakeHets(selectedSnake.hets, selectedSnake.customHets, hetOptions) : [];
  return <section className="genetics-parent-selector"><div className="genetics-parent-heading"><div><h3>{title}</h3><p>Choose one of your snakes or build the genetics manually.</p></div></div><div className="genetics-snake-select-wrap"><label htmlFor={`${title}-snake-select`}>Saved Snake</label><select id={`${title}-snake-select`} className="genetics-snake-select" value={parent.snakeId ?? ""} onChange={(event) => handleSnakeChange(event.target.value)}><option value="">Manual genetics</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name} · {snake.sex} · {snake.morphs.length ? snake.morphs.join(", ") : "Normal"}</option>)}</select></div>{selectedSnake && <div className="genetics-snake-summary"><strong>{selectedSnake.name}</strong><span>{selectedSnake.sex}</span><span>{selectedSnake.morphs.length ? selectedSnake.morphs.join(" · ") : "Normal"}</span>{displayedSnakeHets.length > 0 && <span>{displayedSnakeHets.map((het) => `${het.percentage}% Het ${canonicalMorph(het.gene)?.name ?? het.gene}`).join(" · ")}</span>}</div>}<div className="genetics-selector-group"><h4>Visual Morphs & Confirmed Phenotypes</h4><MultiSelectDropdown label="Select visual morphs" options={morphOptions} selected={parent.morphs} onToggle={toggleMorph} searchPlaceholder="Search confirmed morphs..." />{selectedMorphNames.length > 0 && <div className="genetics-selected-tags">{selectedMorphNames.map((name) => <span key={name} className="genetics-selection-chip genetics-selection-chip-visual">{name}</span>)}</div>}</div><div className="genetics-selector-group"><h4>Known Hets</h4><MultiSelectDropdown label="Select het genetics" options={hetOptions} selected={selectedHetIds} onToggle={toggleHet} searchPlaceholder="Search confirmed het-capable genes..." hetMode />{parent.hets.length > 0 && <div className="genetics-selected-tags">{parent.hets.map((het) => <span key={canonicalGeneId(het.gene)} className="genetics-selection-chip genetics-selection-chip-het genetics-selection-chip-het-editable"><select className="genetics-het-percentage-select" aria-label={`Het percentage for ${canonicalMorph(het.gene)?.name ?? het.gene}`} value={String(parseHetPercentage(het.percentage))} onChange={(event) => updateHetPercentage(het.gene, parseHetPercentage(event.target.value))}>{HET_PERCENTAGES.map((percentage) => <option key={percentage} value={percentage}>{percentage}%</option>)}</select><span>Het {canonicalMorph(het.gene)?.name ?? het.gene}</span></span>)}</div>}</div>{(parent.customMorph || parent.customHets) && <div className="genetics-custom-warning"><strong>Unresolved recorded genetics</strong><span>{parent.customMorph ? `Custom morph: ${parent.customMorph}. ` : ""}{parent.customHets ? `Custom hets: ${parent.customHets}.` : ""} These are shown for reference but are not silently treated as confirmed calculator genetics.</span></div>}</section>;
}
