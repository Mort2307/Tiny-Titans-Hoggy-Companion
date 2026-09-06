export interface AnimalWeightPoint {
  date: number | string;
  grams: number;
}

export interface AnimalObservation {
  date?: number | string;
  category?: string;
  label?: string;
  detail?: string;
}

export interface AnimalIntelligenceInput {
  name?: string;
  birthDate?: number | string;
  weights?: readonly AnimalWeightPoint[];
  feedings?: readonly AnimalObservation[];
  sheds?: readonly AnimalObservation[];
  behaviour?: readonly AnimalObservation[];
  health?: readonly AnimalObservation[];
}

export interface GrowthInsight {
  sampleCount: number;
  currentWeight?: number;
  changeGrams?: number;
  averageChangePerDay?: number;
  confidence: "High" | "Moderate" | "Low" | "More data needed";
}

export interface BehaviourProfile {
  labels: readonly string[];
  observationCount: number;
  confidence: "High" | "Moderate" | "Low" | "More data needed";
  note: string;
}

export interface AnimalTimelineEvent {
  date: number;
  type: "weight" | "feeding" | "shed" | "behaviour" | "health";
  label: string;
}

function millis(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getGrowthInsight(weights: readonly AnimalWeightPoint[]): GrowthInsight {
  const sorted = weights
    .map((point) => ({ date: millis(point.date), grams: point.grams }))
    .filter((point) => point.date > 0 && Number.isFinite(point.grams) && point.grams > 0)
    .sort((a, b) => a.date - b.date);

  if (sorted.length < 2) {
    return { sampleCount: sorted.length, currentWeight: sorted.at(-1)?.grams, confidence: "More data needed" };
  }

  const first = sorted[0];
  const last = sorted.at(-1)!;
  const days = Math.max(1, (last.date - first.date) / 86_400_000);
  const change = last.grams - first.grams;
  return {
    sampleCount: sorted.length,
    currentWeight: last.grams,
    changeGrams: Number(change.toFixed(2)),
    averageChangePerDay: Number((change / days).toFixed(3)),
    confidence: sorted.length >= 6 ? "High" : sorted.length >= 3 ? "Moderate" : "Low",
  };
}

export function buildAnimalTimeline(input: AnimalIntelligenceInput): AnimalTimelineEvent[] {
  const timeline: AnimalTimelineEvent[] = [];
  for (const point of input.weights ?? []) timeline.push({ date: millis(point.date), type: "weight", label: `${point.grams} g` });
  for (const item of input.feedings ?? []) timeline.push({ date: millis(item.date), type: "feeding", label: item.label ?? "Feeding recorded" });
  for (const item of input.sheds ?? []) timeline.push({ date: millis(item.date), type: "shed", label: item.label ?? "Shed recorded" });
  for (const item of input.behaviour ?? []) timeline.push({ date: millis(item.date), type: "behaviour", label: item.label ?? item.category ?? "Behaviour observed" });
  for (const item of input.health ?? []) timeline.push({ date: millis(item.date), type: "health", label: item.label ?? "Health record" });
  return timeline.filter((event) => event.date > 0).sort((a, b) => a.date - b.date);
}

export function buildBehaviourProfile(observations: readonly AnimalObservation[]): BehaviourProfile {
  const labels = observations
    .map((item) => (item.label ?? item.category ?? "").trim())
    .filter(Boolean);
  if (labels.length === 0) {
    return { labels: [], observationCount: 0, confidence: "More data needed", note: "No behaviour observations are recorded yet; no temperament is inferred." };
  }
  const frequency = new Map<string, number>();
  for (const label of labels) frequency.set(label, (frequency.get(label) ?? 0) + 1);
  const ranked = [...frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label]) => label);
  return {
    labels: ranked,
    observationCount: labels.length,
    confidence: labels.length >= 8 ? "High" : labels.length >= 4 ? "Moderate" : "Low",
    note: "This is a record-derived behaviour profile, not a permanent personality claim.",
  };
}

export function buildThenVsNow(input: AnimalIntelligenceInput) {
  const timeline = buildAnimalTimeline(input);
  if (timeline.length < 2) return { available: false, reason: "At least two dated records are needed for a comparison.", earlier: undefined, current: undefined };
  return { available: true, reason: "Comparison uses the earliest and latest dated records only; it does not infer causation.", earlier: timeline[0], current: timeline.at(-1) };
}
