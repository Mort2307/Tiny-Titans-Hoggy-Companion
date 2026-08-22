export type EquipmentMaintenanceKind =
  | "UVB"
  | "CHE"
  | "Halogen"
  | "DHP"
  | "Heat Mat"
  | "Thermostat"
  | "Probe"
  | "Fan"
  | "Other";

export type EquipmentMaintenanceItem = {
  id: string;
  name: string;
  kind: EquipmentMaintenanceKind;
  manufacturer?: string;
  model?: string;
  installedDate?: string;
  lastReplacedDate?: string;
  serviceIntervalDays?: number;
  reminderLeadDays: number;
  replacementNotificationsEnabled: boolean;
  manufacturerServiceLife?: string;
  notes?: string;
};

export type EquipmentMaintenanceStatus = "unknown" | "ok" | "upcoming" | "due" | "overdue";
