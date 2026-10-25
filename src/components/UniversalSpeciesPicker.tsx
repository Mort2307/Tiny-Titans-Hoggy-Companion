import { useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { findUniversalSpecies, searchUniversalSpecies, UNIVERSAL_SPECIES_GROUPS } from "../data/species/universalSpeciesRegistry";
import type { UniversalSpeciesClass, UniversalSpeciesRecord } from "../data/species/universalSpeciesTypes";
import "../styles/universal-species-picker.css";
import { KEEPER_COMPANION_TERMINOLOGY } from "../config/keeperTerminology";

type Props = {
  value?: string;
  onChange: (species: UniversalSpeciesRecord | null) => void;
  label?: string;
  placeholder?: string;
  allowUnknown?: boolean;
};
// Short initial list prevents a species search from occupying the entire phone screen.
const PAGE_SIZE = 8;

export default function UniversalSpeciesPicker({
  value = "",
  onChange,
  label = KEEPER_COMPANION_TERMINOLOGY.speciesQuestion,
  placeholder = KEEPER_COMPANION_TERMINOLOGY.speciesSearchPlaceholder,
  allowUnknown = true,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [animalClass, setAnimalClass] = useState<UniversalSpeciesClass | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = useMemo(() => (value ? findUniversalSpecies(value) : undefined), [value]);
  const results = useMemo(() => {
    const matching = searchUniversalSpecies(query).filter((item) => animalClass === "all" || item.className === animalClass);
    return query.trim() ? matching : [...matching].sort((a, b) =>
      (a.commonNames[0] ?? a.acceptedScientificName).localeCompare(b.commonNames[0] ?? b.acceptedScientificName));
  }, [query, animalClass]);
  const shown = results.slice(0, visibleCount);
  const expanded = open;

  function choose(species: UniversalSpeciesRecord) {
    onChange(species);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }
  function clear() {
    onChange(null);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }
  function updateQuery(next: string) {
    setQuery(next);
    setOpen(true);
    setVisibleCount(PAGE_SIZE);
    setActiveIndex(-1);
    if (selected && next !== selected.commonNames[0]) onChange(null);
  }
  function changeClass(next: UniversalSpeciesClass | "all") {
    setAnimalClass(next);
    setVisibleCount(PAGE_SIZE);
    setActiveIndex(-1);
    setOpen(true);
  }
  return (
    <div className="universal-species-picker">
      <div className="universal-species-picker__intro">
        <span>{label}</span>
        <small>{KEEPER_COMPANION_TERMINOLOGY.speciesHelp}</small>
      </div>
      <div className="universal-species-picker__search">
        <label htmlFor={listId + "-input"}>Search or browse the Tiny Titans species catalogue</label>
        <div className="universal-species-picker__combobox">
          <input
            ref={inputRef}
            id={listId + "-input"}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId + "-list"}
            aria-activedescendant={expanded && activeIndex >= 0 ? listId + "-item-" + activeIndex : undefined}
            value={query || (!open ? selected?.commonNames[0] : "") || ""}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); return; }
              if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((i) => Math.min(i + 1, shown.length - 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
              if (event.key === "Enter" && open && shown.length) {
                event.preventDefault();
                choose(shown[Math.max(activeIndex, 0)]);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="universal-species-picker__toggle" aria-label={expanded ? "Close species dropdown" : "Browse species dropdown"} aria-expanded={expanded} aria-controls={listId + "-list"} onClick={() => { setOpen(!open); setActiveIndex(-1); }}>
            <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
          </button>
        </div>
      </div>
      {selected && (
        <div className="universal-species-picker__selected">
          <div><strong>{selected.commonNames[0] ?? selected.acceptedScientificName}</strong><small>{selected.acceptedScientificName} · {selected.family}</small></div>
          <div><Link to={`/species/${selected.id}`}>View profile</Link><button type="button" onClick={clear} aria-label="Clear species selection">Clear</button></div>
        </div>
      )}
      {expanded && (
        <div className="universal-species-picker__dropdown">
          <label className="universal-species-picker__class">Browse by animal group
            <select value={animalClass} onChange={(event) => changeClass(event.target.value as UniversalSpeciesClass | "all")}>
              <option value="all">All animal groups</option>
              {UNIVERSAL_SPECIES_GROUPS.map((group) => <option key={group.id} value={group.className}>{group.label} ({group.count})</option>)}
            </select>
          </label>
          <p className="universal-species-picker__count" role="status">{results.length} matching species · Showing {shown.length}</p>
          <div className="universal-species-picker__results" id={listId + "-list"} role="listbox" aria-label="Choose a species">
            {shown.map((species, index) => (
              <button id={listId + "-item-" + index} role="option" aria-selected={activeIndex === index} type="button" key={species.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(species)}>
                <strong className="universal-species-picker__name">{species.commonNames[0] ?? species.acceptedScientificName}</strong>
                <span className="universal-species-picker__meta"><b className="universal-species-picker__group">{species.browseGroup.replaceAll("-", " ")}</b> · {species.acceptedScientificName} · {species.family}</span>
              </button>
            ))}
            {results.length === 0 && <p className="universal-species-picker__unknown">No catalogue matches in this group. Try another group or name.</p>}
          </div>
          {shown.length < results.length && <button type="button" className="universal-species-picker__more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Show more species ({results.length - shown.length} remaining)</button>}
          <button type="button" className="universal-species-picker__close" onClick={() => setOpen(false)}>Close species list</button>
        </div>
      )}
      {query.trim() && !results.length && allowUnknown && (
        <p className="universal-species-picker__unknown">No confirmed species matched. You can leave this animal awaiting identification, or browse another group.</p>
      )}
    </div>
  );
}
