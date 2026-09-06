import type { AnimalObservation } from "./animalIntelligenceEngine";
import type { TwinComponent, TwinReading } from "./titanDigitalTwinEngine";

export interface VivariumTrendDelta { id: string; metric: "temperature" | "humidity"; zone: TwinReading["zone"]; recentValue: number; baselineValue: number; delta: number; percentDelta?: number; direction: "rising" | "falling" | "stable"; sampleCount: number; windowDays: number; confidence: number; }
export interface VivariumAnomalyCluster { id: string; metric: "temperature" | "humidity" | "mixed"; zone?: TwinReading["zone"]; observationCount: number; firstObservedAt: number; lastObservedAt: number; spanHours: number; severity: "notice" | "watch" | "urgent"; explanation: string; confidence: number; }
export interface VivariumChangeContext { kind: "enclosure" | "component" | "reading"; occurredAt: number; enclosureId?: string; detail: string; }
export interface VivariumBehaviourContext { observationCount: number; nearbyObservationCount: number; nearbyLabels: readonly string[]; windowHours: number; interpretation: string; confidence: number; }
export interface TitanVivariumIntelligence { baselines: { temperature?: number; humidity?: number; sampleCount: number; windowDays: number }; trendDeltas: readonly VivariumTrendDelta[]; anomalyClusters: readonly VivariumAnomalyCluster[]; enclosureChanges: readonly VivariumChangeContext[]; behaviourContext: VivariumBehaviourContext; proactivePriority: number; }

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
function finite(value: number | undefined): value is number { return typeof value === "number" && Number.isFinite(value); }
function median(values: readonly number[]): number | undefined { if (!values.length) return undefined; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
function toMillis(value: number | string | undefined): number { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string") { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : 0; } return 0; }
function direction(delta: number): VivariumTrendDelta["direction"] { return Math.abs(delta) < 0.01 ? "stable" : delta > 0 ? "rising" : "falling"; }
function metricBaseline(values: readonly { timestamp: number; value: number }[]) {
  const ordered = [...values].sort((a, b) => a.timestamp - b.timestamp);
  const historical = ordered.length > 6 ? ordered.slice(0, -3) : ordered;
  const recent = ordered.slice(-3);
  const value = median(historical.map((item) => item.value));
  const latest = recent.length ? median(recent.map((item) => item.value)) : undefined;
  return { value, latest, sampleCount: historical.length, recentCount: recent.length, windowDays: historical.length > 1 ? Math.max(1, Math.round((historical.at(-1)!.timestamp - historical[0].timestamp) / DAY_MS)) : 0 };
}
function deviationLimit(values: readonly number[], metric: "temperature" | "humidity"): number {
  const centre = median(values) ?? 0;
  const deviations = values.map((value) => Math.abs(value - centre));
  const mad = median(deviations) ?? 0;
  const floor = metric === "temperature" ? 1 : 5;
  return Math.max(floor, mad * 3);
}
function clusterAnomalies(readings: readonly TwinReading[], baselines: Map<string, { temperature?: number; humidity?: number; tempLimit?: number; humidityLimit?: number }>): VivariumAnomalyCluster[] {
  const flagged = readings.filter((reading) => {
    const zone = baselines.get(reading.zone);
    const tempFlag = finite(reading.temperatureC) && zone?.temperature !== undefined && zone?.tempLimit !== undefined && Math.abs(reading.temperatureC - zone.temperature) >= zone.tempLimit;
    const humidityFlag = finite(reading.humidityPct) && zone?.humidity !== undefined && zone?.humidityLimit !== undefined && Math.abs(reading.humidityPct - zone.humidity) >= zone.humidityLimit;
    return tempFlag || humidityFlag;
  }).sort((a, b) => a.timestamp - b.timestamp);
  const clusters: VivariumAnomalyCluster[] = [];
  let current: TwinReading[] = [];
  const flush = () => {
    if (current.length < 2) { current = []; return; }
    const timestamps = current.map((item) => item.timestamp);
    const metric: VivariumAnomalyCluster["metric"] = current.some((item) => finite(item.temperatureC)) && current.some((item) => finite(item.humidityPct)) ? "mixed" : current.some((item) => finite(item.temperatureC)) ? "temperature" : "humidity";
    const spanHours = (Math.max(...timestamps) - Math.min(...timestamps)) / HOUR_MS;
    const severity: VivariumAnomalyCluster["severity"] = current.length >= 6 || spanHours >= 48 ? "urgent" : current.length >= 4 || spanHours >= 12 ? "watch" : "notice";
    clusters.push({ id: `vivarium-cluster-${Math.min(...timestamps)}-${Math.max(...timestamps)}`, metric, zone: new Set(current.map((item) => item.zone)).size === 1 ? current[0].zone : undefined, observationCount: current.length, firstObservedAt: Math.min(...timestamps), lastObservedAt: Math.max(...timestamps), spanHours: Number(spanHours.toFixed(1)), severity, explanation: "Multiple environmental readings independently fall outside the keeper's historical baseline in a connected time window. This is a review signal, not proof of cause or a medical finding.", confidence: Math.min(0.98, 0.72 + current.length * 0.04) });
    current = [];
  };
  for (const reading of flagged) { const previous = current.at(-1); if (!previous || reading.timestamp - previous.timestamp <= 12 * HOUR_MS) current.push(reading); else { flush(); current.push(reading); } }
  flush();
  return clusters.sort((a, b) => b.lastObservedAt - a.lastObservedAt).slice(0, 8);
}
function buildBehaviourContext(readings: readonly TwinReading[], behaviour: readonly AnimalObservation[]): VivariumBehaviourContext {
  if (!behaviour.length || !readings.length) return { observationCount: behaviour.length, nearbyObservationCount: 0, nearbyLabels: [], windowHours: 48, interpretation: "Behaviour context is limited until environmental readings and dated behaviour observations overlap.", confidence: behaviour.length ? 0.6 : 0.35 };
  const latestReadingAt = Math.max(...readings.map((reading) => reading.timestamp));
  const nearby = behaviour.filter((item) => { const date = toMillis(item.date); return date > 0 && Math.abs(date - latestReadingAt) <= 48 * HOUR_MS; });
  const labels = [...new Set(nearby.map((item) => (item.label ?? item.category ?? "Behaviour observed").trim()).filter(Boolean))].slice(0, 5);
  return { observationCount: behaviour.length, nearbyObservationCount: nearby.length, nearbyLabels: labels, windowHours: 48, interpretation: nearby.length ? "Recent behaviour observations overlap the latest environmental window. Tiny Titans uses this as context and does not infer causation from timing alone." : "No dated behaviour observations overlap the latest environmental window, so no behaviour-environment relationship is asserted.", confidence: nearby.length ? Math.min(0.95, 0.68 + nearby.length * 0.06) : 0.58 };
}

export function buildTitanVivariumIntelligence(input: { readings: readonly TwinReading[]; components: readonly TwinComponent[]; behaviour?: readonly AnimalObservation[]; enclosureChanges?: readonly VivariumChangeContext[] }): TitanVivariumIntelligence {
  const temperatureByZone = new Map<TwinReading["zone"], { timestamp: number; value: number }[]>();
  const humidityByZone = new Map<TwinReading["zone"], { timestamp: number; value: number }[]>();
  for (const reading of input.readings) {
    if (finite(reading.temperatureC)) temperatureByZone.set(reading.zone, [...(temperatureByZone.get(reading.zone) ?? []), { timestamp: reading.timestamp, value: reading.temperatureC }]);
    if (finite(reading.humidityPct)) humidityByZone.set(reading.zone, [...(humidityByZone.get(reading.zone) ?? []), { timestamp: reading.timestamp, value: reading.humidityPct }]);
  }
  const baselinesByZone = new Map<string, { temperature?: number; humidity?: number; tempLimit?: number; humidityLimit?: number }>();
  for (const zone of new Set([...temperatureByZone.keys(), ...humidityByZone.keys()])) {
    const temps = temperatureByZone.get(zone) ?? [];
    const humidities = humidityByZone.get(zone) ?? [];
    const temperatureBaseline = metricBaseline(temps);
    const humidityBaseline = metricBaseline(humidities);
    baselinesByZone.set(zone, { temperature: temperatureBaseline.value, humidity: humidityBaseline.value, tempLimit: deviationLimit(temperatureBaseline.value === undefined ? [] : temps.map((item) => item.value), "temperature"), humidityLimit: deviationLimit(humidityBaseline.value === undefined ? [] : humidities.map((item) => item.value), "humidity") });
  }
  const trends: VivariumTrendDelta[] = [];
  for (const [zone, values] of temperatureByZone) { const baseline = metricBaseline(values); if (baseline.value !== undefined && baseline.latest !== undefined) { const delta = Number((baseline.latest - baseline.value).toFixed(2)); trends.push({ id: `vivarium-temperature-${zone}`, metric: "temperature", zone, recentValue: baseline.latest, baselineValue: Number(baseline.value.toFixed(2)), delta, percentDelta: baseline.value ? Number(((delta / baseline.value) * 100).toFixed(1)) : undefined, direction: direction(delta), sampleCount: values.length, windowDays: baseline.windowDays, confidence: Math.min(0.97, 0.62 + Math.min(0.28, values.length * 0.028)) }); } }
  for (const [zone, values] of humidityByZone) { const baseline = metricBaseline(values); if (baseline.value !== undefined && baseline.latest !== undefined) { const delta = Number((baseline.latest - baseline.value).toFixed(2)); trends.push({ id: `vivarium-humidity-${zone}`, metric: "humidity", zone, recentValue: baseline.latest, baselineValue: Number(baseline.value.toFixed(2)), delta, percentDelta: baseline.value ? Number(((delta / baseline.value) * 100).toFixed(1)) : undefined, direction: direction(delta), sampleCount: values.length, windowDays: baseline.windowDays, confidence: Math.min(0.97, 0.62 + Math.min(0.28, values.length * 0.028)) }); } }
  const allTemp = [...temperatureByZone.values()].flat();
  const allHumidity = [...humidityByZone.values()].flat();
  const tempBaseline = metricBaseline(allTemp);
  const humidityBaseline = metricBaseline(allHumidity);
  const clusters = clusterAnomalies(input.readings, baselinesByZone);
  const behaviourContext = buildBehaviourContext(input.readings, input.behaviour ?? []);
  const strongTrends = trends.filter((trend) => Math.abs(trend.delta) >= (trend.metric === "temperature" ? 1 : 5)).length;
  const priority = Math.min(96, 18 + clusters.reduce((score, cluster) => score + (cluster.severity === "urgent" ? 30 : cluster.severity === "watch" ? 18 : 8), 0) + strongTrends * 10 + (behaviourContext.nearbyObservationCount ? 8 : 0) + Math.min(12, (input.enclosureChanges?.length ?? 0) * 3));
  return { baselines: { temperature: tempBaseline.value, humidity: humidityBaseline.value, sampleCount: Math.max(tempBaseline.sampleCount, humidityBaseline.sampleCount), windowDays: Math.max(tempBaseline.windowDays, humidityBaseline.windowDays) }, trendDeltas: trends.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)), anomalyClusters: clusters, enclosureChanges: (input.enclosureChanges ?? []).slice().sort((a, b) => b.occurredAt - a.occurredAt).slice(0, 10), behaviourContext, proactivePriority: input.components.some((item) => item.enabled) ? priority : Math.max(10, priority - 10) };
}
