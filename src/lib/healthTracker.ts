import type { HealthEventType, HealthStatus } from "../types/Health";

export const HEALTH_EVENT_TYPES: HealthEventType[] = ["Routine Check","Vet Visit","Medication","Illness","Injury","Observation","Other"];
export const HEALTH_STATUSES: HealthStatus[] = ["Normal","Monitoring","Treatment","Recovered"];
export const healthToday = () => new Date().toISOString().slice(0,10);
export function browserTimezone(): string { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London"; }
