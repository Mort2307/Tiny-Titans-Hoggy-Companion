import { useEffect, useMemo, useState } from "react";
import { getGenes, morphs as morphDatabase } from "../data/morphs";
import ParentSelector, { type ParentSelection } from "../components/ParentSelector";
import ResultCard from "../components/ResultCard";
import type { Het, Snake } from "../types/Snake";
import type { GeneticsCalculatorResult, OffspringResult } from "../types/genetics";
import { calculateGenetics } from "../utils/geneticsCalculator";
import { getUserSnakes } from "../services/snakeService";
import { trackGeneticsCalculation } from "../services/analyticsEventService";
import { useAuth } from "../context/AuthContext";
import "../styles/calculator.css";

type CalculatorScenario = {
  parent: ParentSelection;
  probability: number;
};

const EMPTY_PARENT: ParentSelection = { morphs: [], hets: [] };

function hetPercentage(value: Het["percentage"]): number {
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/%$/, ""));
  return parsed === 50 || parsed === 66 || parsed === 100 ? parsed : 100;
}

/**
 * A possible het is a probability that the animal actually carries one copy,
 * not a fractional copy of a gene. We therefore expand the parent into
 * carrier/non-carrier scenarios and let the normal Mendelian engine calculate
 * each certain scenario. This preserves 50%, 66% and 100% hets correctly
 * without weakening the existing genetics engine's copy-count model.
 */
function expandHetScenarios(parent: ParentSelection): CalculatorScenario[] {
  let scenarios: CalculatorScenario[] = [{ parent: { ...parent, hets: [] }, probability: 1 }];

  for (const het of parent.hets) {
    const percentage = hetPercentage(het.percentage) / 100;
    const next: CalculatorScenario[] = [];

    for (const scenario of scenarios) {
      if (percentage >= 1) {
        next.push({
          parent: { ...scenario.parent, hets: [...scenario.parent.hets, { ...het, percentage: 100 }] },
          probability: scenario.probability,
        });
        continue;
      }

      if (percentage > 0) {
        next.push({
          parent: { ...scenario.parent, hets: [...scenario.parent.hets, { ...het, percentage: 100 }] },
          probability: scenario.probability * percentage,
        });
      }

      if (percentage < 1) {
        next.push({
          parent: { ...scenario.parent },
          probability: scenario.probability * (1 - percentage),
        });
      }
    }

    scenarios = next;
  }

  return scenarios;
}

function calculateWithHetProbabilities(mother: ParentSelection, father: ParentSelection): GeneticsCalculatorResult {
  const motherScenarios = expandHetScenarios(mother);
  const fatherScenarios = expandHetScenarios(father);
  const merged = new Map<string, OffspringResult>();
  let hasUnresolvedGenetics = false;

  for (const motherScenario of motherScenarios) {
    for (const fatherScenario of fatherScenarios) {
      const scenarioProbability = motherScenario.probability * fatherScenario.probability;
      if (scenarioProbability <= 0) continue;

      const result = calculateGenetics({
        female: {
          morphs: motherScenario.parent.morphs,
          hets: motherScenario.parent.hets.map((het) => het.gene),
        },
        male: {
          morphs: fatherScenario.parent.morphs,
          hets: fatherScenario.parent.hets.map((het) => het.gene),
        },
      });

      hasUnresolvedGenetics = hasUnresolvedGenetics || result.hasUnresolvedGenetics;

      for (const outcome of result.offspring) {
        const weightedPercentage = outcome.percentage * scenarioProbability;
        const existing = merged.get(outcome.id);
        if (existing) {
          existing.percentage += weightedPercentage;
        } else {
          merged.set(outcome.id, { ...outcome, percentage: weightedPercentage });
        }
      }
    }
  }

  const offspring = Array.from(merged.values())
    .filter((outcome) => outcome.percentage > 0.000001)
    .sort((a, b) => b.percentage - a.percentage);

  return {
    input: {
      female: { morphs: mother.morphs, hets: mother.hets.map((het) => het.gene) },
      male: { morphs: father.morphs, hets: father.hets.map((het) => het.gene) },
    },
    offspring,
    hasUnresolvedGenetics,
  };
}

