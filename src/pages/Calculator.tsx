import { useMemo, useState } from "react";
import { getGenes, getHetPossibleGenes, type MorphDefinition } from "../data/morphs";
import ParentSelector, { type ParentSelection } from "../components/ParentSelector";
import ResultCard, { type GeneticsResult } from "../components/ResultCard";
import { calculateOffspring } from "../utils/geneticsCalculator";

const EMPTY_PARENT: ParentSelection = { morphs: [], hets: [] };

function toCalculatorParent(parent: ParentSelection) {
  return {
    morphs: parent.morphs,
    hets: parent.hets,
  };
}

function getResultKey(result: GeneticsResult) {
  return [result.name, ...result.visualMorphs.slice().sort(), ...result.hets.slice().sort()].join("|");
}

function combineDuplicateResults(results: GeneticsResult[]): GeneticsResult[] {
  const map = new Map<string, GeneticsResult>();
  for (const result of results) {
    const key = getResultKey(result);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...result, visualMorphs: [...result.visualMorphs], hets: [...result.hets] });
    } else {
      existing.percentage += result.percentage;
    }
  }
  return [...map.values()].sort((a, b) => b.percentage - a.percentage);
}

export default function Calculator() {
  const [mother, setMother] = useState<ParentSelection>(EMPTY_PARENT);
  const [father, setFather] = useState<ParentSelection>(EMPTY_PARENT);
  const genes = useMemo(() => getGenes(), []);
  const hetGenes = useMemo(() => getHetPossibleGenes(), []);

  const results = useMemo(() => {
    const raw = calculateOffspring(toCalculatorParent(mother), toCalculatorParent(father), genes);
    return combineDuplicateResults(raw);
  }, [mother, father, genes]);

  function clearCalculator() {
    setMother({ ...EMPTY_PARENT, morphs: [], hets: [] });
    setFather({ ...EMPTY_PARENT, morphs: [], hets: [] });
  }

  const hasSelection = mother.morphs.length > 0 || mother.hets.length > 0 || father.morphs.length > 0 || father.hets.length > 0;

  return (
    <main className="calculator-page">
      <header className="calculator-header">
        <div>
          <h1>Genetics Calculator</h1>
          <p>Predict possible offspring genetics from two Western Hognose parents.</p>
        </div>
        {hasSelection && <button type="button" onClick={clearCalculator} className="calculator-clear-button">Clear</button>}
      </header>

      <div className="calculator-parents">
        <ParentSelector title="Female / Mother" parent={mother} morphOptions={genes} hetOptions={hetGenes} onChange={setMother} />
        <ParentSelector title="Male / Father" parent={father} morphOptions={genes} hetOptions={hetGenes} onChange={setFather} />
      </div>

      <section className="calculator-results">
        <div className="calculator-results-header">
          <div>
            <h2>Possible Offspring</h2>
            <p>Results are calculated from the selected parental genetics.</p>
          </div>
        </div>

        {!hasSelection && <div className="calculator-empty"><h3>Select both parents</h3><p>Choose visual morphs and known hets above to begin the calculation.</p></div>}

        {hasSelection && results.length === 0 && <div className="calculator-empty"><h3>No confirmed outcomes</h3><p>The selected genetics do not currently produce a confirmed outcome in the verified genetics database.</p></div>}

        {results.length > 0 && (
          <div className="calculator-result-grid">
            {results.map((result, index) => <ResultCard key={`${result.name}-${index}`} result={result} morphs={genes} />)}
          </div>
        )}
      </section>
    </main>
  );
}
