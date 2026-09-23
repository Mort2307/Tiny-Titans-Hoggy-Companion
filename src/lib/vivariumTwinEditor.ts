import { REPTILE_ROOM_ASSETS } from "../data/reptileRoomAssetCatalog";
import type { VivariumTwinAsset, VivariumDigitalTwin } from "../types/vivariumTwin";

export type VivariumCatalogAsset = (typeof REPTILE_ROOM_ASSETS)[number];
export const cloneVivariumTwin = (value: VivariumDigitalTwin): VivariumDigitalTwin => JSON.parse(JSON.stringify(value)) as VivariumDigitalTwin;
export const createVivariumTwinAssetId = () => `vt-${crypto.randomUUID()}`;
export const clampVivariumCoordinate = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function categoryForVivariumAsset(asset: VivariumCatalogAsset): VivariumTwinAsset["category"] {
  switch (asset.intelligenceRole) {
    case "heating":
    case "thermostat": return "heating";
    case "lighting": return "lighting";
    case "sensor": return "monitoring";
    case "water": return "water";
    case "enrichment":
    case "cleaning":
    case "weighing": return "enrichment";
    default: return "other";
  }
}

export function colourForVivariumAssetKind(kind: string) {
  if (kind === "water-bowl" || kind === "hygrometer" || kind === "temp-humidity") return "#738c95";
  if (["thermostat", "thermometer", "smart-plug", "socket", "switched-socket", "power-strip", "timer"].includes(kind)) return "#3b4348";
  if (["heat-mat", "rhp", "che", "halogen", "dhp", "basking-light", "ceiling-light", "led-bar", "uvb"].includes(kind)) return "#6e5136";
  if (kind === "plant") return "#58744f";
  if (["hide", "cork", "branch"].includes(kind)) return "#795536";
  if (kind === "scale") return "#d7d7d0";
  return "#6a4730";
}