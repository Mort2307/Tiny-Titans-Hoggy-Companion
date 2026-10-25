import { useMemo, useState } from "react";
import type { MorphDefinition } from "../data/morphs";
import type { OffspringResult } from "../types/genetics";
import ResultCard from "./ResultCard";
import "./BreedingOutcomeDashboard.css";

type Filter = "all" | "named" | "visual" | "carrier" | "conditional";
const options: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All outcomes" }, { id: "named", label: "Named combinations" },
  { id: "visual", label: "Visual morphs" }, { id: "carrier", label: "Hets / carriers" },
  { id: "conditional", label: "Uncertain outcomes" },
];
const hasKnownProbability = (entry: OffspringResult) =>
  entry.percentage !== undefined && entry.certainty !== "bounded" && !entry.hasUnresolvedGenetics;
const formatPercent = (value: number) => Number(value.toFixed(4)).toLocaleString("en-GB", { maximumFractionDigits: 4 }) + "%";

export default function BreedingOutcomeDashboard({ offspring, morphs }: { offspring: OffspringResult[]; morphs: MorphDefinition[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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
      ])];
      if (!names.some((name) => name.toLowerCase().includes(search.trim().toLowerCase()))) return false;
    }
    if (filter === "named") return group.named;
    if (filter === "visual") return group.items.some((item) => item.visualComponents.length > 0);
    if (filter === "carrier") return group.items.some((item) => item.hetComponents.length > 0 || item.possibleHetComponents.length > 0);
    if (filter === "conditional") return group.uncertain;
    return true;
  });
  return <section className="tt-outcomes" aria-label="Offspring prediction dashboard">
    <div className="tt-outcomes-stats">
      <div><small>Possible phenotypes</small><strong>{groups.length}</strong></div>
      <div><small>Named outcomes</small><strong>{offspring.filter((item) => item.recognisedCombination).length}</strong></div>
      <div><small>Forecast</small><strong>{offspring.some((item) => !hasKnownProbability(item)) ? "Conditional" : "Modelled"}</strong></div>
    </div>
    <p className="tt-outcomes-note">Percentages are modelled per-offspring probabilities, not guaranteed clutch proportions. Genetic unknowns are never assumed clear. A named combination describes its underlying traits, not an independent gene.</p>
    <div className="tt-outcomes-filters">
      <label>Find morph or gene<input type="search" placeholder="Search outcomes…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label>Filter<select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>{options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
      <label className="tt-outcomes-checkbox"><input type="checkbox" checked={expand} onChange={(event) => setExpand(event.target.checked)} /> Show all genotype details</label>
    </div>
    <div className="tt-outcomes-list">
      {visible.length === 0 && <p>No results match these filters.</p>}
      {visible.map((group) => <article className="tt-outcomes-card" key={group.name.toLowerCase()}>
        <div className="tt-outcomes-heading">
          <div><small>{group.named ? "Recognised combination name" : "Genetic phenotype"}</small><h3>{group.name}</h3><small>{group.items.length} genetic {group.items.length === 1 ? "outcome" : "outcomes"}</small></div>
          <strong>{group.uncertain ? "Conditional" : formatPercent(group.probability)}</strong>
        </div>
        {group.uncertain ? <p>Unresolved parental states prevent a single percentage.</p> : <progress max="100" value={Math.min(100, group.probability)} aria-label={group.name + " probability"} />}
        <details key={expand ? "expanded" : "collapsed"} open={expand}>
          <summary>Genetics, carrier states and alternative names</summary>
          <div className="tt-outcomes-details">{group.items.map((item) => <ResultCard key={item.id} result={item} morphs={morphs} />)}</div>
        </details>
      </article>)}
    </div>
  </section>;
}
