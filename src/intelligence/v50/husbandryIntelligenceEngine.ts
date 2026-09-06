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
  method?: "observed-range" | "robust-history";
  sampleCount?: number;
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

function finiteValues(values: Array<number | undefined>): number[] {
  return values.filter((value): value is number => Number.isFinite(value));
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function robustBounds(values: number[]): [number | undefined, number | undefined] {
  if (!values.length) return [undefined, undefined];
  if (values.length < 4) return [Math.min(...values), Math.max(...values)];
  const centre = median(values);
  if (centre === undefined) return [undefined, undefined];
  const deviations = values.map((value) => Math.abs(value - centre));
  const mad = median(deviations) ?? 0;
  if (mad === 0) return [Math.min(...values), Math.max(...values)];
  const spread = 3 * mad;
  return [Number((centre - spread).toFixed(2)), Number((centre + spread).toFixed(2))];
}

export function analyseMicroclimate(observations: readonly HusbandryObservation[], baseline: HusbandryBaseline): HusbandryFinding[] {
  const findings: HusbandryFinding[] = [];
  const sorted = [...observations].sort((a, b) => toMillis(b.date) - toMillis(a.date));
  for (const observation of sorted) {
    const date = toMillis(observation.date);
    if (observation.temperatureC !== undefined) {
      if (baseline.temperatureMinC !== undefined && observation.temperatureC < baseline.temperatureMinC) {
        findings.push({ type: "anomaly", title: "Temperature below adaptive baseline", detail: `${observation.temperatureC}°C is below the configured historical baseline floor of ${baseline.temperatureMinC}°C. Review the enclosure and probe placement; no health diagnosis is inferred.`, severity: "watch", confidence: baseline.method === "robust-history" ? 0.95 : 0.98, observationDate: date });
      }
      if (baseline.temperatureMaxC !== undefined && observation.temperatureC > baseline.temperatureMaxC) {
        findings.push({ type: "anomaly", title: "Temperature above adaptive baseline", detail: `${observation.temperatureC}°C is above the configured historical baseline ceiling of ${baseline.temperatureMaxC}°C. Review the enclosure and heat-control setup; no health diagnosis is inferred.`, severity: "watch", confidence: baseline.method === "robust-history" ? 0.95 : 0.98, observationDate: date });
      }
    }
    if (observation.humidityPercent !== undefined) {
      if (baseline.humidityMinPercent !== undefined && observation.humidityPercent < baseline.humidityMinPercent) {
        findings.push({ type: "anomaly", title: "Humidity below adaptive baseline", detail: `${observation.humidityPercent}% is below the configured historical baseline floor of ${baseline.humidityMinPercent}%.`, severity: "notice", confidence: baseline.method === "robust-history" ? 0.95 : 0.98, observationDate: date });
      }
      if (baseline.humidityMaxPercent !== undefined && observation.humidityPercent > baseline.humidityMaxPercent) {
        findings.push({ type: "anomaly", title: "Humidity above adaptive baseline", detail: `${observation.humidityPercent}% is above the configured historical baseline ceiling of ${baseline.humidityMaxPercent}%. Check ventilation and measurement conditions before making enclosure changes.`, severity: "notice", confidence: baseline.method === "robust-history" ? 0.95 : 0.98, observationDate: date });
      }
    }
  }

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

export function buildHusbandryBaseline(observations: readonly HusbandryObservation[]): HusbandryBaseline {
  const temperatures = finiteValues(observations.map((item) => item.temperatureC));
  const humidities = finiteValues(observations.map((item) => item.humidityPercent));
  return { temperatureMinC: temperatures.length ? Math.min(...temperatures) : undefined, temperatureMaxC: temperatures.length ? Math.max(...temperatures) : undefined, humidityMinPercent: humidities.length ? Math.min(...humidities) : undefined, humidityMaxPercent: humidities.length ? Math.max(...humidities) : undefined, method: "observed-range", sampleCount: Math.max(temperatures.length, humidities.length) };
}

export function buildAdaptiveHusbandryBaseline(observations: readonly HusbandryObservation[]): HusbandryBaseline {
  const temperatures = finiteValues(observations.map((item) => item.temperatureC));
  const humidities = finiteValues(observations.map((item) => item.humidityPercent));
  const [temperatureMinC, temperatureMaxC] = robustBounds(temperatures);
  const [humidityMinPercent, humidityMaxPercent] = robustBounds(humidities);
  return { temperatureMinC, temperatureMaxC, humidityMinPercent, humidityMaxPercent, method: "robust-history", sampleCount: Math.max(temperatures.length, humidities.length) };
}

export function buildMissingDataFindings(hasEnclosure: boolean, observationCount: number): HusbandryFinding[] {
  if (!hasEnclosure) return [{ type: "missing", title: "No enclosure context", detail: "Enclosure-specific intelligence needs an enclosure record before it can reason about the environment.", severity: "info", confidence: 1 }];
  if (observationCount === 0) return [{ type: "missing", title: "No microclimate observations yet", detail: "Add keeper or sensor observations before Tiny Titans attempts to identify environmental patterns.", severity: "info", confidence: 1 }];
  return [];
}
