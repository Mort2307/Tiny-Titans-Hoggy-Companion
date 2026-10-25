import { useMemo, useState } from "react";
import type { MorphDefinition } from "../data/morphs";
import type { OffspringResult } from "../types/genetics";
import ResultCard from "./ResultCard";
import "./BreedingOutcomeDashboard.css";

type Filter = "all" | "named" | "visual" | "carrier" | "conditional";
const options: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All outcomes" },
  { id: "named", label: "Named combinations" },
  { id: "visual", label: "Visual morphs" },
  { id: "carrier", label: "Hets / carriers" },
  { id: "conditional", label: "Uncertain outcomes" },
];
const hasKnownProbability = (entry: OffspringResult) =>
  entry.percentage !== undefined && entry.certainty !== "bounded" && !entry.hasUnresolvedGenetics;
const formatPercent = (value: number) => Number(value.toFixed(4)).toLocaleString("en-GB", { maximumFractionDigits: 4 }) + "%";
const PREVIEW_LIMIT = 8;

export default function BreedingOutcomeDashboard({ offspring, morphs }: { offspring: OffspringResult[]; morphs: MorphDefinition[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const [expand, setExpand] = useState(false);
  const groups = useMemo(() => {
    const found = new Map<string, { name: string; items: OffspringResult[]; probability: number; uncertain: boolean; named: boolean }>();
    for (const result of offspring) {
      const name = result.name || "Unclassified phenotype";
      const key = name.trim().toLowerCase();
      const existing = found.get(key);
      if (existing) {
        existing.items.push(result);
        existing.probability += result.percentage ?? 0;
        existing.uncertain ||= !hasKnownProbability(result);
        existing.named ||= !!result.recognisedCombination;
      } else {
        found.set(key, {
          name, items: [result], probability: result.percentage ?? 0,
          uncertain: !hasKnownProbability(result), named: !!result.recognisedCombination,
        });
      }
    }
    return [...found.values()].sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));
  }, [offspring]);
  const visible = groups.filter((group) => {
    if (search.trim()) {
      const names = [group.name, ...group.items.flatMap((entry) => [
        ...entry.visualComponents.map((part) => part.name),
        ...entry.hetComponents.map((part) => part.name),
        ...entry.possibleHetComponents.map((part) => part.name),
      ])];
      if (!names.some((name) => name.toLowerCase().includes(search.trim().toLowerCase()))) return false;
    }
    if (filter === "named") return group.named;
    if (filter === "visual") return group.items.some((item) => item.visualComponents.length > 0);
    if (filter === "carrier") return group.items.some((item) => item.hetComponents.length > 0 || item.possibleHetComponents.length > 0);
    if (filter === "conditional") return group.uncertain;
    return true;
  });
  const filtering = Boolean(search.trim()) || filter !== "all";
  const shown = !showAll && !filtering ? visible.slice(0, PREVIEW_LIMIT) : visible;
  const remaining = Math.max(0, visible.length - shown.length);
  return <section className="tt-outcomes" aria-label="Offspring prediction dashboard">
    <div className="tt-outcomes-summary" aria-label="Genetic forecast summary">
      <span><strong>{groups.length}</strong> phenotypes</span>
      <span><strong>{groups.filter((group) => group.named).length}</strong> named combinations</span>
      <span>{offspring.some((item) => !hasKnownProbability(item)) ? "Conditional forecast" : "Modelled probabilities"}</span>
    </div>
    <div className="tt-outcomes-toolbar">
      <label className="tt-outcomes-search"><span className="sr-only">Find a morph or gene</span><input type="search" placeholder="Find a morph or gene…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="tt-outcomes-filter"><span className="sr-only">Filter outcomes</span><select aria-label="Filter outcomes" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>{options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
    </div>
    <div className="tt-outcomes-list">
      {shown.length === 0 && <p className="tt-outcomes-no-matches">No results match these filters.</p>}
      {shown.map((group) => <article className="tt-outcomes-card" key={group.name.toLowerCase()}>
        <div className="tt-outcomes-heading">
          <div><small>{group.named ? "Recognised combination" : "Genetic phenotype"}</small><h3>{group.name}</h3>{group.items.length > 1 && <small>{group.items.length} distinct genotype outcomes</small>}</div>
          <strong>{group.uncertain ? "Conditional" : formatPercent(group.probability)}</strong>
        </div>
        <details key={expand ? "all-open" : "manual"} open={expand} className="tt-outcomes-breakdown">
          <summary>View genetics &amp; carrier details</summary>
          <div className="tt-outcomes-details">{group.items.map((item) => <ResultCard key={item.id} result={item} morphs={morphs} />)}</div>
        </details>
      </article>)}
    </div>
    {remaining > 0 && <button type="button" className="tt-outcomes-more" onClick={() => setShowAll(true)}>Show all {visible.length} phenotypes ({remaining} more)</button>}
    {showAll && !filtering && visible.length > PREVIEW_LIMIT && <button type="button" className="tt-outcomes-less" onClick={() => setShowAll(false)}>Show fewer</button>}
    <details className="tt-outcomes-guide">
      <summary>How to interpret these predictions</summary>
      <p>Percentages are modelled per-offspring probabilities, not guaranteed clutch proportions. Unknown genetics are not assumed clear. Named combinations describe their component traits, not a new independent gene.</p>
      <label className="tt-outcomes-expand-all"><input type="checkbox" checked={expand} onChange={(event) => setExpand(event.target.checked)} /> Expand all genotype breakdowns</label>
    </details>
  </section>;
}
