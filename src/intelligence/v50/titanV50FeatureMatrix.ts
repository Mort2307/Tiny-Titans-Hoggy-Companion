export type V50FeatureStatus = "foundation" | "wired" | "validated" | "planned";

export interface V50Feature {
  id: number;
  name: string;
  layer: "animal" | "genetics" | "husbandry" | "community" | "learning" | "platform";
  status: V50FeatureStatus;
  intelligence: boolean;
  route?: string;
}

/**
 * Canonical V50 product contract. Features are deliberately represented as
 * capabilities rather than UI promises: a capability is only considered
 * complete when its data flow, empty/error states, navigation destination and
 * validation contract are all wired.
 */
export const TITAN_V50_FEATURES: readonly V50Feature[] = [
  { id: 1, name: "Genetics Detective", layer: "genetics", status: "planned", intelligence: true, route: "/morph-library" },
  { id: 2, name: "Morph / Phenotype Scanner", layer: "genetics", status: "planned", intelligence: true, route: "/morph-library" },
  { id: 3, name: "Breeding Dragon Builder", layer: "genetics", status: "planned", intelligence: true, route: "/calculator" },
  { id: 4, name: "Living Genetic Family Tree", layer: "genetics", status: "planned", intelligence: true, route: "/breeding" },
  { id: 5, name: "Genetic Time Machine", layer: "genetics", status: "planned", intelligence: true, route: "/calculator" },
  { id: 6, name: "Titan Keeper Brain", layer: "animal", status: "planned", intelligence: true, route: "/" },
  { id: 7, name: "Snake Life Graph", layer: "animal", status: "planned", intelligence: true, route: "/snakes" },
  { id: 8, name: "Then vs Now", layer: "animal", status: "planned", intelligence: true, route: "/snakes" },
  { id: 9, name: "Personality System", layer: "animal", status: "planned", intelligence: true, route: "/behaviour" },
  { id: 10, name: "Titan Earth / Community Globe", layer: "community", status: "planned", intelligence: true, route: "/community" },
  { id: 11, name: "Morph Discovery Engine", layer: "genetics", status: "planned", intelligence: true, route: "/morph-library" },
  { id: 12, name: "High / Sofa Explanation Modes", layer: "learning", status: "planned", intelligence: true, route: "/knowledge-base" },
  { id: 13, name: "Snake Passport", layer: "animal", status: "planned", intelligence: true, route: "/snakes" },
  { id: 14, name: "Vet Mode", layer: "animal", status: "planned", intelligence: true, route: "/health" },
  { id: 15, name: "Something Changed Detector", layer: "husbandry", status: "planned", intelligence: true, route: "/" },
  { id: 16, name: "Genetic What-If Sandbox", layer: "genetics", status: "planned", intelligence: true, route: "/sandbox" },
  { id: 17, name: "Titanverse", layer: "platform", status: "planned", intelligence: true, route: "/" },
  { id: 18, name: "Husbandry Anomaly Engine", layer: "husbandry", status: "planned", intelligence: true, route: "/husbandry" },
  { id: 19, name: "Microclimate Logger", layer: "husbandry", status: "planned", intelligence: true, route: "/enclosure-intelligence" },
  { id: 20, name: "Vivarium Digital Twin", layer: "husbandry", status: "foundation", intelligence: true, route: "/reptile-room" },
  { id: 21, name: "Bioactive Ecosystem Tracker", layer: "husbandry", status: "planned", intelligence: true, route: "/reptile-room" },
  { id: 22, name: "Plant Intelligence", layer: "husbandry", status: "planned", intelligence: true, route: "/enclosure-intelligence" },
  { id: 23, name: "Evidence Ladder", layer: "genetics", status: "foundation", intelligence: true, route: "/morph-library/evidence" },
  { id: 24, name: "Genetics Conflict Detector", layer: "genetics", status: "planned", intelligence: true, route: "/breeding" },
  { id: 25, name: "Impossible Baby Detector", layer: "genetics", status: "planned", intelligence: true, route: "/breeding" },
  { id: 26, name: "Shed Detective", layer: "animal", status: "planned", intelligence: true, route: "/shedding" },
  { id: 27, name: "Growth Curve Predictor", layer: "animal", status: "planned", intelligence: true, route: "/weights" },
  { id: 28, name: "Escape Titan Mode", layer: "animal", status: "planned", intelligence: true, route: "/health" },
  { id: 29, name: "Emergency Mode", layer: "platform", status: "planned", intelligence: true, route: "/health" },
  { id: 30, name: "Microclimate Alerts", layer: "husbandry", status: "planned", intelligence: true, route: "/enclosure-intelligence" },
  { id: 31, name: "Enclosure Digital Twin", layer: "husbandry", status: "foundation", intelligence: true, route: "/reptile-room" },
  { id: 32, name: "Vivarium Digital Twin Optimisation", layer: "husbandry", status: "foundation", intelligence: true, route: "/reptile-room" },
  { id: 33, name: "Hatchling Mode", layer: "genetics", status: "planned", intelligence: true, route: "/breeding" },
  { id: 34, name: "Genetic Outcome Feedback", layer: "genetics", status: "planned", intelligence: true, route: "/calculator" },
  { id: 35, name: "Keeper Reputation", layer: "community", status: "planned", intelligence: true, route: "/community" },
  { id: 36, name: "Morph Court", layer: "community", status: "planned", intelligence: true, route: "/community" },
  { id: 37, name: "Genetic Breadcrumbs", layer: "genetics", status: "planned", intelligence: true, route: "/breeding" },
  { id: 38, name: "Annual Titan Time Capsule", layer: "platform", status: "planned", intelligence: true, route: "/snakes" },
  { id: 39, name: "Automatic Keeper Journal", layer: "animal", status: "planned", intelligence: true, route: "/snakes" },
  { id: 40, name: "Adaptive Snake Learning", layer: "learning", status: "foundation", intelligence: true, route: "/adaptive-learning" },
  { id: 41, name: "Species Mastery", layer: "learning", status: "foundation", intelligence: true, route: "/learn" },
  { id: 42, name: "Reptile Census", layer: "community", status: "planned", intelligence: true, route: "/community" },
  { id: 43, name: "Titan Knowledge Graph", layer: "platform", status: "planned", intelligence: true, route: "/knowledge-base" },
  { id: 44, name: "Why Am I Seeing This?", layer: "platform", status: "planned", intelligence: true, route: "/" },
  { id: 45, name: "Data Confidence", layer: "platform", status: "planned", intelligence: true, route: "/account/intelligence" },
  { id: 46, name: "Genetic Identity Confidence", layer: "genetics", status: "planned", intelligence: true, route: "/morph-library" },
  { id: 47, name: "Global Species Intelligence", layer: "community", status: "planned", intelligence: true, route: "/community" },
  { id: 48, name: "Reptile Research Archive", layer: "learning", status: "planned", intelligence: true, route: "/knowledge-base" },
  { id: 49, name: "Proactive Titan Suggestions", layer: "platform", status: "planned", intelligence: true, route: "/" },
  { id: 50, name: "HOLY SHIT Mode / Titan Intelligence", layer: "platform", status: "planned", intelligence: true, route: "/" },
];

export const V50_FEATURE_COUNT = TITAN_V50_FEATURES.length;

export function getV50Feature(id: number): V50Feature | undefined {
  return TITAN_V50_FEATURES.find((feature) => feature.id === id);
}

export function getV50FeaturesByLayer(layer: V50Feature["layer"]): readonly V50Feature[] {
  return TITAN_V50_FEATURES.filter((feature) => feature.layer === layer);
}
