import { TITAN_V50_FEATURES } from "./titanV50FeatureMatrix";
import { getV50ImpactedFeatures, type TitanV50EventType } from "./titanV50ImpactGraph";

export interface TitanKnowledgeNode {
  id: string;
  label: string;
  type: "feature" | "route" | "event" | "concept";
}

export interface TitanKnowledgeEdge {
  from: string;
  to: string;
  relation: "uses" | "updates" | "surfaces" | "routes-to";
}

const eventLabels: Partial<Record<TitanV50EventType, string>> = {
  WeightRecorded: "Weight recorded",
  FeedingRecorded: "Feeding recorded",
  ShedRecorded: "Shed recorded",
  BehaviourObserved: "Behaviour observed",
  HealthRecordCreated: "Health record created",
  EnclosureUpdated: "Enclosure updated",
  MicroclimateRecorded: "Microclimate recorded",
  MorphConfirmed: "Morph confirmed",
  BreedingProjectCreated: "Breeding project created",
};

export function buildTitanKnowledgeGraph() {
  const nodes: TitanKnowledgeNode[] = [];
  const edges: TitanKnowledgeEdge[] = [];
  const addNode = (node: TitanKnowledgeNode) => { if (!nodes.some((entry) => entry.id === node.id)) nodes.push(node); };

  for (const feature of TITAN_V50_FEATURES) {
    const featureId = `feature:${feature.id}`;
    addNode({ id: featureId, label: feature.name, type: "feature" });
    if (feature.route) {
      const routeId = `route:${feature.route}`;
      addNode({ id: routeId, label: feature.route, type: "route" });
      edges.push({ from: featureId, to: routeId, relation: "routes-to" });
    }
    const conceptId = `concept:${feature.layer}`;
    addNode({ id: conceptId, label: feature.layer, type: "concept" });
    edges.push({ from: featureId, to: conceptId, relation: "uses" });
  }

  for (const [eventType, label] of Object.entries(eventLabels)) {
    const eventId = `event:${eventType}`;
    addNode({ id: eventId, label, type: "event" });
    for (const feature of getV50ImpactedFeatures(eventType as TitanV50EventType)) {
      edges.push({ from: eventId, to: `feature:${feature.id}`, relation: "updates" });
    }
  }

  return { nodes, edges };
}

export function queryTitanKnowledgeGraph(query: string) {
  const graph = buildTitanKnowledgeGraph();
  const normalised = query.trim().toLowerCase();
  if (!normalised) return { query, nodes: graph.nodes.slice(0, 12), edges: [] as TitanKnowledgeEdge[] };
  const matched = graph.nodes.filter((node) => node.label.toLowerCase().includes(normalised) || node.id.toLowerCase().includes(normalised));
  const ids = new Set(matched.map((node) => node.id));
  const relatedEdges = graph.edges.filter((edge) => ids.has(edge.from) || ids.has(edge.to)).slice(0, 40);
  const relatedIds = new Set([...relatedEdges.flatMap((edge) => [edge.from, edge.to]), ...ids]);
  return { query, nodes: graph.nodes.filter((node) => relatedIds.has(node.id)).slice(0, 30), edges: relatedEdges };
}

export function buildHolyShitDiscoveries(eventType?: TitanV50EventType) {
  const discoveries: Array<{ title: string; detail: string; featureIds: readonly number[] }> = [];
  const impacted = eventType ? getV50ImpactedFeatures(eventType).map((feature) => feature.id) : [];

  if (eventType === "WeightRecorded") discoveries.push({ title: "That weight entry just became more useful", detail: "A recorded weight can contribute to growth history, then-vs-now comparisons, keeper journaling and proactive context once enough records exist.", featureIds: [6, 7, 8, 15, 27, 39, 44, 49, 50] });
  if (eventType === "FeedingRecorded") discoveries.push({ title: "One feeding record can connect several timelines", detail: "Feeding history can add context to growth, behaviour, shed investigations, hatchling context and the keeper journal without claiming causation.", featureIds: [6, 8, 9, 15, 26, 27, 33, 39, 44, 49, 50] });
  if (eventType === "MorphConfirmed") discoveries.push({ title: "A genetics confirmation can clean up the whole genetic graph", detail: "A confirmed genetic record can update recognised combinations, evidence state, identity confidence and breeding context while preserving provenance.", featureIds: [1, 5, 11, 23, 24, 34, 37, 46] });
  if (eventType === "EnclosureUpdated" || eventType === "MicroclimateRecorded") discoveries.push({ title: "Your enclosure just changed the context around the animal", detail: "Explicit enclosure and microclimate observations can feed the anomaly engine, digital-twin state and alerting without inventing environmental readings.", featureIds: impacted });
  return discoveries;
}
