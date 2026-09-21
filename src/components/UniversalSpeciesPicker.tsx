import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  findUniversalSpecies,
  searchUniversalSpecies,
} from "../data/species/universalSpeciesRegistry";
import type { UniversalSpeciesRecord } from "../data/species/universalSpeciesTypes";
import "../styles/universal-species-picker.css";

type Props = {
  value?: string;
  onChange: (species: UniversalSpeciesRecord | null) => void;
  label?: string;
  placeholder?: string;
  allowUnknown?: boolean;
};

export default function UniversalSpeciesPicker({
  value = "",
  onChange,
  label = "Species",
  placeholder = "Search common name, scientific name, family…",
  allowUnknown = true,
}: Props) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => (value ? findUniversalSpecies(value) : undefined), [value]);
  const results = useMemo(
    () => (query.trim() ? searchUniversalSpecies(query).slice(0, 8) : []),
    [query],
  );

  function choose(species: UniversalSpeciesRecord) {
    onChange(species);
    setQuery(species.commonNames[0] ?? species.acceptedScientificName);
  }

  function clear() {
    onChange(null);
    setQuery("");
  }

  return (
    <div className="universal-species-picker">
      <label>
        <span>{label}</span>
        <input
          value={query || selected?.commonNames[0] || ""}
          onChange={(event) => {
            setQuery(event.target.value);
            if (selected && event.target.value !== selected.commonNames[0]) onChange(null);
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {selected && !query.trim() && (
        <div className="universal-species-picker__selected">
          <div>
            <strong>{selected.commonNames[0] ?? selected.acceptedScientificName}</strong>
            <small>{selected.acceptedScientificName} · {selected.family}</small>
          </div>
          <div>
            <Link to={`/species/${selected.id}`}>View profile</Link>
            <button type="button" onClick={clear} aria-label="Clear species selection">Clear</button>
          </div>
        </div>
      )}

      {query.trim() && results.length > 0 && (
        <div className="universal-species-picker__results">
          {results.map((species) => (
            <button type="button" key={species.id} onClick={() => choose(species)}>
              <strong>{species.commonNames[0] ?? species.acceptedScientificName}</strong>
              <span>{species.acceptedScientificName} · {species.family} · {species.className}</span>
              <em>{species.care?.status?.replace("-", " ") ?? "care mapping pending"}</em>
            </button>
          ))}
        </div>
      )}

      {query.trim() && !results.length && allowUnknown && (
        <p className="universal-species-picker__unknown">
          No canonical species match. You can continue with an unidentified/awaiting-identification record and send the candidate through Species Incubator.
        </p>
      )}
    </div>
  );
}
