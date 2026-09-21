import type { RetainedShedArea, ShedAssistance, ShedQuality, ShedStage, ShedStatus } from "../types/Shed";

export const SHED_STAGES: ShedStage[] = ["Blue", "Clear", "Complete"];
export const SHED_QUALITIES: ShedQuality[] = ["Perfect", "Good", "Partial", "Difficult", "Unknown"];
export const SHED_STATUSES: ShedStatus[] = ["Complete", "Partial", "Problematic"];
export const RETAINED_SHED_AREAS: RetainedShedArea[] = ["Eye Cap", "Head", "Tail Tip", "Body", "Other"];
export const SHED_ASSISTANCES: ShedAssistance[] = ["None", "Monitoring Only", "Humidity Adjustment", "Keeper Intervention", "Veterinary Assistance"];

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function displayShedDate(iso?: string): string {
  return iso ? new Intl.DateTimeFormat("en-GB").format(new Date(`${iso}T00:00:00Z`)) : "Not recorded";
}

export function parseShedDate(value: string): string | null {
  const parts = value.trim().replace(/[.-]/g, "/").split("/");
  if (parts.length !== 3) return null;
  const [d, m, rawY] = parts.map(Number);
  let year = rawY;
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, m - 1, d));
  return Number.isFinite(date.getTime()) &&
    date.getUTCDate() === d &&
    date.getUTCMonth() === m - 1
    ? `${year.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`
    : null;
}

export function shedStageTitle(stage: ShedStage): string {
  return stage === "Blue" ? "Blue phase" : stage === "Clear" ? "Clear phase" : "Full shed";
}

export function retainedAreasFromRecord(
  record: import("../types/Shed").ShedRecord,
): RetainedShedArea[] {
  if (record.retainedAreas?.length) return record.retainedAreas;
  return [
    ...(record.retainedEyeCaps ? (["Eye Cap"] as const) : []),
    ...(record.retainedTailTip ? (["Tail Tip"] as const) : []),
    ...(record.retainedShedArea &&
    record.retainedShedArea !== "None" &&
    record.retainedShedArea !== "Multiple Areas"
      ? [record.retainedShedArea]
      : []),
  ];
}
