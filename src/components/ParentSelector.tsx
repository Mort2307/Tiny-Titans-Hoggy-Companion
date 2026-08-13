import { useMemo, useState } from "react";
import type { MorphDefinition } from "../data/morphs";
import { resolveStrictMorph } from "../utils/geneticsIdentity";
import type { Het } from "../types/genetics";
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

function normaliseSnakeHets(value: unknown): Het[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): Het | null => {
      if (typeof entry === "string" && entry.trim()) {
        return { gene: entry.trim(), percentage: 100 } as Het;
      }

      if (!entry || typeof entry !== "object") return null;

      const record = entry as Record<string, unknown>;
      const rawGene = record.gene ?? record.name ?? record.morph;
      if (typeof rawGene !== "string" || !rawGene.trim()) return null;

      const rawPercentage = Number(record.percentage ?? 100);
      const percentage = Number.isFinite(rawPercentage)
        ? Math.min(100, Math.max(0, rawPercentage))
        : 100;

      return {
        gene: rawGene.trim(),
        percentage,
      } as Het;
    })
    .filter((het): het is Het => het !== null);
}

function snakeToSelection(snake: Snake): ParentSelection {
  const rawMorphs = Array.isArray(snake.morphs) ? snake.morphs : [];
  const morphs = rawMorphs
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => canonicalMorph(value)?.geneId ?? value.trim());

  const hets = normaliseSnakeHets(snake.hets).map((het) => ({
    gene: canonicalMorph(het.gene)?.geneId ?? het.gene,
    percentage: het.percentage,
  }));

  return {
    snakeId: snake.id,
    morphs,
    hets,
    customMorph: snake.customMorph || undefined,
    customHets: snake.customHets || undefined,
  };
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  searchPlaceholder,
  hetMode = false,
}: {
  label: string;
  options: MorphDefinition[];
  selected: string[];
  onToggle: (geneId: string) => void;
  selectedLabel?: (geneId: string) => string;
  searchPlaceholder: string;
  hetMode?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      [option.name, ...(option.aliases ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [options, query]);

  return (
    <details className="genetics-dropdown">
      <summary>
        <span>{label}</span>
        <span className="genetics-dropdown-count">
          {selected.length ? `${selected.length} selected` : "Select"}
        </span>
      </summary>

      <div className="genetics-dropdown-panel">
        <input
          className="genetics-dropdown-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
        />

        <div className="genetics-dropdown-options">
          {filtered.map((option) => (
            <label key={option.geneId} className="genetics-dropdown-option">
              <input
                type="checkbox"
                checked={selected.includes(option.geneId)}
                onChange={() => onToggle(option.geneId)}
              />
              <span>
                <strong>{option.name}</strong>
                <small>
                  {hetMode
                    ? `Het ${option.inheritance}`
                    : `${option.kind}${option.inheritance ? ` · ${option.inheritance}` : ""}`}
                </small>
              </span>
            </label>
          ))}

          {!filtered.length && <p className="genetics-dropdown-empty">No matching genetics.</p>}
        </div>
      </div>
    </details>
  );
}

export default function ParentSelector({
  title,
  parent,
  snakes,
  morphOptions,
  hetOptions,
  onChange,
}: ParentSelectorProps) {
  const selectedSnake = snakes.find((snake) => snake.id === parent.snakeId);

  const selectedMorphNames = parent.morphs.map(
    (id) => morphOptions.find((morph) => morph.geneId === id)?.name ?? id
  );

  const selectedHetIds = parent.hets.map((het) =>
    canonicalMorph(het?.gene)?.geneId ?? het?.gene
  ).filter((value): value is string => Boolean(value));

  function toggleMorph(geneId: string) {
    onChange({
      ...parent,
      snakeId: undefined,
      morphs: toggleValue(parent.morphs, geneId),
    });
  }

  function toggleHet(geneId: string) {
    const exists = selectedHetIds.includes(geneId);
    const next = exists
      ? parent.hets.filter((het) => (canonicalMorph(het?.gene)?.geneId ?? het?.gene) !== geneId)
      : [...parent.hets, { gene: geneId, percentage: 100 } as Het];

    onChange({
      ...parent,
      snakeId: undefined,
      hets: next,
    });
  }

  function handleSnakeChange(snakeId: string) {
    if (!snakeId) {
      onChange({ morphs: [], hets: [] });
      return;
    }

    const snake = snakes.find((item) => item.id === snakeId);
    if (snake) onChange(snakeToSelection(snake));
  }

  return (
    <section className="genetics-parent-selector">
      <div className="genetics-parent-heading">
        <div>
          <h3>{title}</h3>
          <p>Choose one of your snakes or build the genetics manually.</p>
        </div>
      </div>

      <div className="genetics-snake-select-wrap">
        <label htmlFor={`${title}-snake-select`}>Saved Snake</label>
        <select
          id={`${title}-snake-select`}
          className="genetics-snake-select"
          value={parent.snakeId ?? ""}
          onChange={(event) => handleSnakeChange(event.target.value)}
        >
          <option value="">Manual genetics</option>
          {snakes.map((snake) => (
            <option key={snake.id} value={snake.id}>
              {snake.name} · {snake.sex} · {snake.morphs.length ? snake.morphs.join(", ") : "Normal"}
            </option>
          ))}
        </select>
      </div>

      {selectedSnake && (
        <div className="genetics-snake-summary">
          <strong>{selectedSnake.name}</strong>
          <span>{selectedSnake.sex}</span>
          <span>{selectedSnake.morphs.length ? selectedSnake.morphs.join(" · ") : "Normal"}</span>
          {selectedSnake.hets.length > 0 && (
            <span>
              {normaliseSnakeHets(selectedSnake.hets).map((het) => `${het.percentage} Het ${het.gene}`).join(" · ")}
            </span>
          )}
        </div>
      )}

      <div className="genetics-selector-group">
        <h4>Visual Morphs & Confirmed Phenotypes</h4>
        <MultiSelectDropdown
          label="Select visual morphs"
          options={morphOptions}
          selected={parent.morphs}
          onToggle={toggleMorph}
          searchPlaceholder="Search confirmed morphs..."
        />
        {selectedMorphNames.length > 0 && (
          <div className="genetics-selected-tags">
            {selectedMorphNames.map((name) => (
              <span key={name} className="genetics-selection-chip genetics-selection-chip-visual">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="genetics-selector-group">
        <h4>Known Hets</h4>
        <MultiSelectDropdown
          label="Select het genetics"
          options={hetOptions}
          selected={selectedHetIds}
          onToggle={toggleHet}
          searchPlaceholder="Search confirmed het-capable genes..."
          hetMode
        />
        {parent.hets.length > 0 && (
          <div className="genetics-selected-tags">
            {parent.hets.map((het) => (
              <span key={`${het.gene}-${het.percentage}`} className="genetics-selection-chip genetics-selection-chip-het">
                {het.percentage} Het {canonicalMorph(het.gene)?.name ?? het.gene}
              </span>
            ))}
          </div>
        )}
      </div>

      {(parent.customMorph || parent.customHets) && (
        <div className="genetics-custom-warning">
          <strong>Unresolved recorded genetics</strong>
          <span>
            {parent.customMorph ? `Custom morph: ${parent.customMorph}. ` : ""}
            {parent.customHets ? `Custom hets: ${parent.customHets}.` : ""}
            These are shown for reference but are not silently treated as confirmed calculator genetics.
          </span>
        </div>
      )}
    </section>
  );
}
