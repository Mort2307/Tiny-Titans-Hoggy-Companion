import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { calculateWithHetProbabilities, getGenes } from "../services/geneticsCalculatorService";
import { trackGeneticsCalculation } from "../services/analyticsService";
import { morphDatabase } from "../data/morphDatabase";
import type { GeneticsCalculatorParent, GeneticsCalculatorResult } from "../types/geneticsCalculator";

const EMPTY_PARENT: GeneticsCalculatorParent = { morphs: [], hets: [] };

// Calculator page implementation retained from the current branch.
export default function Calculator() {
  const { user, loading, profileLoading } = useAuth();
  const [mother, setMother] = useState<GeneticsCalculatorParent>({ ...EMPTY_PARENT });
  const [father, setFather] = useState<GeneticsCalculatorParent>({ ...EMPTY_PARENT });

  useEffect(() => {
    let cancelled = false;
    if (!user || loading || profileLoading) return () => { cancelled = true; };
    return () => { cancelled = true; };
  }, [user, loading, profileLoading]);

  const allMorphs = useMemo(() => morphDatabase, []);
  const recognisedVisualOptions = useMemo(() => allMorphs.filter((morph) => morph.verification !== "Unverified" && morph.verification !== "Disputed" && (morph.kind === "Gene" || morph.kind === "Super" || morph.kind === "Combination")), [allMorphs]);
  const hetOptions = useMemo(() => getGenes().filter((morph) => morph.hetPossible === true && morph.verification !== "Unverified" && morph.verification !== "Disputed"), []);
  const result: GeneticsCalculatorResult = useMemo(() => calculateWithHetProbabilities(mother, father), [mother, father]);
  const hasSelection = mother.morphs.length > 0 || mother.hets.length > 0 || father.morphs.length > 0 || father.hets.length > 0;

  useEffect(() => {
    if (!user || !hasSelection || result.offspring.length === 0) return;
    const fingerprint = JSON.stringify({ mother, father, outcomes: result.offspring.map((offspring) => offspring.id) });
    void trackGeneticsCalculation(user.uid, fingerprint).catch((): void => undefined);
  }, [user, mother, father, hasSelection, result.offspring]);

  function clearCalculator() { setMother({ ...EMPTY_PARENT }); setFather({ ...EMPTY_PARENT }); }

  return (
    <main className="calculator-page">
      <h1>Genetics Calculator</h1>
      <p>Select parents and calculate possible offspring outcomes.</p>
      <button type="button" onClick={clearCalculator}>Clear</button>
      <div className="calculator-options" aria-hidden="true">{recognisedVisualOptions.length + hetOptions.length} genetics options available.</div>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </main>
  );
}
