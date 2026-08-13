import { useMemo, useState } from "react";
import { getGenes, getHetPossibleGenes } from "../data/morphs";
import ParentSelector, { type ParentSelection } from "../components/ParentSelector";
import ResultCard from "../components/ResultCard";
import { calculateGenetics } from "../utils/geneticsCalculator";
import type { ParentGenetics } from "../types/genetics";

const EMPTY_PARENT: ParentSelection = { morphs: [], hets: [] };

function toCalculatorParent(parent: ParentSelection): ParentGenetics {
  return { morphs: parent.morphs, hets: parent.hets };
}

export default function Calculator() {
  const [mother, setMother] = useState<ParentSelection>(EMPTY_PARENT);
  const [father, setFather] = useState<ParentSelection>(EMPTY_PARENT);
  const genes = useMemo(() => getGenes(), []);
  const hetGenes = useMemo(() => getHetPossibleGenes(), []);

  const calculation = useMemo(
    () => calculateGenetics({ female: toCalculatorParent(mother), male: toCalculatorParent(father) }),
    [mother, father]
  );

  function clearCalculator() {
    setMother({ morphs: [], hets: [] });
    setFather({ morphs: [], hets: [] });
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
            <p>Results are calculated from the verified genetics database.</p>
          </div>
        </div>

        {!hasSelection && <div className="calculator-empty"><h3>Select both parents</h3><p>Choose visual morphs and known hets above to begin the calculation.</p></div>}

        {hasSelection && calculation.offspring.length === 0 && <div className="calculator-empty"><h3>No calculated outcomes</h3><p>The selected genetics produced no calculable outcome.</p></div>}

        {hasSelection && calculation.hasUnresolvedGenetics && <div className="calculator-warning" role="status"><strong>Some outcomes could not be verified.</strong><span>Unverified or unsupported genetics are never labelled as confirmed.</span></div>}

        {calculation.offspring.length > 0 && (
          <div className="calculator-result-grid">
            {calculation.offspring.map((result) => <ResultCard key={result.id} result={result} morphs={genes} />)}
          </div>
        )}
      </section>
    </main>
  );
}
