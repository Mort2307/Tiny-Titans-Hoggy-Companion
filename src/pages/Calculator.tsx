import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";
import { getSpeciesCalculatorMorphs, getSpeciesGeneticsStatus, getSpeciesHetGenes } from "../data/species/speciesGenetics";
import ParentSelector, { snakeToSelection, type ParentSelection } from "../components/ParentSelector";
import ResultCard from "../components/ResultCard";
import MorphReversalPanel from "../components/MorphReversalPanel";
import type { Snake } from "../types/Snake";
import type { GeneticsCalculatorResult, ParentGenetics } from "../types/genetics";
import { calculateGenetics } from "../utils/geneticsCalculator";
import { getUserSnakes } from "../services/snakeService";
import { recordGeneticsCalculation } from "../services/geneticsTrackingService";
import { useAuth } from "../context/useAuth";
import { useSpeciesContext } from "../context/SpeciesContext";
import "../styles/calculator.css";
import "../components/MorphReversalTheme.css";

const EMPTY_PARENT: ParentSelection = { morphs: [], hets: [] };
const TRACKING_STORAGE_PREFIX = "tiny-titans-genetics-tracked:";
type CalculatorMode = "pairing" | "reversal";

function uniqueMorphOptions<T extends { geneId: string; name: string }>(options: T[]): T[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return options.filter((option) => {
    const id = option.geneId.trim().toLowerCase();
    const name = option.name.trim().toLowerCase().replace(/\s+/g, " ");
    if (seenIds.has(id) || seenNames.has(name)) return false;
    seenIds.add(id);
    seenNames.add(name);
    return true;
  });
}

function toParentGenetics(selection: ParentSelection): ParentGenetics {
  const hetPercentages = Object.fromEntries(selection.hets.map((het) => [het.gene, het.percentage]));
  return {
    morphs: [...selection.morphs],
    hets: selection.hets.map((het) => het.gene),
    hetPercentages,
  };
}

