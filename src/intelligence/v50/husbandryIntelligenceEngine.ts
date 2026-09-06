import type { AnimalTimelineEvent } from "./animalIntelligenceEngine";
import type { HusbandryInsight, HusbandryObservation } from "../../types/husbandry";

function toMillis(value: string | number): number {
  return typeof value === "number" ? value : Date.parse(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildHusbandryIntelligence(observations: HusbandryObservation[], timeline: readonly AnimalTimelineEvent[] = []): HusbandryInsight[] {
  const findings: HusbandryInsight[] = [];
  const sorted = [...observations].sort((a, b) => toMillis(b.date) - toMillis(a.date));
  const latest = sorted[0];

  if (latest && sorted.length >= 4) {
    const recent = sorted.slice(0, 4);
    const temperatureDirection = recent.every((item, index) => {
      const previous = recent[index - 1];
      return index === 0 || item.temperatureC === undefined || previous?.temperatureC === undefined || item.temperatureC <= previous.temperatureC;
    });
    const humidityDirection = recent.every((item, index) => {
      const previous = recent[index - 1];
      return index === 0 || item.humidityPercent === undefined || previous?.humidityPercent === undefined || item.humidityPercent <= previous.humidityPercent;
    });
    if (temperatureDirection && recent.some((item) => item.temperatureC !== undefined)) {
      findings.push({ type: "alert", title: "Recent temperature drift detected", detail: "The last four usable readings move in one direction. Tiny Titans is surfacing the trend so the keeper can check the enclosure before treating it as a problem.", severity: "notice", confidence: 0.82, observationDate: toMillis(latest.date) });
    }
    if (humidityDirection && recent.some((item) => item.humidityPercent !== undefined)) {
      findings.push({ type: "alert", title: "Recent humidity drift detected", detail: "The last four usable readings move in one direction. Check ventilation, substrate moisture and probe placement before changing the enclosure.", severity: "notice", confidence: 0.82, observationDate: toMillis(latest.date) });
    }
  }

  return findings;
}

export function buildHusbandryObservations(events: readonly AnimalTimelineEvent[]): HusbandryObservation[] {
  return events.map((event) => ({ date: event.date, ...(finiteNumber((event as { temperatureC?: unknown }).temperatureC) ? { temperatureC: (event as { temperatureC: number }).temperatureC } : {}), ...(finiteNumber((event as { humidityPercent?: unknown }).humidityPercent) ? { humidityPercent: (event as { humidityPercent: number }).humidityPercent } : {}) }));
}
