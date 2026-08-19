export type HealthEventType =
  | "Routine Check"
  | "Vet Visit"
  | "Medication"
  | "Illness"
  | "Injury"
  | "Observation"
  | "Other";

export type HealthStatus = "Normal" | "Monitoring" | "Treatment" | "Recovered";

export type MedicationSchedule = {
  enabled: boolean;
  medicationName: string;
  dose: string;
  route?: string;
  frequency: "once" | "daily" | "twice-daily" | "every-other-day" | "custom";
  intervalHours?: number;
  administrationTimes: string[];
  startDate: string;
  endDate?: string;
  timezone: string;
  reminderEnabled: boolean;
  followUpDate?: string;
  nextDueAt?: string;
};

export type MedicationAdministration = {
  id: string;
  scheduledFor: string;
  administeredAt?: string;
  status: "given" | "skipped" | "snoozed" | "missed";
  note?: string;
  recordedBy?: string;
};

export type HealthRecord = {
  id: string;
  snakeId: string;
  date: string;
  eventType: HealthEventType;
  status: HealthStatus;
  title: string;
  description: string;
  medication?: string;
  dosage?: string;
  duration?: string;
  vetName?: string;
  followUpDate?: string;
  notes?: string;
  medicationSchedule?: MedicationSchedule;
  medicationAdministrations?: MedicationAdministration[];
  reminderState?: "active" | "completed" | "cancelled";
  timezone?: string;
};
