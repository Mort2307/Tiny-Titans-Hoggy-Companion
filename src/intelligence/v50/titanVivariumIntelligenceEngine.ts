import type { AnimalObservation } from "./animalIntelligenceEngine";
import type { TwinComponent, TwinReading } from "./titanDigitalTwinEngine";

export interface VivariumTrendDelta {
  id: string;
  metric: "temperature" | "humidity";
  zone: TwinReading["zone"];
  recentValue: number;
  baselineValue: number;
  delta: number;
  percentDelta?: number;
  direction: "rising" | "falling" | "stable";
  sampleCount: number;
  windowDays: number;
  confidence: number;
}

export interface VivariumAnomalyCluster {
  id: string;
  metric: "temperature" | "humidity" | "mixed";
  zone?: TwinReading["zone"];
  observationCount: number;
  firstObservedAt: number;
  lastObservedAt: number;
  spanHours: number;
  severity: "notice" | "watch" | "urgent";
  explanation: string;
  confidence: number;
}

export interface VivariumChangeContext {
  kind: "enclosure" | "component" | "reading";
  occurredAt: number;
  enclosureId?: string;
  detail: string;
}

export interface VivariumBehaviourContext {
  observationCount: number;
  nearbyObservationCount: number;
  nearbyLabels: readonly string[];
  windowHours: number;
  interpretation: string;
  confidence: number;
}

export interface TitanVivariumIntelligence {
  baselines: {
    temperature?: number;
    humidity?: number;
    sampleCount: number;
    windowDays: number;
  };
  trendDeltas: readonly VivariumTrendDelta[];
  anomalyClusters: readonly VivariumAnomalyCluster[];
  enclosureChanges: readonly VivariumChangeContext[];
  behaviourContext: VivariumBehaviourContext;
  proactivePriority: number;
}

const DAY_MS = 86_400_000;

