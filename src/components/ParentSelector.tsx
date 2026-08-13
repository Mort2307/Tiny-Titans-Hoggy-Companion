import { useMemo } from "react";
import type { MorphDefinition } from "../data/morphs";
import { sortMorphsByGeneticFamily } from "../utils/morphSorting";

export type ParentSelection = {
  morphs: string[];
  hets: string[];
};

type ParentSelectorProps = {
  title: string;
  parent: ParentSelection;
  morphOptions: MorphDefinition[];
  hetOptions: MorphDefinition[];
  onChange: (parent: ParentSelection) => void;
};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function canonicaliseSelection(values: string[], options: MorphDefinition[]): string[] {
  const byName = new Map(options.map((option) => [option.name.trim().toLowerCase(), option.geneId]));
  const byId = new Map(options.map((option) => [option.geneId.trim().toLowerCase(), option.geneId]));
  return [...new Set(values.map((value) => byId.get(value.trim().toLowerCase()) ?? byName.get(value.trim().toLowerCase())).filter((value): value is string => Boolean(value)))];
}

export default function ParentSelector({ title, parent, morphOptions, hetOptions, onChange }: ParentSelectorProps) {
  const sortedMorphOptions = useMemo(() => sortMorphsByGeneticFamily(morphOptions), [morphOptions]);
  const sortedHetOptions = useMemo(() => sortMorphsByGeneticFamily(hetOptions), [hetOptions]);

  function toggleMorph(geneId: string) {
    const current = canonicaliseSelection(parent.morphs, morphOptions);
    onChange({ ...parent, morphs: toggleValue(current, geneId) });
  }

  function toggleHet(geneId: string) {
    const current = canonicaliseSelection(parent.hets, hetOptions);
    onChange({ ...parent, hets: toggleValue(current, geneId) });
  }

  return (
    <section className="genetics-parent-selector">
      <h3>{title}</h3>
      <div className="genetics-selector-group">
        <h4>Visual Morphs</h4>
        <div className="genetics-option-grid">
          {sortedMorphOptions.map((morph) => (
            <label key={morph.geneId} className="genetics-option">
              <input type="checkbox" checked={parent.morphs.includes(morph.geneId)} onChange={() => toggleMorph(morph.geneId)} />
              <span>{morph.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="genetics-selector-group">
        <h4>Het Genetics</h4>
        <div className="genetics-option-grid">
          {sortedHetOptions.map((morph) => (
            <label key={morph.geneId} className="genetics-option">
              <input type="checkbox" checked={parent.hets.includes(morph.geneId)} onChange={() => toggleHet(morph.geneId)} />
              <span>{morph.name}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
