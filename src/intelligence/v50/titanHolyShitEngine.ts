export interface TitanMemorySignal {
  id: string;
  domain: "animal" | "genetics" | "husbandry" | "learning" | "community";
  label: string;
  value: string;
  timestamp?: number;
  confidence: number;
}

export interface TitanDiscovery {
  id: string;
  title: string;
  detail: string;
  priority: number;
  confidence: number;
  featureIds: readonly number[];
  evidenceIds: readonly string[];
  why: string;
}

/**
 * Cross-domain discovery engine. It only combines explicit signals that were
 * supplied by another subsystem. It never invents an animal state or claims causation.
 */
export function buildTitanDiscoveries(signals: readonly TitanMemorySignal[]): TitanDiscovery[] {
  const byDomain = new Map<TitanMemorySignal["domain"], TitanMemorySignal[]>();
  for (const signal of signals) {
    const list = byDomain.get(signal.domain) ?? [];
    list.push(signal);
    byDomain.set(signal.domain, list);
  }

  const discoveries: TitanDiscovery[] = [];
  const latest = [...signals].filter((signal) => typeof signal.timestamp === "number").sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))[0];
  if (latest && byDomain.size >= 3) {
    const evidence = [...signals].slice(0, 6);
    discoveries.push({
      id: "cross-domain-context",
      title: "Tiny Titans found a multi-domain context window",
      detail: `${byDomain.size} record domains currently have explicit signals. The newest signal is ${latest.label}: ${latest.value}.`,
      priority: 95,
      confidence: Math.min(0.96, evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length),
      featureIds: [6, 15, 44, 49, 50],
      evidenceIds: evidence.map((item) => item.id),
      why: "Independent records were supplied from multiple domains; Tiny Titans is surfacing the relationship so you can inspect the underlying evidence.",
    });
  }

  const genetics = byDomain.get("genetics") ?? [];
  const husbandry = byDomain.get("husbandry") ?? [];
  if (genetics.length && husbandry.length) {
    const evidence = [...genetics.slice(0, 2), ...husbandry.slice(0, 2)];
    discoveries.push({
      id: "genetics-husbandry-context",
      title: "Genetics and enclosure records are available together",
      detail: "The app has explicit genetics and environmental context available for side-by-side inspection. That is context, not proof that either domain caused the other.",
      priority: 88,
      confidence: evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length,
      featureIds: [1, 18, 20, 24, 44],
      evidenceIds: evidence.map((item) => item.id),
      why: "Cross-domain reasoning is only enabled when both sides provide explicit records.",
    });
  }

  const learning = byDomain.get("learning") ?? [];
  if (learning.length >= 3) {
    const weaker = [...learning].sort((a, b) => a.confidence - b.confidence)[0];
    discoveries.push({
      id: "adaptive-learning-opportunity",
      title: "Your learning history can now change what Tiny Titans shows next",
      detail: `There are ${learning.length} explicit learning signals; the lowest-confidence topic is ${weaker.label}.`,
      priority: 55,
      confidence: Math.min(0.94, learning.reduce((sum, item) => sum + item.confidence, 0) / learning.length),
      featureIds: [12, 40, 41, 49],
      evidenceIds: learning.slice(0, 5).map((item) => item.id),
      why: "Adaptive presentation is based on recorded learning activity rather than an assumed ability level.",
    });
  }

  return discoveries.sort((a, b) => b.priority - a.priority).slice(0, 8);
}
