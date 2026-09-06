import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpeciesContext } from "../../context/SpeciesContext";
import { explainGeneticsSearch, searchGeneticsIntelligence, type GeneticsSearchResult } from "../../intelligence/v50/geneticsSearchIntelligence";

function componentLabel(result: GeneticsSearchResult): string {
  return result.canonicalComponents.join(" × ");
}

function matchLabel(result: GeneticsSearchResult): string {
  if (result.matchKind === "alias") return "Recorded alias";
  if (result.matchKind === "fuzzy") return "Possible name match";
  if (result.matchKind === "combination") return "Recognised combination";
  return "Canonical record";
}

export default function GeneticsIntelligentSearch() {
  const navigate = useNavigate();
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const [query, setQuery] = useState("");
  const speciesScientificName = selectedSpecies?.acceptedScientificName;
  const speciesName = selectedSpecies?.commonNames[0] ?? speciesScientificName ?? "selected species";

  const results = useMemo(
    () => query.trim() ? searchGeneticsIntelligence(query, speciesScientificName) : [],
    [query, speciesScientificName],
  );
  const primary = results[0];
  const explanation = useMemo(
    () => query.trim() ? explainGeneticsSearch(query, speciesScientificName) : "Type a morph, gene, alias or recognised combination. Tiny Titans resolves the term inside the active species boundary.",
    [query, speciesScientificName],
  );

  function openResult(result: GeneticsSearchResult) {
    navigate(`/morph-library/${encodeURIComponent(result.geneId)}`);
  }

  return (
    <section className="tracker-card genetics-intelligent-search" aria-labelledby="genetics-intelligent-search-title">
      <div className="morph-library__eyebrow">🧬 TITAN GENETICS RESOLVER</div>
      <div>
        <h2 id="genetics-intelligent-search-title">Search genetics like a keeper</h2>
        <p>Ask for the name you know. Tiny Titans checks the active species catalogue for canonical names, recorded aliases and recognised combinations.</p>
      </div>

      <label className="morph-library__search" htmlFor="genetics-intelligent-search-input">
        <span>Search {speciesName} genetics</span>
        <input
          id="genetics-intelligent-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “Arctic Conda”, “Grey Fog” or a gene…"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="morph-library__source-strip is-ready">
        <strong>{selectedSpeciesId ? `Species scope: ${speciesName}` : "Species scope not selected"}</strong>
        <span>{speciesScientificName ?? "Select a species before treating a genetics result as species-specific."}</span>
      </div>

      {query.trim() && primary ? (
        <div className="genetics-intelligent-search__result" aria-live="polite">
          <div className="morph-detail__badges">
            <span>{matchLabel(primary)}</span>
            <span>{primary.verification}</span>
            <span>{primary.confidence} confidence</span>
          </div>
          <h3>
            {primary.matchedName} {primary.commonCombinationName && primary.commonCombinationName !== primary.matchedName ? `(recognised as ${primary.commonCombinationName})` : ""}
          </h3>
          {primary.matchedType === "Combination" || primary.canonicalComponents.length > 0 ? (
            <p><strong>Genetic composition:</strong> {componentLabel(primary)}</p>
          ) : null}
          <p>{primary.description}</p>
          <p><strong>Why it matched:</strong> {explanation}</p>
          <p className="morph-detail__source-note">{primary.evidenceSummary}</p>
          <button type="button" className="morph-card__open" onClick={() => openResult(primary)}>
            Open {primary.canonicalName} record →
          </button>

          {results.length > 1 && (
            <div className="genetics-intelligent-search__alternatives">
              <strong>Other close species-scoped matches</strong>
              <div className="morph-library__filters">
                {results.slice(1, 4).map((result) => (
                  <button key={`${result.geneId}-${result.score}`} type="button" onClick={() => openResult(result)}>
                    {result.matchedName} · {result.matchKind ?? "match"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : query.trim() ? (
        <div className="genetics-intelligent-search__empty" aria-live="polite">
          <strong>No species-scoped genetics record matched “{query.trim()}”.</strong>
          <p>Tiny Titans has intentionally not substituted another species' genetics. Try a canonical term, recorded alias, or contribute the missing species-specific evidence for review.</p>
        </div>
      ) : null}
    </section>
  );
}
