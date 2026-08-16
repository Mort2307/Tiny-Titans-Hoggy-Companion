import type { Het } from "../types/genetics";

export type HetScenario = {
  hets: Het[];
  probability: number;
};

export function parseHetPercentage(value: Het["percentage"]): 50 | 66 | 100 {
  if (typeof value === "number") {
    return value === 50 || value === 66 || value === 100 ? value : 100;
  }

  const parsed = Number(String(value).trim().replace(/%$/, ""));
  return parsed === 50 || parsed === 66 || parsed === 100 ? parsed : 100;
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
