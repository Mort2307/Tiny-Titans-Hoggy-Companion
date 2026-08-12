import type { MorphDefinition } from "../data/morphs";

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

function toggleValue(
  values: string[],
  value: string
): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function ParentSelector({
  title,
  parent,
  morphOptions,
  hetOptions,
  onChange,
}: ParentSelectorProps) {
  function toggleMorph(geneId: string) {
    onChange({
      ...parent,
      morphs: toggleValue(
        parent.morphs,
        geneId
      ),
    });
  }

  function toggleHet(geneId: string) {
    onChange({
      ...parent,
      hets: toggleValue(
        parent.hets,
        geneId
      ),
    });
  }

  return (
    <section className="genetics-parent-selector">
      <h3>{title}</h3>

      <div className="genetics-selector-group">
        <h4>Visual Morphs</h4>

        <div className="genetics-option-grid">
          {morphOptions.map((morph) => (
            <label
              key={morph.geneId}
              className="genetics-option"
            >
              <input
                type="checkbox"
                checked={parent.morphs.includes(
                  morph.geneId
                )}
                onChange={() =>
                  toggleMorph(morph.geneId)
                }
              />

              <span>
                {morph.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="genetics-selector-group">
        <h4>Het Genetics</h4>

        <div className="genetics-option-grid">
          {hetOptions.map((morph) => (
            <label
              key={morph.geneId}
              className="genetics-option"
            >
              <input
                type="checkbox"
                checked={parent.hets.includes(
                  morph.geneId
                )}
                onChange={() =>
                  toggleHet(morph.geneId)
                }
              />

              <span>
                {morph.name}
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}