export default function Calculator() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [snakesLoading, setSnakesLoading] = useState(true);
  const [snakesError, setSnakesError] = useState<string | null>(null);
  const [mother, setMother] = useState<ParentSelection>(EMPTY_PARENT);
  const [father, setFather] = useState<ParentSelection>(EMPTY_PARENT);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) { setSnakes([]); setSnakesLoading(false); return; }
    let cancelled = false;
    setSnakesLoading(true); setSnakesError(null);
    void getUserSnakes(user.uid)
      .then((loaded) => { if (!cancelled) setSnakes(loaded); })
      .catch((error: unknown) => { if (!cancelled) setSnakesError(error instanceof Error ? error.message : "Unable to load your snakes."); })
      .finally(() => { if (!cancelled) setSnakesLoading(false); });
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
    void trackGeneticsCalculation(user.uid, fingerprint).catch(() => undefined);
  }, [user, mother, father, hasSelection, result.offspring]);

  function clearCalculator() { setMother({ ...EMPTY_PARENT }); setFather({ ...EMPTY_PARENT }); }

  return (
    <main className="calculator-page">
      <header className="calculator-header"><div><span className="calculator-kicker">TINY TITANS · BREEDING LAB</span><h1>Genetics Calculator</h1><p>Choose your actual hoggies or build a pairing manually from the recognised genetics database.</p></div>{hasSelection && <button type="button" onClick={clearCalculator} className="calculator-clear-button">Clear pairing</button>}</header>
      <div className="calculator-info-strip"><span>🧬 Recognised genetics only</span><span>🐍 Saved snakes loaded from your account</span><span>📊 Multi-gene outcomes calculated by the genetics engine</span></div>
      {snakesError && <div className="calculator-error">{snakesError}</div>}
      {snakesLoading && <div className="calculator-loading">Loading your logged snakes and their genetics…</div>}
      {!snakesLoading && snakes.length === 0 && <div className="calculator-note">No saved snakes were found. You can still build both parents manually from the recognised database.</div>}
      <div className="calculator-parents"><ParentSelector title="Female / Mother" parent={mother} snakes={snakes} morphOptions={recognisedVisualOptions} hetOptions={hetOptions} onChange={setMother} /><ParentSelector title="Male / Father" parent={father} snakes={snakes} morphOptions={recognisedVisualOptions} hetOptions={hetOptions} onChange={setFather} /></div>
      <section className="calculator-results"><div className="calculator-results-header"><div><span className="calculator-kicker">OFFSPRING PREDICTION</span><h2>Possible Offspring</h2><p>{hasSelection ? `${result.offspring.length} genetic outcome${result.offspring.length === 1 ? "" : "s"} calculated.` : "Select both parents to calculate the pairing."}</p></div>{hasSelection && <strong className="calculator-probability-total">100%</strong>}</div>
        {!hasSelection && <div className="calculator-empty"><div className="calculator-empty-icon">🧬</div><h3>Build your pairing</h3><p>Pick one of your snakes, then fine-tune its genetics with the dropdowns, or create both parents entirely manually.</p></div>}
        {hasSelection && result.offspring.length === 0 && <div className="calculator-empty"><h3>No calculable recognised outcome</h3><p>The selected data does not currently resolve into a breeding calculation.</p></div>}
        {result.offspring.length > 0 && <div className="calculator-result-grid">{result.offspring.map((offspring) => <ResultCard key={offspring.id} result={offspring} morphs={allMorphs} />)}</div>}
        {result.hasUnresolvedGenetics && <div className="calculator-note calculator-note-warning">Some recorded genetics could not be resolved confidently and were not silently treated as confirmed.</div>}
      </section>
    </main>
  );
}
