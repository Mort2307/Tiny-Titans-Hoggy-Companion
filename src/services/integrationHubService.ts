import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import { listReminders } from "./reminderService";
import type { Reminder } from "../types/Reminder";

const functions = getFunctions(app, "europe-west2");

export type IntegrationDevice = {
  id: string;
  deviceId: string;
  name: string;
  source: string;
  enclosureId: string;
  animalId: string;
  metrics: Record<string, number | boolean>;
  lastSeenAt: number | null;
  firstSeenAt: number | null;
  readingCount: number;
};

export type IntegrationTelemetryReading = {
  id: string;
  recordedAt: number | null;
  sourceTimestamp: string;
  metrics: Record<string, number | boolean>;
};

export type IntegrationProvider = {
  id: string;
  name: string;
  cost: "free";
  status: "available" | "ready" | "connected";
};

export type IntegrationAutomationRule = {
  id: string;
  name: string;
  deviceId: string;
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte";
  threshold: number;
  cooldownMinutes: number;
  enabled: boolean;
  triggerCount: number;
  lastTriggeredAtMs: number | null;
};

export type IntegrationAutomationInput = {
  id?: string;
  name: string;
  deviceId: string;
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte";
  threshold: number;
  cooldownMinutes: number;
  enabled?: boolean;
};

export type IntegrationHubStatus = {
  policy: {
    mode: "zero-cost";
    thirdPartyBudgetGbpMonthly: 0;
    paidProvidersEnabled: false;
    meteredProvidersEnabled: false;
    statement: string;
  };
  gateway: {
    enabled: boolean;
    keySuffix: string;
    createdAt: number | null;
    lastUsedAt: number | null;
    endpoint: string;
  };
  push: {
    enabledDeviceCount: number;
    available: boolean;
  };
  devices: IntegrationDevice[];
  providers: IntegrationProvider[];
};

const getStatusCall = httpsCallable<void, IntegrationHubStatus>(functions, "getIntegrationHubStatus");
const createKeyCall = httpsCallable<{ label?: string }, { key: string; endpoint: string; keySuffix: string; message: string }>(functions, "createIntegrationGatewayKey");
const revokeKeyCall = httpsCallable<void, { success: boolean }>(functions, "revokeIntegrationGatewayKey");
const getRulesCall = httpsCallable<void, { rules: IntegrationAutomationRule[] }>(functions, "getIntegrationAutomationRules");
const saveRuleCall = httpsCallable<{ rule: IntegrationAutomationInput }, { success: boolean; id: string }>(functions, "saveIntegrationAutomationRule");
const deleteRuleCall = httpsCallable<{ ruleId: string }, { success: boolean }>(functions, "deleteIntegrationAutomationRule");
const telemetryCall = httpsCallable<{ deviceId: string; limit?: number }, { deviceId: string; readings: IntegrationTelemetryReading[] }>(functions, "getIntegrationTelemetry");

export async function getIntegrationHubStatus(): Promise<IntegrationHubStatus> {
  return (await getStatusCall()).data;
}
export async function createIntegrationGatewayKey(label = "My keeper gateway") {
  return (await createKeyCall({ label })).data;
}
export async function revokeIntegrationGatewayKey() {
  return (await revokeKeyCall()).data;
}
export async function getIntegrationAutomationRules(): Promise<IntegrationAutomationRule[]> {
  return (await getRulesCall()).data.rules || [];
}
export async function saveIntegrationAutomationRule(rule: IntegrationAutomationInput) {
  return (await saveRuleCall({ rule })).data;
}
export async function deleteIntegrationAutomationRule(ruleId: string) {
  return (await deleteRuleCall({ ruleId })).data;
}
export async function getIntegrationTelemetry(deviceId: string, limit = 100): Promise<IntegrationTelemetryReading[]> {
  const safeLimit = Math.max(1, Math.min(250, Math.round(limit)));
  return (await telemetryCall({ deviceId, limit: safeLimit })).data.readings || [];
}

function icsEscape(value: unknown): string {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function dateOnly(value: string): string {
  return value.replace(/-/g, "");
}
function stamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function reminderEvent(reminder: Reminder, uid: string): string[] {
  const start = reminder.nextOccurrenceDate || reminder.startDate;
  if (!start) return [];
  const title = reminder.snakeName ? `${reminder.title} · ${reminder.snakeName}` : reminder.title;
  const description = [reminder.description, reminder.snakeName ? `Animal: ${reminder.snakeName}` : "", "Managed by Tiny Titans Keeper Companion"].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VEVENT",
    `UID:${icsEscape(reminder.id)}-${icsEscape(uid)}@tinytitanskeeper.web.app`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${dateOnly(start)}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "TRANSP:TRANSPARENT",
  ];
  const oneTime = reminder.scheduleType === "once" || reminder.oneTime === true;
  if (!oneTime && reminder.status === "active") {
    const interval = Math.max(1, Math.round(Number(reminder.frequencyDays) || 1));
    lines.push(`RRULE:FREQ=DAILY;INTERVAL=${interval}`);
  }
  lines.push("END:VEVENT");
  return lines;
}
export async function downloadReminderCalendar(uid: string): Promise<number> {
  const reminders = (await listReminders(uid)).filter((item) => item.status === "active" && Boolean(item.nextOccurrenceDate || item.startDate));
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiny Titans//Keeper Companion//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tiny Titans Keeper Reminders",
    ...reminders.flatMap((item) => reminderEvent(item, uid)),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tiny-titans-reminders.ics";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return reminders.length;
}
