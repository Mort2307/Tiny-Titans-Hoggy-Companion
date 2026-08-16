import type { Het } from "../types/genetics";

export type HetScenario = {
  hets: Het[];
  probability: number;
};

/**
 * Read a het probability without silently upgrading an unrecognised value to
 * 100%. Legacy persisted data has existed in several representations, so we
 * accept numeric percentages, percentage strings, descriptive labels such as
 * "66% Possible Het", and probability fractions such as 0.66.
 */
export function parseHetPercentage(value: unknown): 50 | 66 | 100 {
  if (typeof value === "number") {
    if (value === 50 || value === 66 || value === 100) return value;
    if (value === 0.5) return 50;
    if (value === 0.66) return 66;
    if (value === 1) return 100;
  }

  const text = String(value ?? "").trim();
  if (!text) return 100;

  const direct = Number(text.replace(/%$/, ""));
  if (direct === 50 || direct === 66 || direct === 100) return direct;

  const fraction = Number(text);
  if (fraction === 0.5) return 50;
  if (fraction === 0.66) return 66;
  if (fraction === 1) return 100;

  const match = text.match(/(?:^|\s)(50|66|100)\s*%?/i);
  if (match) {
    const extracted = Number(match[1]);
    if (extracted === 50 || extracted === 66 || extracted === 100) return extracted;
  }

  return 100;
}

/**
 * Expands possible hets into mutually exclusive certain-genetic scenarios.
 * A 66% het means a 66% chance the animal is a confirmed het and a 34%
 * chance it is clear; it is never represented as a fractional gene copy.
 */
export function expandHetScenarios(hets: Het[]): HetScenario[] {
  let scenarios: HetScenario[] = [{ hets: [], probability: 1 }];

  for (const het of hets) {
    const percentage = parseHetPercentage(het.percentage) / 100;
    const next: HetScenario[] = [];

    for (const scenario of scenarios) {
      if (percentage >= 1) {
        next.push({
          hets: [...scenario.hets, { ...het, percentage: 100 }],
          probability: scenario.probability,
        });
        continue;
      }

      next.push({
        hets: [...scenario.hets, { ...het, percentage: 100 }],
        probability: scenario.probability * percentage,
      });

      next.push({
        hets: [...scenario.hets],
        probability: scenario.probability * (1 - percentage),
      });
    }

    scenarios = next.filter((scenario) => scenario.probability > 0.0000001);
  }

  return scenarios;
}
