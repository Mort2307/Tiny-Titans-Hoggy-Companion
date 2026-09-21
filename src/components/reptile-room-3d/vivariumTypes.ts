import type { VivariumDigitalTwin } from "../../types/vivariumTwin";

export type VivariumTwinIntelligence = VivariumDigitalTwin["intelligence"];
export type VivariumChecklistKey = keyof VivariumDigitalTwin["checklist"];
export type VivariumChecklistValue<K extends VivariumChecklistKey> = VivariumDigitalTwin["checklist"][K];
