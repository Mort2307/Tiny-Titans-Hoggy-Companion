import type { Room3DAssetPreset } from "../types/reptileRoom3D";

export type RoomAssetCategory = {
  id: string;
  label: string;
  icon: string;
  description: string;
  items: Room3DAssetPreset[];
};

export const REPTILE_ROOM_ASSET_CATEGORIES: RoomAssetCategory[] = [
  {
    id: "vivariums",
    label: "Vivariums & Enclosures",
    icon: "enclosure",
    description: "Realistic enclosure shells that can be linked to a snake and live husbandry data.",
    items: [
      { assetId: "vivarium-front-opening", kind: "vivarium", label: "Front-opening vivarium", icon: "enclosure", width: 120, depth: 60, height: 60, assetType: "vivarium", intelligenceRole: "enclosure", config: { enclosureStyle: "front-opening" } },
      { assetId: "vivarium-sliding-glass", kind: "vivarium", label: "Sliding-glass vivarium", icon: "enclosure", width: 120, depth: 60, height: 60, assetType: "vivarium", intelligenceRole: "enclosure", config: { enclosureStyle: "sliding-glass" } },
      { assetId: "vivarium-pvc", kind: "vivarium", label: "PVC enclosure", icon: "grid", width: 120, depth: 60, height: 60, assetType: "vivarium", intelligenceRole: "enclosure", config: { enclosureStyle: "pvc" } },
      { assetId: "vivarium-glass", kind: "vivarium", label: "All-glass enclosure", icon: "grid", width: 120, depth: 50, height: 55, assetType: "vivarium", intelligenceRole: "enclosure", config: { enclosureStyle: "glass" } },
      { assetId: "vivarium-arboreal", kind: "vivarium", label: "Tall / arboreal enclosure", icon: "husbandry", width: 90, depth: 60, height: 120, assetType: "vivarium", intelligenceRole: "enclosure", config: { enclosureStyle: "arboreal" } },
      { assetId: "vivarium-quarantine", kind: "vivarium", label: "Quarantine enclosure", icon: "account", width: 90, depth: 45, height: 45, assetType: "vivarium", intelligenceRole: "enclosure", config: { enclosureStyle: "quarantine" } },
      { assetId: "rack-tub", kind: "vivarium", label: "Rack tub / drawer", icon: "marketplace", width: 60, depth: 45, height: 25, assetType: "vivarium", intelligenceRole: "enclosure", config: { enclosureStyle: "rack-tub" } },
    ],
  },
  {
    id: "heating",
    label: "Heating & Thermostat",
    icon: "husbandry",
    description: "Active heating controls with configurable targets and enclosure links.",
    items: [
      { assetId: "thermostat", kind: "thermostat", label: "Thermostat", icon: "husbandry", width: 18, depth: 7, height: 12, assetType: "equipment", intelligenceRole: "thermostat", config: { targetTemperatureC: 30, currentTemperatureC: 30, mode: "heat", enabled: true } },
      { assetId: "heat-mat", kind: "heat-mat", label: "Heat mat", icon: "power", width: 90, depth: 40, height: 2, assetType: "equipment", intelligenceRole: "heating", config: { wattage: 14, enabled: true } },
      { assetId: "ceramic-heat-emitter", kind: "che", label: "Ceramic heat emitter", icon: "power", width: 12, depth: 12, height: 10, assetType: "equipment", intelligenceRole: "heating", config: { wattage: 100, enabled: true } },
      { assetId: "halogen-flood", kind: "halogen", label: "Halogen flood lamp", icon: "power", width: 14, depth: 14, height: 13, assetType: "equipment", intelligenceRole: "heating", config: { wattage: 50, enabled: true } },
      { assetId: "deep-heat-projector", kind: "dhp", label: "Deep heat projector", icon: "power", width: 14, depth: 14, height: 13, assetType: "equipment", intelligenceRole: "heating", config: { wattage: 50, enabled: true } },
      { assetId: "radiant-heat-panel", kind: "rhp", label: "Radiant heat panel", icon: "power", width: 80, depth: 25, height: 4, assetType: "equipment", intelligenceRole: "heating", config: { wattage: 80, enabled: true } },
    ],
  },
  {
    id: "lighting",
    label: "Lighting",
    icon: "power",
    description: "Ceiling and enclosure lighting that can carry power, schedule and photoperiod state.",
    items: [
      { assetId: "ceiling-light", kind: "ceiling-light", label: "Ceiling light", icon: "power", width: 25, depth: 25, height: 8, assetType: "equipment", intelligenceRole: "lighting", config: { wattage: 24, enabled: true, scheduleStart: "08:00", scheduleEnd: "20:00" } },
      { assetId: "led-bar", kind: "led-bar", label: "LED light bar", icon: "power", width: 80, depth: 6, height: 4, assetType: "equipment", intelligenceRole: "lighting", config: { wattage: 18, enabled: true, scheduleStart: "08:00", scheduleEnd: "20:00" } },
      { assetId: "uvb-tube", kind: "uvb", label: "UVB tube & reflector", icon: "power", width: 90, depth: 8, height: 8, assetType: "equipment", intelligenceRole: "lighting", config: { wattage: 24, enabled: true, photoperiodHours: 10 } },
      { assetId: "basking-fixture", kind: "basking-light", label: "Basking lamp fixture", icon: "power", width: 18, depth: 18, height: 16, assetType: "equipment", intelligenceRole: "lighting", config: { wattage: 75, enabled: true } },
    ],
  },
  {
    id: "power",
    label: "Power & Control",
    icon: "power",
    description: "Sockets, distribution and switching infrastructure for real equipment relationships.",
    items: [
      { assetId: "wall-socket", kind: "socket", label: "Wall socket", icon: "power", width: 9, depth: 3, height: 9, assetType: "equipment", intelligenceRole: "power", config: { outlets: 2, maxLoadWatts: 3000, switchable: true, enabled: true, circuit: "Main" } },
      { assetId: "switched-socket", kind: "switched-socket", label: "Switched socket", icon: "power", width: 9, depth: 3, height: 9, assetType: "equipment", intelligenceRole: "power", config: { outlets: 1, maxLoadWatts: 3000, switchable: true, enabled: true, circuit: "Main" } },
      { assetId: "power-strip", kind: "power-strip", label: "Power strip", icon: "power", width: 40, depth: 7, height: 5, assetType: "equipment", intelligenceRole: "power", config: { outlets: 6, maxLoadWatts: 3000, enabled: true, circuit: "Room" } },
      { assetId: "timer-switch", kind: "timer", label: "Timer switch", icon: "timeline", width: 9, depth: 5, height: 12, assetType: "equipment", intelligenceRole: "timer", config: { enabled: true, scheduleStart: "08:00", scheduleEnd: "20:00" } },
      { assetId: "smart-plug", kind: "smart-plug", label: "Smart plug", icon: "messages", width: 7, depth: 5, height: 8, assetType: "equipment", intelligenceRole: "power", config: { enabled: true, maxLoadWatts: 1800 } },
    ],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    icon: "analytics",
    description: "Environmental sensors and monitoring points that feed enclosure intelligence.",
    items: [
      { assetId: "digital-thermometer", kind: "thermometer", label: "Digital thermometer", icon: "husbandry", width: 9, depth: 4, height: 12, assetType: "equipment", intelligenceRole: "sensor", config: { currentTemperatureC: 25 } },
      { assetId: "digital-hygrometer", kind: "hygrometer", label: "Digital hygrometer", icon: "water", width: 9, depth: 4, height: 12, assetType: "equipment", intelligenceRole: "sensor", config: { humidity: 50 } },
      { assetId: "temp-humidity-combo", kind: "temp-humidity", label: "Temp / humidity monitor", icon: "husbandry", width: 10, depth: 4, height: 13, assetType: "equipment", intelligenceRole: "sensor", config: { currentTemperatureC: 25, humidity: 50 } },
    ],
  },
  {
    id: "storage",
    label: "Furniture & Storage",
    icon: "marketplace",
    description: "Keeper infrastructure for organised, serviceable rooms.",
    items: [
      { assetId: "reptile-rack", kind: "rack", label: "Reptile rack", icon: "marketplace", width: 120, depth: 55, height: 180, assetType: "furniture" },
      { assetId: "shelving", kind: "shelving", label: "Shelving", icon: "marketplace", width: 90, depth: 40, height: 180, assetType: "furniture" },
      { assetId: "workbench", kind: "workbench", label: "Keeper workbench", icon: "creator", width: 120, depth: 60, height: 90, assetType: "furniture" },
      { assetId: "storage-cabinet", kind: "storage-cabinet", label: "Storage cabinet", icon: "marketplace", width: 80, depth: 45, height: 120, assetType: "furniture" },
      { assetId: "quarantine-station", kind: "quarantine-area", label: "Quarantine station", icon: "account", width: 100, depth: 55, height: 90, assetType: "furniture", intelligenceRole: "quarantine" },
      { assetId: "table", kind: "table", label: "Keeper table", icon: "enclosure", width: 120, depth: 60, height: 75, assetType: "furniture" },
      { assetId: "chair", kind: "chair", label: "Chair", icon: "enclosure", width: 45, depth: 45, height: 90, assetType: "furniture" },
    ],
  },
  {
    id: "enrichment",
    label: "Enrichment & Husbandry",
    icon: "husbandry",
    description: "Useful enclosure contents rather than decorative filler.",
    items: [
      { assetId: "hide", kind: "hide", label: "Hide", icon: "enclosure", width: 28, depth: 22, height: 16, assetType: "decor", intelligenceRole: "enrichment" },
      { assetId: "water-bowl", kind: "water-bowl", label: "Water bowl", icon: "water", width: 22, depth: 22, height: 8, assetType: "decor", intelligenceRole: "water" },
      { assetId: "cork-bark", kind: "cork", label: "Cork bark", icon: "enclosure", width: 40, depth: 18, height: 20, assetType: "decor", intelligenceRole: "enrichment" },
      { assetId: "branch", kind: "branch", label: "Branch", icon: "husbandry", width: 45, depth: 10, height: 25, assetType: "decor", intelligenceRole: "enrichment" },
      { assetId: "plant", kind: "plant", label: "Plant", icon: "husbandry", width: 25, depth: 25, height: 45, assetType: "decor", intelligenceRole: "enrichment" },
      { assetId: "cleaning-station", kind: "cleaning-station", label: "Cleaning station", icon: "husbandry", width: 60, depth: 40, height: 80, assetType: "equipment", intelligenceRole: "cleaning" },
      { assetId: "scale", kind: "scale", label: "Reptile scales", icon: "weight", width: 30, depth: 30, height: 5, assetType: "equipment", intelligenceRole: "weighing" },
    ],
  },
];

export const REPTILE_ROOM_ASSETS = REPTILE_ROOM_ASSET_CATEGORIES.flatMap((category) => category.items);

export function getRoomAssetPreset(assetId: string | undefined): Room3DAssetPreset | undefined {
  return REPTILE_ROOM_ASSETS.find((asset) => asset.assetId === assetId);
}
