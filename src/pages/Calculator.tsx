import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getGenes, morphs as morphDatabase } from "../data/morphs";
import ParentSelector, { snakeToSelection, type ParentSelection } from "../components/ParentSelector";
import ResultCard from "../components/ResultCard";
import MorphReversalPanel from "../components/MorphReversalPanel";
import type { Snake } from "../types/Snake";
import type { GeneticsCalculatorResult } from "../types/genetics";
import { calculateGenetics } from "../utils/geneticsCalculator";
import { getUserSnakes } from "../services/snakeService";
import { recordGeneticsCalculation } from "../services/geneticsTrackingService";
import { useAuth } from "../context/useAuth";
import "../styles/calculator.css";

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

export default function Calculator() {
  const { user, loading, profileLoading } = useAuth();
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

  useEffect(() => {
    setMode(requestedMode);
  }, [requestedMode]);

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
    return () => {
      cancelled = true;
    };
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (snakesLoading || !snakes.length || preloadedPairing || (!requestedMaleId && !requestedFemaleId)) return;
    const male = requestedMaleId ? snakes.find((snake) => snake.id === requestedMaleId) : undefined;
    const female = requestedFemaleId ? snakes.find((snake) => snake.id === requestedFemaleId) : undefined;
    if (male || female) {
      if (female) setMother(snakeToSelection(female));
      if (male) setFather(snakeToSelection(male));
      setPreloadedPairing(true);
    }
  }, [snakes, snakesLoading, requestedMaleId, requestedFemaleId, preloadedPairing]);

  const effectiveSnakesLoading = loading || profileLoading || (Boolean(user) && snakesLoading);
  const effectiveSnakes = user ? snakes : [];
  const allMorphs = useMemo(() => morphDatabase, []);

  const recognisedVisualOptions = useMemo(
    () => uniqueMorphOptions(allMorphs.filter((morph) => morph.verification !== "Unverified" && morph.verification !== "Disputed" && (morph.kind === "Gene" || morph.kind === "Super" || morph.kind === "Combination"))),
    [allMorphs],
  );

  const hetOptions = useMemo(
    () => uniqueMorphOptions(getGenes().filter((morph) => morph.hetPossible === true && morph.verification !== "Unverified" && morph.verification !== "Disputed")),
    [],
  );

  const result: GeneticsCalculatorResult = useMemo(
    () => calculateGenetics({ female: { morphs: mother.morphs, hets: mother.hets.map((het) => het.gene) }, male: { morphs: father.morphs, hets: father.hets.map((het) => het.gene) } }),
    [mother, father],
  );

  const hasSelection = mother.morphs.length > 0 || mother.hets.length > 0 || father.morphs.length > 0 || father.hets.length > 0;

  useEffect(() => {
    if (!user || !hasSelection || result.offspring.length === 0 || mode !== "pairing") return;
    const trackingPayload = { femaleMorphs: [...mother.morphs].sort(), femaleHets: mother.hets.map((het) => het.gene).sort(), maleMorphs: [...father.morphs].sort(), maleHets: father.hets.map((het) => het.gene).sort(), outcomeCount: result.offspring.length, unresolved: result.hasUnresolvedGenetics };
    const trackingKey = `${TRACKING_STORAGE_PREFIX}${user.uid}:${JSON.stringify(trackingPayload)}`;
    if (sessionStorage.getItem(trackingKey) === "1") return;
    const timer = window.setTimeout(() => {
      void recordGeneticsCalculation({ uid: user.uid, femaleMorphIds: mother.morphs, femaleHetGenes: mother.hets.map((het) => het.gene), maleMorphIds: father.morphs, maleHetGenes: father.hets.map((het) => het.gene), outcomeCount: result.offspring.length, unresolved: result.hasUnresolvedGenetics })
        .then(() => sessionStorage.setItem(trackingKey, "1"))
        .catch((error) => console.warn("Tiny Titans: genetics calculation tracking failed", error));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [user, hasSelection, mother, father, result, mode]);

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
          <span className="calculator-kicker">TINY TITANS · BREEDING LAB</span>
          <h1>Genetics Calculator</h1>
          <p>Calculate pairings forward, or reverse a recognised morph backwards into its genetic construction.</p>
        </div>
        {mode === "pairing" && hasSelection && (
          <button type="button" onClick={clearCalculator} className="calculator-clear-button">Clear pairing</button>
        )}
      </header>

      <div className="calculator-mode-switch" role="tablist" aria-label="Genetics calculator mode">
        <button type="button" role="tab" aria-selected={mode === "pairing"} className={`calculator-mode-tab ${mode === "pairing" ? "active" : ""}`} onClick={() => switchMode("pairing")}>
          <span>🧬</span>
          <span><strong>Pairing Calculator</strong><small>Parents → offspring</small></span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "reversal"} className={`calculator-mode-tab ${mode === "reversal" ? "active" : ""}`} onClick={() => switchMode("reversal")}>
          <span>↩️</span>
          <span><strong>Morph Reversal</strong><small>Combo → construction</small></span>
        </button>
      </div>

      {mode === "pairing" ? (
        <>
          <div className="calculator-info-strip">
            <span>🧬 Recognised genetics only</span>
            <span>🐍 Saved snakes loaded from your account</span>
            <span>📊 Multi-gene outcomes calculated by the genetics engine</span>
            <span>🧪 Sandbox keeps experiments separate</span>
          </div>

          {preloadedPairing && <div className="calculator-note" role="status">🧬 Pairing loaded from Breeding Planner — both parents and their recorded genetics have been pre-filled. You can still fine-tune either parent before calculating.</div>}
          {snakesError && <div className="calculator-error">{snakesError}</div>}
          {effectiveSnakesLoading && <div className="calculator-loading">Loading your logged snakes and their genetics…</div>}
          {!effectiveSnakesLoading && effectiveSnakes.length === 0 && <div className="calculator-note">No saved snakes were found. You can still build both parents manually from the recognised database.</div>}

          <div className="calculator-parents">
            <ParentSelector title="Female / Mother" parent={mother} snakes={effectiveSnakes} morphOptions={recognisedVisualOptions} hetOptions={hetOptions} onChange={setMother} />
            <ParentSelector title="Male / Father" parent={father} snakes={effectiveSnakes} morphOptions={recognisedVisualOptions} hetOptions={hetOptions} onChange={setFather} />
          </div>

          <section className="calculator-results">
            <div className="calculator-results-header">
              <div>
                <span className="calculator-kicker">OFFSPRING PREDICTION</span>
                <h2>Possible Offspring</h2>
                <p>{hasSelection ? `${result.offspring.length} genetic outcome${result.offspring.length === 1 ? "" : "s"} calculated.` : "Select both parents to calculate the pairing."}</p>
              </div>
              {hasSelection && <strong className="calculator-probability-total">100%</strong>}
            </div>

            {!hasSelection && <div className="calculator-empty"><div className="calculator-empty-icon">🧬</div><h3>Build your pairing</h3><p>Pick one of your snakes, then fine-tune its genetics with the dropdowns, or create both parents entirely manually.</p></div>}
            {hasSelection && result.offspring.length === 0 && <div className="calculator-empty"><h3>No calculable recognised outcome</h3><p>The selected data does not currently resolve into a breeding calculation.</p></div>}
            {result.offspring.length > 0 && <div className="calculator-result-grid">{result.offspring.map((offspring) => <ResultCard key={offspring.id} result={offspring} morphs={allMorphs} />)}</div>}
            {result.hasUnresolvedGenetics && <div className="calculator-note calculator-note-warning">Some recorded genetics could not be resolved confidently and were not silently treated as confirmed.</div>}
          </section>
        </>
      ) : (
        <MorphReversalPanel morphs={allMorphs} />
      )}
    </main>
  );
}