function finite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function median(values: readonly number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function toMillis(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function direction(delta: number): VivariumTrendDelta["direction"] {
  if (Math.abs(delta) < 0.01) return "stable";
  return delta > 0 ? "rising" : "falling";
}

function baselineFor(values: readonly { timestamp: number; value: number }[]) {
  const now = Date.now();
  const historical = values.filter((item) => now - item.timestamp <= 30 * DAY_MS);
  const usable = historical.length >= 4 ? historical : values;
  return { value: median(usable.map((item) => item.value)), sampleCount: usable.length, windowDays: usable.length ? Math.max(1, Math.round((now - usable.at(-1)!.timestamp) / DAY_MS)) : 0 };
}

function clusterAnomalies(readings: readonly TwinReading[]): VivariumAnomalyCluster[] {
  const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp);
  const clusters: VivariumAnomalyCluster[] = [];
  let current: TwinReading[] = [];

  const flush = () => {
    if (current.length < 2) { current = []; return; }
    const timestamps = current.map((item) => item.timestamp);
    const hasTemperature = current.some((item) => finite(item.temperatureC));
    const hasHumidity = current.some((item) => finite(item.humidityPct));
    const spanHours = (Math.max(...timestamps) - Math.min(...timestamps)) / 3_600_000;
    const severity: VivariumAnomalyCluster["severity"] = current.length >= 6 || spanHours >= 48 ? "urgent" : current.length >= 4 || spanHours >= 12 ? "watch" : "notice";
    clusters.push({
      id: `vivarium-cluster-${Math.min(...timestamps)}-${Math.max(...timestamps)}`,
      metric: hasTemperature && hasHumidity ? "mixed" : hasTemperature ? "temperature" : "humidity",
      zone: new Set(current.map((item) => item.zone)).size === 1 ? current[0].zone : undefined,
      observationCount: current.length,
      firstObservedAt: Math.min(...timestamps),
      lastObservedAt: Math.max(...timestamps),
      spanHours: Number(spanHours.toFixed(1)),
      severity,
      explanation: "Several environmental observations are grouped closely in time. The pattern is presented as a keeper-review signal, not proof that one enclosure variable caused an animal response.",
      confidence: Math.min(0.98, 0.7 + current.length * 0.04),
    });
    current = [];
  };

  for (const reading of sorted) {
    const previous = current.at(-1);
    if (!previous || reading.timestamp - previous.timestamp <= 12 * 3_600_000) current.push(reading);
    else { flush(); current.push(reading); }
  }
  flush();
  return clusters.sort((a, b) => b.lastObservedAt - a.lastObservedAt).slice(-8).reverse();
}

function buildBehaviourContext(readings: readonly TwinReading[], behaviour: readonly AnimalObservation[]): VivariumBehaviourContext {
  if (!behaviour.length || !readings.length) {
    return { observationCount: behaviour.length, nearbyObservationCount: 0, nearbyLabels: [], windowHours: 48, interpretation: "Behaviour context is limited until environmental readings and dated behaviour observations overlap.", confidence: behaviour.length ? 0.6 : 0.35 };
  }
  const latestReadingAt = Math.max(...readings.map((reading) => reading.timestamp));
  const nearby = behaviour.filter((item) => {
    const observedAt = toMillis(item.date);
    return observedAt > 0 && Math.abs(observedAt - latestReadingAt) <= 48 * 3_600_000;
  });
  const labels = [...new Set(nearby.map((item) => (item.label ?? item.category ?? "Behaviour observed").trim()).filter(Boolean))].slice(0, 5);
  return {
    observationCount: behaviour.length,
    nearbyObservationCount: nearby.length,
    nearbyLabels: labels,
    windowHours: 48,
    interpretation: nearby.length ? "Recent behaviour observations overlap the latest environmental window. Tiny Titans can use this as context, but does not infer causation from timing alone." : "No dated behaviour observations overlap the latest environmental window, so no behaviour-environment relationship is asserted.",
    confidence: nearby.length ? Math.min(0.95, 0.68 + nearby.length * 0.06) : 0.58,
  };
}

export function buildTitanVivariumIntelligence(input: {
  readings: readonly TwinReading[];
  components: readonly TwinComponent[];
  behaviour?: readonly AnimalObservation[];
  enclosureChanges?: readonly VivariumChangeContext[];
}): TitanVivariumIntelligence {
  const temperatureByZone = new Map<TwinReading["zone"], { timestamp: number; value: number }[]>();
  const humidityByZone = new Map<TwinReading["zone"], { timestamp: number; value: number }[]>();
  for (const reading of input.readings) {
    if (finite(reading.temperatureC)) temperatureByZone.set(reading.zone, [...(temperatureByZone.get(reading.zone) ?? []), { timestamp: reading.timestamp, value: reading.temperatureC }]);
    if (finite(reading.humidityPct)) humidityByZone.set(reading.zone, [...(humidityByZone.get(reading.zone) ?? []), { timestamp: reading.timestamp, value: reading.humidityPct }]);
  }

  const trends: VivariumTrendDelta[] = [];
  for (const [zone, values] of temperatureByZone) {
    const baseline = baselineFor(values);
    const recent = values.slice().sort((a, b) => a.timestamp - b.timestamp).slice(-3);
    const recentValue = median(recent.map((item) => item.value));
    if (baseline.value !== undefined && recentValue !== undefined) {
      const delta = Number((recentValue - baseline.value).toFixed(2));
      trends.push({ id: `vivarium-temperature-${zone}`, metric: "temperature", zone, recentValue, baselineValue: Number(baseline.value.toFixed(2)), delta, percentDelta: baseline.value ? Number(((delta / baseline.value) * 100).toFixed(1)) : undefined, direction: direction(delta), sampleCount: values.length, windowDays: baseline.windowDays, confidence: Math.min(0.97, 0.6 + Math.min(0.3, values.length * 0.03)), });
    }
  }
  for (const [zone, values] of humidityByZone) {
    const baseline = baselineFor(values);
    const recent = values.slice().sort((a, b) => a.timestamp - b.timestamp).slice(-3);
    const recentValue = median(recent.map((item) => item.value));
    if (baseline.value !== undefined && recentValue !== undefined) {
      const delta = Number((recentValue - baseline.value).toFixed(2));
      trends.push({ id: `vivarium-humidity-${zone}`, metric: "humidity", zone, recentValue, baselineValue: Number(baseline.value.toFixed(2)), delta, percentDelta: baseline.value ? Number(((delta / baseline.value) * 100).toFixed(1)) : undefined, direction: direction(delta), sampleCount: values.length, windowDays: baseline.windowDays, confidence: Math.min(0.97, 0.6 + Math.min(0.3, values.length * 0.03)), });
    }
  }

  const temperatureValues = [...temperatureByZone.values()].flat();
  const humidityValues = [...humidityByZone.values()].flat();
  const tempBaseline = baselineFor(temperatureValues);
  const humidityBaseline = baselineFor(humidityValues);
  const clusters = clusterAnomalies(input.readings);
  const behaviourContext = buildBehaviourContext(input.readings, input.behaviour ?? []);
  const activeComponents = input.components.filter((item) => item.enabled);
  const strongTrendCount = trends.filter((trend) => Math.abs(trend.delta) >= (trend.metric === "temperature" ? 1 : 5)).length;
  const priority = Math.min(96, 20 + clusters.reduce((score, cluster) => score + (cluster.severity === "urgent" ? 28 : cluster.severity === "watch" ? 18 : 8), 0) + strongTrendCount * 10 + (behaviourContext.nearbyObservationCount ? 8 : 0) + (input.enclosureChanges?.length ? 6 : 0));

  return {
    baselines: { temperature: tempBaseline.value, humidity: humidityBaseline.value, sampleCount: Math.max(tempBaseline.sampleCount, humidityBaseline.sampleCount), windowDays: Math.max(tempBaseline.windowDays, humidityBaseline.windowDays) },
    trendDeltas: trends.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    anomalyClusters: clusters,
    enclosureChanges: (input.enclosureChanges ?? []).slice(-10).sort((a, b) => b.occurredAt - a.occurredAt),
    behaviourContext,
    proactivePriority: activeComponents.length ? priority : Math.max(10, priority - 10),
  };
}
