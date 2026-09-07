import { useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_SNAKE_SPECIES } from "../data/species/speciesRegistry";
import { rankSearchResults } from "../utils/searchRanking";
import "../styles/species-selector.css";

const sortedSpecies = [...INITIAL_SNAKE_SPECIES].sort((a, b) => {
  const aName = a.commonNames[0] ?? a.acceptedScientificName;
  const bName = b.commonNames[0] ?? b.acceptedScientificName;
  return aName.localeCompare(bName);
});

type SpeciesSelectorProps = {
  id: string;
  value: string;
  onChange: (speciesId: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

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
  const rootRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSpecies = sortedSpecies.find((species) => species.id === value);
  const selectedName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "Select species…";

  const options = useMemo(() => {
    if (!query.trim()) return sortedSpecies;
    return rankSearchResults(query, sortedSpecies, (species) => ({
      canonical: [species.commonNames[0] ?? "", species.acceptedScientificName, species.id],
      aliases: [...species.searchAliases, ...species.commonNames.slice(1), ...(species.synonyms ?? [])],
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
    if (!open) setQuery("");
  }, [open]);

  function selectSpecies(speciesId: string) {
    onChange(speciesId);
    setQuery("");
    setOpen(false);
  }

  return (
    <label ref={rootRef} className={`tt-species-selector ${className ?? ""}`.trim()} htmlFor={`${id}-search`}>
      <span className="tt-species-selector__label">{label}</span>
      <div className="tt-species-selector__control">
        <button
          id={id}
          type="button"
          className="tt-species-selector__trigger"
          aria-haspopup="listbox"
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
          <div className="tt-species-selector__menu" role="listbox" aria-label={`${label} options`}>
            <input
              ref={inputRef}
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a common name, scientific name or alias…"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="tt-species-selector__options">
              {options.length > 0 ? options.map((species) => (
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
                  <small>{species.acceptedScientificName}</small>
                </button>
              )) : (
                <p className="tt-species-selector__empty">No species match “{query}”. Try a common name, scientific name or alias.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
