import type { TinyTitansEvent, TinyTitansEventName } from "../../services/tinyTitansEventBus";

export type IntelligenceGrowthDomain =
  | "animal"
  | "weight"
  | "feeding"
  | "shed"
  | "behaviour"
  | "health"
  | "microclimate"
  | "genetics"
  | "breeding"
  | "hatchling"
  | "learning"
  | "community"
  | "marketplace"
  | "notifications"
  | "rescue"
  | "workspace";

export interface IntelligenceGrowthEvent {
  id: string;
  eventName: TinyTitansEventName;
  domain: IntelligenceGrowthDomain;
  occurredAt: number;
  entityId?: string;
}

export interface IntelligenceGrowthSnapshot {
  growthIndex: number;
  eventCount: number;
  activeDomains: IntelligenceGrowthDomain[];
  domainCoverage: number;
  correlationOpportunity: number;
  freshness: number;
  evidenceDepth: number;
  nextActions: string[];
  explanation: string;
}

const DOMAIN_MAP: Partial<Record<TinyTitansEventName, IntelligenceGrowthDomain>> = {
  SnakeCreated: "animal",
  WeightRecorded: "weight",
  FeedingRecorded: "feeding",
  ShedRecorded: "shed",
  BehaviourRecorded: "behaviour",
  HealthRecordCreated: "health",
  MicroclimateRecorded: "microclimate",
  EnclosureUpdated: "microclimate",
  MorphConfirmed: "genetics",
  GeneticsChanged: "genetics",
  BreedingProjectCreated: "breeding",
  BreedingProjectChanged: "breeding",
  HatchlingRecorded: "hatchling",
  MarketplaceListingCreated: "marketplace",
  AchievementUnlocked: "learning",
  NotificationScheduled: "notifications",
  RescueIntakeRecorded: "rescue",
  RescueCareRecorded: "rescue",
  RescueStatusChanged: "rescue",
  RescueReminderChanged: "rescue",
  RescueTransferRecorded: "rescue",
  RescueFosterRecorded: "rescue",
  RescueDocumentRecorded: "rescue",
  WorkspaceChanged: "workspace",
};

const INTELLIGENCE_DOMAINS: readonly IntelligenceGrowthDomain[] = [
  "animal", "weight", "feeding", "shed", "behaviour", "health", "microclimate", "genetics",
  "breeding", "hatchling", "learning", "community", "marketplace", "rescue", "workspace",
];

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }

export function intelligenceGrowthDomainForEvent(eventName: TinyTitansEventName): IntelligenceGrowthDomain | null {
  return DOMAIN_MAP[eventName] ?? null;
}

export function toIntelligenceGrowthEvent(event: TinyTitansEvent<TinyTitansEventName>): IntelligenceGrowthEvent | null {
  const domain = intelligenceGrowthDomainForEvent(event.type);
  if (!domain) return null;
  const payload = event.payload as Record<string, unknown>;
  const rawTime = payload.occurredAt;
  const occurredAt = Date.parse(String(rawTime ?? ""));
  return {
    id: `${event.type}:${Number.isFinite(occurredAt) ? occurredAt : Date.now()}:${crypto.randomUUID()}`,
    eventName: event.type,
    domain,
    occurredAt: Number.isFinite(occurredAt) ? occurredAt : Date.now(),
    entityId: typeof payload.snakeId === "string" ? payload.snakeId : typeof payload.projectId === "string" ? payload.projectId : undefined,
  };
}

export function calculateIntelligenceGrowth(events: readonly IntelligenceGrowthEvent[], now = Date.now()): IntelligenceGrowthSnapshot {
  const recent = events.filter((event) => Number.isFinite(event.occurredAt) && event.occurredAt > 0).sort((a, b) => a.occurredAt - b.occurredAt);
  const domains = [...new Set(recent.map((event) => event.domain))];
  const domainCoverage = clamp(domains.length / INTELLIGENCE_DOMAINS.length);
  const windowStart = now - (30 * 86400000);
  const recentWindow = recent.filter((event) => event.occurredAt >= windowStart);
  const recentDomains = new Set(recentWindow.map((event) => event.domain));
  const freshness = recentWindow.length ? clamp(0.35 + (recentWindow.length / 30) * 0.65) : 0;

  let correlatedPairs = 0;
  const checkedPairs = Math.max(1, Math.min(40, recentWindow.length * (recentWindow.length - 1) / 2));
  for (let index = 0; index < recentWindow.length; index += 1) {
    for (let next = index + 1; next < recentWindow.length && next < index + 12; next += 1) {
      const left = recentWindow[index];
      const right = recentWindow[next];
      if (left.domain !== right.domain && Math.abs(left.occurredAt - right.occurredAt) <= 14 * 86400000) correlatedPairs += 1;
    }
  }
  const correlationOpportunity = clamp(correlatedPairs / checkedPairs);
  const evidenceDepth = clamp(recent.length / 60);
  const rawIndex = (domainCoverage * 0.34) + (correlationOpportunity * 0.28) + (freshness * 0.18) + (evidenceDepth * 0.20);
  const growthIndex = Math.round(rawIndex * 100);

  const nextActions: string[] = [];
  if (!domains.includes("animal")) nextActions.push("Create or enrich an animal record so later observations have an entity to anchor to.");
  if (!domains.includes("weight")) nextActions.push("Record dated weights where appropriate; longitudinal measurements strengthen individual baselines.");
  if (!domains.includes("feeding")) nextActions.push("Record feeding outcomes so nutrition and growth can be reviewed together.");
  if (!domains.includes("microclimate")) nextActions.push("Record environmental observations so husbandry can be interpreted alongside behaviour and health.");
  if (!domains.includes("learning")) nextActions.push("Use learning activity to connect keeper knowledge with recorded real-world observations.");
  if (correlationOpportunity < 0.2 && recentWindow.length >= 4) nextActions.push("Add observations across more than one domain; intelligence becomes more useful when dated signals can be compared without assuming causation.");
  if (!nextActions.length) nextActions.push("Keep recording normally. New evidence will be evaluated alongside existing history rather than treated as isolated events.");

  return {
    growthIndex,
    eventCount: recent.length,
    activeDomains: domains,
    domainCoverage: Math.round(domainCoverage * 100),
    correlationOpportunity: Math.round(correlationOpportunity * 100),
    freshness: Math.round(freshness * 100),
    evidenceDepth: Math.round(evidenceDepth * 100),
    nextActions: nextActions.slice(0, 4),
    explanation: "Intelligence Growth measures how much useful, recent and cross-domain evidence Tiny Titans has available to connect. It is not a score for the keeper, the animal or the quality of care, and correlation never means causation.",
  };
}
