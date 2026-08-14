import { useMemo, useState } from "react";

import type { MorphDefinition } from "../data/morphs";
import { useGrabScroll } from "../hooks/useGrabScroll";

type MultiSelectDropdownProps = {
  title: string;
  options: MorphDefinition[];
  selected: string[];
  setSelected: (values: string[]) => void;
  onMorphResolved?: (morph: MorphDefinition) => void;
};

function canonicalKey(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function MultiSelectDropdown({ title, options, selected, setSelected, onMorphResolved }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const grabScroll = useGrabScroll();

  const morphOptions = useMemo(() => {
    const byGeneId = new Map<string, MorphDefinition>();
    for (const morph of options) {
      if (!morph.geneId) continue;
      if (morph.verification !== "Confirmed" && morph.verification !== "Recognised") continue;
      if (morph.isProject || morph.kind === "Project") continue;

      const key = canonicalKey(morph.geneId);
      if (!key || byGeneId.has(key)) continue;
      byGeneId.set(key, morph);
    }

    return [...byGeneId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [options]);

  const morphByCanonicalValue = useMemo(() => {
    const map = new Map<string, MorphDefinition>();
    for (const morph of morphOptions) {
      map.set(canonicalKey(morph.geneId), morph);
      map.set(canonicalKey(morph.name), morph);
      for (const alias of morph.aliases ?? []) map.set(canonicalKey(alias), morph);
    }
    return map;
  }, [morphOptions]);

  function resolveStoredMorph(value: unknown): MorphDefinition | undefined {
    const key = canonicalKey(value);
    return key ? morphByCanonicalValue.get(key) : undefined;
  }

  const filteredOptions = useMemo(() => {
    const query = canonicalKey(search);
    if (!query) return morphOptions;

    return morphOptions.filter((morph) =>
      [morph.name, morph.geneId, ...(morph.aliases ?? [])]
        .some((value) => canonicalKey(value).includes(query)),
    );
  }, [morphOptions, search]);

  const selectedGeneIds = useMemo(() => {
    const ids = new Set<string>();
    for (const value of selected) {
      const morph = resolveStoredMorph(value);
      if (morph?.geneId) ids.add(morph.geneId);
    }
    return ids;
  }, [selected, morphByCanonicalValue]);

  function isOptionSelected(morph: MorphDefinition): boolean {
    return selectedGeneIds.has(morph.geneId);
  }

  function toggleOption(morph: MorphDefinition) {
    const canonicalId = morph.geneId;
    if (!canonicalId) return;

    if (isOptionSelected(morph)) {
      const next = selected.filter((value) => resolveStoredMorph(value)?.geneId !== canonicalId);
      setSelected(next);
      return;
    }

    // Store the stable gene ID, never the display name. Display names and
    // aliases are presentation/search concerns and must not become state.
    setSelected([...selected.filter((value) => resolveStoredMorph(value)?.geneId !== canonicalId), canonicalId]);
    onMorphResolved?.(morph);
  }

  return (
    <div className="multi-select">
      <button
        type="button"
        className="multi-select-button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{title}</span>
        <span className={`multi-select-arrow ${open ? "open" : ""}`} aria-hidden="true">▼</span>
      </button>

      {selected.length > 0 && (
        <div className="selected-tags" aria-label="Selected morphs">
          {selected.map((item) => {
            const morph = resolveStoredMorph(item);
            return (
              <span key={morph?.geneId ?? item} className="selected-tag">
                {morph?.name ?? item}
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="multi-select-menu" role="listbox" aria-multiselectable="true">
          <input
            type="text"
            className="multi-select-search"
            placeholder="Search morphs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search morphs by name, alias, or gene ID"
            autoComplete="off"
          />

          <div
            ref={grabScroll.ref}
            className="multi-select-options grab-scroll"
            onPointerDown={grabScroll.onPointerDown}
            onPointerMove={grabScroll.onPointerMove}
            onPointerUp={grabScroll.onPointerUp}
            onPointerCancel={grabScroll.onPointerCancel}
            onClickCapture={grabScroll.onClickCapture}
          >
            {filteredOptions.length > 0 ? filteredOptions.map((morph) => {
              const isSelected = isOptionSelected(morph);
              const optionId = `morph-${canonicalKey(morph.geneId).replace(/[^a-z0-9_-]/g, "-")}`;

              return (
                <label key={morph.geneId} htmlFor={optionId} className={`multi-select-option ${isSelected ? "selected" : ""}`}>
                  <input
                    id={optionId}
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOption(morph)}
                  />
                  <span className="multi-select-check" aria-hidden="true">{isSelected ? "✓" : ""}</span>
                  <span className="multi-select-label">{morph.name}</span>
                </label>
              );
            }) : <div className="multi-select-empty">No morphs found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelectDropdown;
