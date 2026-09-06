export interface HusbandryObservation {
  date: number | string;
  temperatureC?: number;
  humidityPercent?: number;
  enclosureId?: string;
  source?: "keeper" | "sensor";
}

export interface HusbandryBaseline {
  temperatureMinC?: number;
  temperatureMaxC?: number;
  humidityMinPercent?: number;
  humidityMaxPercent?: number;
}

export interface HusbandryFinding {
  type: "anomaly" | "alert" | "baseline" | "missing";
  title: string;
  detail: string;
  severity: "info" | "notice" | "watch" | "urgent";
  confidence: number;
  observationDate?: number;
}

function toMillis(value: number | string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function analyseMicroclimate(
  observations: readonly HusbandryObservation[],
  baseline: HusbandryBaseline,
): HusbandryFinding[] {
  const findings: HusbandryFinding[] = [];
  for (const observation of observations) {
    const date = toMillis(observation.date);
    if (observation.temperatureC !== undefined) {
      if (baseline.temperatureMinC !== undefined && observation.temperatureC < baseline.temperatureMinC) {
        findings.push({
          type: "anomaly",
          title: "Temperature below recorded baseline",
          detail: `${observation.temperatureC}°C is below the keeper's configured minimum of ${baseline.temperatureMinC}°C. Review the enclosure; no health diagnosis is inferred.`,
          severity: "watch",
          confidence: 0.98,
          observationDate: date,
        });
      }
      if (baseline.temperatureMaxC !== undefined && observation.temperatureC > baseline.temperatureMaxC) {
        findings.push({
          type: "anomaly",
          title: "Temperature above recorded baseline",
          detail: `${observation.temperatureC}°C is above the keeper's configured maximum of ${baseline.temperatureMaxC}°C. Review the enclosure; no health diagnosis is inferred.`,
          severity: "watch",
          confidence: 0.98,
          observationDate: date,
        });
      }
    }
    if (observation.humidityPercent !== undefined) {
      if (baseline.humidityMinPercent !== undefined && observation.humidityPercent < baseline.humidityMinPercent) {
        findings.push({
          type: "anomaly",
          title: "Humidity below recorded baseline",
          detail: `${observation.humidityPercent}% is below the keeper's configured minimum of ${baseline.humidityMinPercent}%.`,
          severity: "notice",
          confidence: 0.98,
          observationDate: date,
        });
      }
      if (baseline.humidityMaxPercent !== undefined && observation.humidityPercent > baseline.humidityMaxPercent) {
        findings.push({
          type: "anomaly",
          title: "Humidity above recorded baseline",
          detail: `${observation.humidityPercent}% is above the keeper's configured maximum of ${baseline.humidityMaxPercent}%.`,
          severity: "notice",
          confidence: 0.98,
          observationDate: date,
        });
      }
    }
  }
  return findings;
}

export function buildHusbandryBaseline(observations: readonly HusbandryObservation[]): HusbandryBaseline {
  const temperatures = observations.map((item) => item.temperatureC).filter((item): item is number => Number.isFinite(item));
  const humidities = observations.map((item) => item.humidityPercent).filter((item): item is number => Number.isFinite(item));
  return {
    temperatureMinC: temperatures.length ? Math.min(...temperatures) : undefined,
    temperatureMaxC: temperatures.length ? Math.max(...temperatures) : undefined,
    humidityMinPercent: humidities.length ? Math.min(...humidities) : undefined,
    humidityMaxPercent: humidities.length ? Math.max(...humidities) : undefined,
  };
}

export function buildMissingDataFindings(hasEnclosure: boolean, observationCount: number): HusbandryFinding[] {
  if (!hasEnclosure) return [{ type: "missing", title: "No enclosure context", detail: "Enclosure-specific intelligence needs an enclosure record before it can reason about the environment.", severity: "info", confidence: 1 }];
  if (observationCount === 0) return [{ type: "missing", title: "No microclimate observations yet", detail: "Add keeper or sensor observations before Tiny Titans attempts to identify environmental patterns.", severity: "info", confidence: 1 }];
  return [];
}
