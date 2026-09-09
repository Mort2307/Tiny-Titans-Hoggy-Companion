import { useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_SNAKE_SPECIES } from "../data/species/speciesRegistry";
import { buildSnakeSpeciesTaxonomy } from "../data/species/speciesTaxonomy";
import { rankSearchResults } from "../utils/searchRanking";
import "../styles/species-selector.css";

type SpeciesSelectorProps = {
  id: string;
  value: string;
  onChange: (speciesId: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

const taxonomy = buildSnakeSpeciesTaxonomy(INITIAL_SNAKE_SPECIES);
const sortedSpecies = taxonomy.flatMap((group) => group.genera.flatMap((genus) => genus.species));

type SelectedPath = {
  groupLabel: string;
  genusLabel: string;
  speciesLabel: string;
};

function getSelectedPath(value: string): SelectedPath | undefined {
  for (const group of taxonomy) {
    for (const genus of group.genera) {
      const species = genus.species.find((candidate) => candidate.id === value);
      if (species) {
        return {
          groupLabel: group.label,
          genusLabel: genus.label,
          speciesLabel: species.commonNames[0] ?? species.acceptedScientificName,
        };
      }
    }
  }
  return undefined;
}

export default function SpeciesSelector({
  id,
  value,
  onChange,
  label = "Species",
  className,
  disabled = false,
}: SpeciesSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedGenera, setExpandedGenera] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSpecies = sortedSpecies.find((species) => species.id === value);
  const selectedPath = useMemo(() => getSelectedPath(value), [value]);
  const selectedName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "Select species…";

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return rankSearchResults(query, sortedSpecies, (species) => ({
      canonical: [species.commonNames[0] ?? "", species.acceptedScientificName, species.id],
      aliases: [...species.searchAliases, ...species.commonNames.slice(1), ...(species.synonyms ?? [])],
      secondary: [species.genus, species.speciesEpithet, species.family],
    })).map(({ item }) => item);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (selectedPath) {
      const group = taxonomy.find((candidate) => candidate.label === selectedPath.groupLabel);
      const genus = group?.genera.find((candidate) => candidate.label === selectedPath.genusLabel);
      if (group) setExpandedGroups((current) => new Set(current).add(group.id));
      if (genus) setExpandedGenera((current) => new Set(current).add(genus.id));
    }
  }, [open, selectedPath]);

  function selectSpecies(speciesId: string) {
    onChange(speciesId);
    setQuery("");
    setOpen(false);
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggleGenus(genusId: string) {
    setExpandedGenera((current) => {
      const next = new Set(current);
      if (next.has(genusId)) next.delete(genusId);
      else next.add(genusId);
      return next;
    });
  }

  return (
    <label ref={rootRef} className={`tt-species-selector ${className ?? ""}`.trim()} htmlFor={`${id}-search`}>
      <span className="tt-species-selector__label">{label}</span>
      <div className="tt-species-selector__control">
        <button
          id={id}
          type="button"
          className="tt-species-selector__trigger"
          aria-haspopup="tree"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <span>
            <strong>{selectedName}</strong>
            {selectedSpecies?.acceptedScientificName && <small>{selectedSpecies.acceptedScientificName}</small>}
          </span>
          <span className="tt-species-selector__chevron" aria-hidden="true">⌄</span>
        </button>

        {open && (
          <div className="tt-species-selector__menu">
            <input
              ref={inputRef}
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search common name, scientific name or alias…"
              autoComplete="off"
              spellCheck={false}
              aria-label={`Search ${label}`}
            />

            {query.trim() ? (
              <div className="tt-species-selector__options" role="listbox" aria-label={`${label} search results`}>
                {searchResults.length > 0 ? searchResults.map((species) => (
                  <button
                    key={species.id}
                    type="button"
                    role="option"
                    aria-selected={species.id === value}
                    className={species.id === value ? "is-selected" : ""}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSpecies(species.id)}
                  >
                    <strong>{species.commonNames[0] ?? species.acceptedScientificName}</strong>
                    <small>{species.acceptedScientificName} · {species.genus}</small>
                  </button>
                )) : (
                  <p className="tt-species-selector__empty">No species match “{query}”. Try a common name, scientific name or alias.</p>
                )}
              </div>
            ) : (
              <div className="tt-species-selector__tree" role="tree" aria-label={`${label} taxonomy`}>
                {taxonomy.map((group) => {
                  const groupOpen = expandedGroups.has(group.id);
                  return (
                    <div key={group.id} className="tt-species-selector__group" role="treeitem" aria-expanded={groupOpen}>
                      <button
                        type="button"
                        className="tt-species-selector__group-toggle"
                        aria-expanded={groupOpen}
                        onClick={() => toggleGroup(group.id)}
                      >
                        <span className="tt-species-selector__disclosure" aria-hidden="true">{groupOpen ? "▾" : "▸"}</span>
                        <span>
                          <strong>{group.label}</strong>
                          <small>{group.scientificLabel}</small>
                        </span>
                        <em>{group.genera.reduce((total, genus) => total + genus.species.length, 0)}</em>
                      </button>

                      {groupOpen && (
                        <div className="tt-species-selector__children" role="group">
                          {group.genera.map((genus) => {
                            const genusOpen = expandedGenera.has(genus.id);
                            return (
                              <div key={genus.id} className="tt-species-selector__genus" role="treeitem" aria-expanded={genusOpen}>
                                <button
                                  type="button"
                                  className="tt-species-selector__genus-toggle"
                                  aria-expanded={genusOpen}
                                  onClick={() => toggleGenus(genus.id)}
                                >
                                  <span className="tt-species-selector__disclosure" aria-hidden="true">{genusOpen ? "▾" : "▸"}</span>
                                  <span>
                                    <strong>{genus.label}</strong>
                                    <small>{genus.scientificLabel}</small>
                                  </span>
                                  <em>{genus.species.length}</em>
                                </button>

                                {genusOpen && (
                                  <div className="tt-species-selector__species" role="group">
                                    {genus.species.map((species) => (
                                      <button
                                        key={species.id}
                                        type="button"
                                        role="treeitem"
                                        aria-selected={species.id === value}
                                        className={`tt-species-selector__species-option ${species.id === value ? "is-selected" : ""}`}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => selectSpecies(species.id)}
                                      >
                                        <span>
                                          <strong>{species.commonNames[0] ?? species.acceptedScientificName}</strong>
                                          <small>{species.acceptedScientificName}</small>
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </label>
  );
}
