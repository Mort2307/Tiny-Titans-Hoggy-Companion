import { useMemo } from "react";

import type { FeedingRecord } from "../types/Feeding";
import type { Snake } from "../types/Snake";
import { getFeedingAdvisor } from "../services/feedingAdvisor";

type FeedingAdvisorCardProps = {
  snake: Snake;
  feedings: FeedingRecord[];
};

export default function FeedingAdvisorCard({ snake, feedings }: FeedingAdvisorCardProps) {
  const result = useMemo(() => getFeedingAdvisor(snake, feedings), [snake, feedings]);

  return (
    <section className="feeding-advisor" aria-labelledby="feeding-advisor-title">
      <div className="feeding-advisor__header">
        <div>
          <p className="feeding-advisor__eyebrow">Individual Feeding Advisor</p>
          <h2 id="feeding-advisor-title">{snake.name}</h2>
        </div>
        <span className={`feeding-advisor__status feeding-advisor__status--${result.status.toLowerCase().replace(/\s+/g, "-")}`}>
          {result.status}
        </span>
      </div>

      <p className="feeding-advisor__confidence">Confidence: <strong>{result.confidence}</strong></p>

      {result.suggestedPreyRangeGrams ? (
        <div className="feeding-advisor__recommendation">
          <div>
            <span>Suggested prey-weight range</span>
            <strong>{result.suggestedPreyRangeGrams.min}–{result.suggestedPreyRangeGrams.max} g</strong>
          </div>
          {result.suggestedIntervalDays && (
            <div>
              <span>Suggested review interval</span>
              <strong>{result.suggestedIntervalDays.min}–{result.suggestedIntervalDays.max} days</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="feeding-advisor__insufficient">
          <strong>Not enough individual data yet.</strong>
          <p>Record at least two successful weighed meals before Tiny Titans produces an individual prey-weight range.</p>
        </div>
      )}

      <div className="feeding-advisor__details">
        <h3>Why?</h3>
        <ul>
          {result.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </div>

      {result.warnings.length > 0 && (
        <div className="feeding-advisor__warnings" role="alert">
          <h3>Review before feeding</h3>
          <ul>
            {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}

      <details className="feeding-advisor__guardrails">
        <summary>Safety guardrails</summary>
        <ul>
          {result.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
        </ul>
      </details>
    </section>
  );
}
