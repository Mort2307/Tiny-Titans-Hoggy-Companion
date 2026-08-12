import type { CalculatorResult } from "../utils/geneticsEngine";

type GeneticsResultSummaryProps = {
  results: CalculatorResult[];
  totalProbability?: number;
};

export default function GeneticsResultSummary({
  results,
  totalProbability,
}: GeneticsResultSummaryProps) {
  const visualResults = results.filter(
    (result) => result.visualMorphs.length > 0
  );

  const hetResults = results.filter(
    (result) =>
      result.hets.length > 0 &&
      result.visualMorphs.length === 0
  );

  const totalPercentage =
    totalProbability !== undefined
      ? totalProbability * 100
      : results.reduce(
          (total, result) => total + result.percentage,
          0
        );

  const roundedTotal =
    Math.round(totalPercentage * 100) / 100;

  const hasResults = results.length > 0;

  return (
    <section className="genetics-result-summary">
      <div className="genetics-result-summary-header">
        <div>
          <span className="genetics-result-summary-eyebrow">
            Genetics analysis
          </span>

          <h2>Cross Summary</h2>

          <p>
            A breakdown of the confirmed genetic outcomes
            produced by the selected parents.
          </p>
        </div>

        {hasResults && (
          <div className="genetics-result-summary-total">
            <strong>{roundedTotal}%</strong>
            <span>calculated probability</span>
          </div>
        )}
      </div>

      {!hasResults && (
        <div className="genetics-result-summary-empty">
          <strong>No calculated outcomes yet</strong>

          <span>
            Select genetics for both parents to generate
            the offspring probability breakdown.
          </span>
        </div>
      )}

      {hasResults && (
        <div className="genetics-result-summary-stats">
          <div className="genetics-summary-stat">
            <strong>{results.length}</strong>
            <span>Possible outcomes</span>
          </div>

          <div className="genetics-summary-stat">
            <strong>{visualResults.length}</strong>
            <span>Visual outcomes</span>
          </div>

          <div className="genetics-summary-stat">
            <strong>{hetResults.length}</strong>
            <span>Het-only outcomes</span>
          </div>
        </div>
      )}

      {hasResults && roundedTotal < 99.99 && (
        <div className="genetics-result-summary-warning">
          <strong>
            Some probability is currently unresolved.
          </strong>

          <span>
            This can happen when the selected genetics contain
            project, unknown or unsupported inheritance data.
            Those outcomes are deliberately not being invented.
          </span>
        </div>
      )}
    </section>
  );
}