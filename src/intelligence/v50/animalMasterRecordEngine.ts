import type { GrowthInsight, AnimalTimelineEvent, BehaviourProfile } from "./animalIntelligenceEngine";

export interface MasterRecordDomain {
  id: string;
  label: string;
  count: number;
  state: "active" | "empty" | "insufficient";
  detail: string;
}

export interface MasterRecordSuggestion {
  id: string;
  title: string;
  reason: string;
  destination: string;
  confidence: number;
}

export interface AnimalMasterRecord {
  generatedAt: number;
  eventCount: number;
  coverageScore: number;
  domains: MasterRecordDomain[];
  latestEvent?: AnimalTimelineEvent;
  growth: GrowthInsight;
  behaviour: BehaviourProfile;
  suggestions: MasterRecordSuggestion[];
  note: string;
}

interface MasterRecordInput {
  growth: GrowthInsight;
  behaviour: BehaviourProfile;
  timeline: readonly AnimalTimelineEvent[];
  counts: {
    weights: number;
    feedings: number;
    sheds: number;
    behaviour: number;
    health: number;
    journal: number;
    passport: number;
  };
}

export function buildAnimalMasterRecord(input: MasterRecordInput): AnimalMasterRecord {
  const domainEntries: Array<[string, string, number, string]> = [
    ["weight", "Weight & growth", input.counts.weights, input.counts.weights >= 2 ? `${input.growth.currentWeight ?? "—"} g current record` : "More dated weights improve the growth signal"],
    ["feeding", "Feeding", input.counts.feedings, input.counts.feedings ? `${input.counts.feedings} feeding record(s)` : "No feeding history recorded"],
    ["sheds", "Sheds", input.counts.sheds, input.counts.sheds ? `${input.counts.sheds} shed record(s)` : "No shed history recorded"],
    ["behaviour", "Behaviour", input.counts.behaviour, input.counts.behaviour ? `${input.counts.behaviour} observation(s)` : "No behaviour observations recorded"],
    ["health", "Health & veterinary record", input.counts.health, input.counts.health ? `${input.counts.health} health record(s)` : "No health history recorded"],
    ["journal", "Keeper journal", input.counts.journal, input.counts.journal ? `${input.counts.journal} dated source event(s)` : "Journal can be assembled from dated records"],
    ["passport", "Snake passport", input.counts.passport, input.counts.passport ? "Record-backed passport available" : "Passport waiting for dated history"],
  ];

  const domains = domainEntries.map(([id, label, count, detail]) => ({
    id,
    label,
    count,
    state: count === 0 ? "empty" : id === "weight" && count < 2 ? "insufficient" : "active",
    detail,
  } as MasterRecordDomain));

  const activeDomains = domains.filter((domain) => domain.state === "active").length;
  const coverageScore = Math.round((activeDomains / domains.length) * 100);
  const suggestions: MasterRecordSuggestion[] = [];

  if (input.counts.weights < 2) {
    suggestions.push({ id: "weight-baseline", title: "Build a growth baseline", reason: "Two or more dated weight records are needed before Tiny Titans can compare change over time.", destination: "/weights", confidence: 0.96 });
  }
  if (input.counts.behaviour === 0) {
    suggestions.push({ id: "behaviour-baseline", title: "Start the behaviour record", reason: "Tiny Titans does not infer personality from silence. One or more observations create an evidence trail.", destination: "/behaviour", confidence: 0.94 });
  }
  if (input.counts.feedings === 0) {
    suggestions.push({ id: "feeding-history", title: "Log the first feeding", reason: "Feeding history gives the wider intelligence layer temporal context for growth and routine changes.", destination: "/feeding", confidence: 0.93 });
  }
  if (input.counts.sheds === 0) {
    suggestions.push({ id: "shed-history", title: "Start shed history", reason: "Shed dates make the animal timeline more informative without assuming anything about health.", destination: "/shedding", confidence: 0.9 });
  }
  if (input.counts.health === 0) {
    suggestions.push({ id: "health-baseline", title: "Keep a health baseline", reason: "A dated baseline makes later changes easier to review with a veterinarian if concerns arise.", destination: "/health", confidence: 0.88 });
  }

  return {
    generatedAt: Date.now(),
    eventCount: input.timeline.length,
    coverageScore,
    domains,
    latestEvent: input.timeline.at(-1),
    growth: input.growth,
    behaviour: input.behaviour,
    suggestions: suggestions.slice(0, 4),
    note: "The Master Record is a connected summary of explicit keeper records. It does not diagnose, infer missing facts, or replace the underlying source records.",
  };
}
