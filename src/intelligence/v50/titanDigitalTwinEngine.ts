export type TwinComponentKind = "enclosure" | "heat" | "uvb" | "light" | "humidity" | "substrate" | "plant" | "cleanup" | "enrichment" | "monitor";

export interface TwinComponent {
  id: string;
  kind: TwinComponentKind;
  label: string;
  enabled: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface TwinReading {
  id: string;
  timestamp: number;
  zone: "warm" | "cool" | "basking" | "ambient" | "humidity" | "other";
  temperatureC?: number;
  humidityPct?: number;
  source: "manual" | "sensor" | "import";
}

export interface TwinPlant {
  id: string;
  name: string;
  status: "thriving" | "stable" | "struggling" | "unknown";
  lastObservedAt?: number;
  notes?: string;
}

export interface TwinInput {
  components: readonly TwinComponent[];
  readings: readonly TwinReading[];
  plants?: readonly TwinPlant[];
}

export interface TwinFinding {
  id: string;
  severity: "info" | "watch" | "urgent";
  title: string;
  explanation: string;
  confidence: number;
}

export interface TwinOptimisation {
  id: string;
  title: string;
  reason: string;
  priority: number;
}

export interface TitanDigitalTwin {
  componentCount: number;
  activeComponentCount: number;
  readingCount: number;
  plantCount: number;
  zoneCoverage: string[];
  findings: TwinFinding[];
  optimisations: TwinOptimisation[];
  health: "sparse" | "developing" | "observed";
  note: string;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const median = (values: number[]) => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function buildTitanDigitalTwin(input: TwinInput): TitanDigitalTwin {
  const activeComponents = input.components.filter((item) => item.enabled);
  const zones = [...new Set(input.readings.map((reading) => reading.zone))];
  const findings: TwinFinding[] = [];
  const optimisations: TwinOptimisation[] = [];

  const temperatures = input.readings.map((reading) => reading.temperatureC).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const humidities = input.readings.map((reading) => reading.humidityPct).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const medianTemperature = median(temperatures);
  const medianHumidity = median(humidities);

  if (input.readings.length === 0) {
    findings.push({ id: "no-readings", severity: "watch", title: "The twin has no environmental observations yet", explanation: "Tiny Titans can model the enclosure structure now, but it will not pretend the unmeasured microclimate is known.", confidence: 1 });
  }

  if (zones.length < 2 && input.readings.length > 0) {
    findings.push({ id: "single-zone", severity: "watch", title: "Microclimate coverage is narrow", explanation: "Only one recorded zone is represented. A single location can miss the gradient an ectothermic animal uses to thermoregulate.", confidence: 0.94 });
    optimisations.push({ id: "map-more-zones", title: "Measure another zone", reason: "Broader spatial coverage makes the enclosure model more informative without assuming a universal target temperature.", priority: 80 });
  }

  const enabledKinds = new Set(activeComponents.map((component) => component.kind));
  if (!enabledKinds.has("monitor")) {
    optimisations.push({ id: "add-monitor", title: "Add an observation point", reason: "The twin becomes more useful when environmental measurements are attached to explicit zones.", priority: 65 });
  }
  if (!enabledKinds.has("enrichment")) {
    optimisations.push({ id: "review-enrichment", title: "Review enrichment structure", reason: "Enrichment is represented as part of the enclosure state so physical changes can be reviewed alongside observations.", priority: 45 });
  }
  if (input.plants?.length && input.plants.some((plant) => plant.status === "struggling")) {
    findings.push({ id: "plant-stress", severity: "watch", title: "A plant has a keeper-recorded stress status", explanation: "This is a plant observation, not a diagnosis and not proof that an enclosure parameter caused it.", confidence: 0.96 });
    optimisations.push({ id: "review-plant-observations", title: "Review the plant record beside recent readings", reason: "Matching plant observations to the same time window can reveal useful husbandry context without assuming causation.", priority: 70 });
  }

  const qualityConfidence = clamp(0.35 + Math.min(0.35, input.readings.length * 0.02) + Math.min(0.2, zones.length * 0.05) + Math.min(0.1, activeComponents.length * 0.01));
  return {
    componentCount: input.components.length,
    activeComponentCount: activeComponents.length,
    readingCount: input.readings.length,
    plantCount: input.plants?.length ?? 0,
    zoneCoverage: zones,
    findings,
    optimisations: optimisations.sort((a, b) => b.priority - a.priority).slice(0, 6),
    health: input.readings.length >= 20 && zones.length >= 2 ? "observed" : input.readings.length ? "developing" : "sparse",
    note: `Digital Twin confidence is ${Math.round(qualityConfidence * 100)}% for structural/environmental context. Median recorded temperature: ${medianTemperature ?? "not measured"}; median recorded humidity: ${medianHumidity ?? "not measured"}. The model never substitutes species-specific evidence for missing keeper observations.`,
  };
}