export default function Calculator() {
  const { user, loading, profileLoading } = useAuth();
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode") === "reversal" ? "reversal" : "pairing";
  const [mode, setMode] = useState<CalculatorMode>(requestedMode);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [snakesLoading, setSnakesLoading] = useState(true);
  const [snakesError, setSnakesError] = useState<string | null>(null);
  const [mother, setMother] = useState<ParentSelection>(EMPTY_PARENT);
  const [father, setFather] = useState<ParentSelection>(EMPTY_PARENT);
  const [preloadedPairing, setPreloadedPairing] = useState(false);
  const requestedMaleId = searchParams.get("male");
  const requestedFemaleId = searchParams.get("female");
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "selected species";
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const geneticsEnabled = geneticsStatus === "mapped";

  useEffect(() => setMode(requestedMode), [requestedMode]);
  useEffect(() => {
    setMother({ ...EMPTY_PARENT });
    setFather({ ...EMPTY_PARENT });
    setPreloadedPairing(false);
  }, [selectedSpeciesId]);

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let cancelled = false;
    void getUserSnakes(user.uid)
      .then((loaded) => {
        if (!cancelled) {
          setSnakes(loaded);
          setSnakesError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setSnakesError(error instanceof Error ? error.message : "Unable to load your snakes.");
      })
      .finally(() => {
        if (!cancelled) setSnakesLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, loading, profileLoading]);

  const speciesSnakes = useMemo(() => snakes.filter((snake) => {
    const value = snake.species.trim().toLowerCase();
    return value === selectedSpeciesId.toLowerCase()
      || (selectedSpecies?.commonNames.some((name) => value === name.trim().toLowerCase()) ?? false)
      || value === (selectedSpecies?.acceptedScientificName ?? "").toLowerCase();
  }), [snakes, selectedSpeciesId, selectedSpecies]);

  useEffect(() => {
    if (snakesLoading || !speciesSnakes.length || preloadedPairing || (!requestedMaleId && !requestedFemaleId) || !geneticsEnabled) return;
    const male = requestedMaleId ? speciesSnakes.find((snake) => snake.id === requestedMaleId && snake.sex === "Male") : undefined;
    const female = requestedFemaleId ? speciesSnakes.find((snake) => snake.id === requestedFemaleId && snake.sex === "Female") : undefined;
    if (male || female) {
      if (female) setMother(snakeToSelection(female));
      if (male) setFather(snakeToSelection(male));
      setPreloadedPairing(true);
    }
  }, [speciesSnakes, snakesLoading, requestedMaleId, requestedFemaleId, preloadedPairing, geneticsEnabled]);

  const effectiveSnakesLoading = loading || profileLoading || (Boolean(user) && snakesLoading);
  const effectiveSnakes = user ? speciesSnakes : [];
  const allMorphs = useMemo(() => {
    const recognised = getSpeciesCalculatorMorphs(selectedSpeciesId);
    const namedCombinations = geneticsEnabled ? calculatorNamedCombinations : [];
    const seen = new Set<string>();
    return [...recognised, ...namedCombinations].filter((morph) => {
      const key = `${morph.geneId.toLowerCase()}:${morph.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedSpeciesId, geneticsEnabled]);

  const recognisedVisualOptions = useMemo(() => uniqueMorphOptions(getSpeciesCalculatorMorphs(selectedSpeciesId)), [selectedSpeciesId]);
  const hetOptions = useMemo(() => uniqueMorphOptions(getSpeciesHetGenes(selectedSpeciesId)), [selectedSpeciesId]);
  const femaleGenetics = useMemo(() => toParentGenetics(mother), [mother]);
  const maleGenetics = useMemo(() => toParentGenetics(father), [father]);
  const result: GeneticsCalculatorResult = useMemo(() => {
    if (!geneticsEnabled) return { input: { female: femaleGenetics, male: maleGenetics }, offspring: [], hasUnresolvedGenetics: false };
    return calculateGenetics({ female: femaleGenetics, male: maleGenetics });
  }, [femaleGenetics, maleGenetics, geneticsEnabled]);
  const hasSelection = geneticsEnabled && (mother.morphs.length > 0 || mother.hets.length > 0 || father.morphs.length > 0 || father.hets.length > 0);

  useEffect(() => {
    if (!user || !hasSelection || result.offspring.length === 0 || mode !== "pairing") return;
    const trackingPayload = { speciesId: selectedSpeciesId, femaleMorphs: [...mother.morphs].sort(), femaleHets: mother.hets.map((het) => het.gene).sort(), maleMorphs: [...father.morphs].sort(), maleHets: father.hets.map((het) => het.gene).sort(), outcomeCount: result.offspring.length, unresolved: result.hasUnresolvedGenetics };
    const trackingKey = `${TRACKING_STORAGE_PREFIX}${user.uid}:${JSON.stringify(trackingPayload)}`;
    if (sessionStorage.getItem(trackingKey) === "1") return;
    const timer = window.setTimeout(() => {
      void recordGeneticsCalculation({ uid: user.uid, femaleMorphIds: mother.morphs, femaleHetGenes: mother.hets.map((het) => het.gene), maleMorphIds: father.morphs, maleHetGenes: father.hets.map((het) => het.gene), outcomeCount: result.offspring.length, unresolved: result.hasUnresolvedGenetics })
        .then(() => sessionStorage.setItem(trackingKey, "1"))
        .catch((error) => console.warn("Tiny Titans: genetics calculation tracking failed", error));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [user, hasSelection, mother, father, result, mode, selectedSpeciesId]);

  function clearCalculator() {
    setMother({ ...EMPTY_PARENT });
    setFather({ ...EMPTY_PARENT });
    setPreloadedPairing(false);
  }
  function switchMode(nextMode: CalculatorMode) {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams);
    if (nextMode === "reversal") params.set("mode", "reversal");
    else params.delete("mode");
    setSearchParams(params, { replace: true });
  }

  return (
    <main className="calculator-page">
      <div className="calculator-navigation">
        <Link to="/breeding" className="calculator-back-button">← Back to Breeding Planner</Link>
        <Link to="/sandbox" className="calculator-back-button">🧪 Open Safe Sandbox</Link>
      </div>
      <header className="calculator-header">
        <div>
          <span className="calculator-kicker">TINY TITANS · BREEDING LAB · {speciesName.toUpperCase()}</span>
          <h1>Genetics Calculator</h1>
          <p>Calculate pairings forward, or reverse a recognised morph backwards into its species-specific genetic construction.</p>
        </div>
        {mode === "pairing" && hasSelection && <button type="button" onClick={clearCalculator} className="calculator-clear-button">Clear pairing</button>}
      </header>
      <div className="calculator-mode-switch" role="tablist" aria-label="Genetics calculator mode">
        <button type="button" role="tab" aria-selected={mode === "pairing"} className={`calculator-mode-tab ${mode === "pairing" ? "active" : ""}`} onClick={() => switchMode("pairing")}>
          <span>🧬</span><span><strong>Pairing Calculator</strong><small>Parents → offspring</small></span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "reversal"} className={`calculator-mode-tab ${mode === "reversal" ? "active" : ""}`} onClick={() => switchMode("reversal")}>
          <span>↩️</span><span><strong>Morph Reversal</strong><small>Combo → construction</small></span>
        </button>
      </div>

      {!geneticsEnabled ? (
        <section className="calculator-note calculator-note-warning">
          <strong>{geneticsStatus === "partial" ? `🧬 Genetics for ${speciesName} is partially catalogued.` : `🧬 Genetics for ${speciesName} is not mapped yet.`}</strong>
          <p>{geneticsStatus === "partial"
            ? "Tiny Titans has species-specific genetics entries here, but the catalogue and inheritance engine are not yet complete enough to make predictive breeding claims. The calculator remains locked rather than substituting Hognose genetics."
            : "Tiny Titans will not show Western Hognose genes or run a cross-species calculation here. The genetics catalogue must be separately sourced and reviewed for each species before it is enabled."}</p>
          <Link to="/morph-library">Open the species Morph Library →</Link>
        </section>
      ) : mode === "pairing" ? (
        <>
          <div className="calculator-info-strip">
            <span>🧬 {speciesName} genetics only</span><span>🐍 Saved snakes filtered to the selected species</span><span>📊 Multi-gene outcomes calculated by the verified species engine</span><span>🧪 Sandbox keeps experiments separate</span>
          </div>
          {preloadedPairing && <div className="calculator-note" role="status">🧬 Pairing loaded from Breeding Planner — both parents and their recorded genetics have been pre-filled. You can still fine-tune either parent before calculating.</div>}
          {snakesError && <div className="calculator-error">{snakesError}</div>}
          {effectiveSnakesLoading && <div className="calculator-loading">Loading your logged {speciesName} snakes and their genetics…</div>}
          {!effectiveSnakesLoading && effectiveSnakes.length === 0 && <div className="calculator-note">No saved {speciesName} snakes were found. You can still build both parents manually from the species-specific database.</div>}
          <div className="calculator-parents">
            <ParentSelector title={`Female / Mother · ${speciesName}`} sex="Female" parent={mother} snakes={effectiveSnakes} morphOptions={recognisedVisualOptions} hetOptions={hetOptions} onChange={setMother} />
            <ParentSelector title={`Male / Father · ${speciesName}`} sex="Male" parent={father} snakes={effectiveSnakes} morphOptions={recognisedVisualOptions} hetOptions={hetOptions} onChange={setFather} />
          </div>
          <section className="calculator-results">
            <div className="calculator-results-header"><div><span className="calculator-kicker">OFFSPRING PREDICTION · {speciesName.toUpperCase()}</span><h2>Possible Offspring</h2><p>{hasSelection ? `${result.offspring.length} genetic outcome${result.offspring.length === 1 ? "" : "s"} calculated.` : "Select both parents to calculate the pairing."}</p></div>{hasSelection && <strong className="calculator-probability-total">100%</strong>}</div>
            {!hasSelection && <div className="calculator-empty"><div className="calculator-empty-icon">🧬</div><h3>Build your pairing</h3><p>Pick a saved female and male independently, then fine-tune their genetics manually.</p></div>}
            {hasSelection && result.offspring.length === 0 && <div className="calculator-empty"><h3>No calculable recognised outcome</h3><p>The selected data does not currently resolve into a breeding calculation.</p></div>}
            {result.offspring.length > 0 && <div className="calculator-result-grid">{result.offspring.map((offspring) => <ResultCard key={offspring.id} result={offspring} morphs={allMorphs} />)}</div>}
            {result.hasUnresolvedGenetics && <div className="calculator-note calculator-note-warning">Some recorded genetics could not be resolved confidently and were not silently treated as confirmed.</div>}
          </section>
        </>
      ) : (
        <div className="calculator-reversal-stage">
          <div className="calculator-reversal-hero"><div><span className="calculator-kicker">REVERSE GENETICS LAB · {speciesName.toUpperCase()}</span><h2>Break a morph back down.</h2><p>Enter a recognised combo, Super form, or multi-gene phenotype and inspect exactly what the current species genetics library says it contains.</p></div><span className="morph-reversal-lab-badge">↩ Morph Reversal</span></div>
          <MorphReversalPanel morphs={allMorphs} />
        </div>
      )}
    </main>
  );
}
