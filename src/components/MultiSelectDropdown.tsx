import {
  useMemo,
  useState,
} from "react";

import type {
  MorphDefinition,
} from "../data/morphs";
import { useGrabScroll } from "../hooks/useGrabScroll";

type MultiSelectDropdownProps = {
  title: string;
  options: MorphDefinition[];
  selected: string[];
  setSelected: (values: string[]) => void;
  onMorphResolved?: (morph: MorphDefinition) => void;
};

function MultiSelectDropdown({
  title,
  options,
  selected,
  setSelected,
  onMorphResolved,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const grabScroll = useGrabScroll();

  const morphOptions = useMemo(() => {
    return [...options]
      .filter((morph) => {
        if (!morph.geneId) return false;
        if (morph.verification !== "Confirmed" && morph.verification !== "Recognised") return false;
        return !morph.isProject && morph.kind !== "Project";
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [options]);

  const morphByCanonicalValue = useMemo(() => {
    const map = new Map<string, MorphDefinition>();
    for (const morph of morphOptions) {
      map.set(morph.geneId.trim().toLowerCase(), morph);
      map.set(morph.name.trim().toLowerCase(), morph);
    }
    return map;
  }, [morphOptions]);

  function resolveStoredMorph(value: string): MorphDefinition | undefined {
    return morphByCanonicalValue.get(value.trim().toLowerCase());
  }

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return morphOptions;
    return morphOptions.filter((morph) => {
      const nameMatches = morph.name.toLowerCase().includes(query);
      const aliasMatches = morph.aliases?.some((alias) => alias.toLowerCase().includes(query)) ?? false;
      return nameMatches || aliasMatches;
    });
  }, [morphOptions, search]);

  const selectedGeneIds = useMemo(() => {
    const ids = new Set<string>();
    for (const value of selected) {
      const morph = resolveStoredMorph(value);
      if (morph) ids.add(morph.geneId);
    }
    return ids;
  }, [selected, morphByCanonicalValue]);

  function isOptionSelected(morph: MorphDefinition): boolean {
    return selectedGeneIds.has(morph.geneId);
  }

  function toggleOption(morph: MorphDefinition) {
    if (isOptionSelected(morph)) {
      setSelected(selected.filter((value) => {
        const selectedMorph = resolveStoredMorph(value);
        if (!selectedMorph) return true;
        return selectedMorph.geneId !== morph.geneId;
      }));
      return;
    }

    if (selected.some((value) => resolveStoredMorph(value)?.geneId === morph.geneId)) return;
    setSelected([...selected, morph.name]);
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
        <div className="selected-tags">
          {selected.map((item) => {
            const morph = resolveStoredMorph(item);
            return <span key={morph?.geneId ?? item} className="selected-tag">{morph?.name ?? item}</span>;
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
            aria-label="Search morphs"
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
              return (
                <label key={morph.geneId} className={`multi-select-option ${isSelected ? "selected" : ""}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleOption(morph)} />
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
