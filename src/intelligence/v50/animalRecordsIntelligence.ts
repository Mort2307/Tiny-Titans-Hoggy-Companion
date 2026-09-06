export interface RecordEvent {
  id: string;
  type: string;
  date: number | string;
  title: string;
  detail?: string;
}

export function buildSnakePassport(events: readonly RecordEvent[]) {
  const dated = events.filter((event) => Number.isFinite(typeof event.date === "number" ? event.date : Date.parse(event.date)));
  const types = [...new Set(dated.map((event) => event.type))];
  return { generatedAt: Date.now(), eventCount: dated.length, coveredRecordTypes: types, oldestRecord: dated.length ? dated.reduce((oldest, event) => (toMillis(event.date) < toMillis(oldest.date) ? event : oldest)) : undefined, newestRecord: dated.length ? dated.reduce((newest, event) => (toMillis(event.date) > toMillis(newest.date) ? event : newest)) : undefined, note: "Passport content is assembled from the keeper's recorded history; it does not certify facts that are absent from those records." };
}
export function buildAnnualTitanTimeCapsule(events: readonly RecordEvent[], year: number) { const annual = events.filter((event) => new Date(toMillis(event.date)).getFullYear() === year).sort((a, b) => toMillis(a.date) - toMillis(b.date)); return { year, eventCount: annual.length, milestones: annual.slice(0, 20), summary: annual.length ? `${annual.length} recorded event(s) captured for ${year}.` : `No dated records were found for ${year}.` }; }
export function buildAutomaticKeeperJournal(events: readonly RecordEvent[]) { return [...events].filter((event) => toMillis(event.date) > 0).sort((a, b) => toMillis(b.date) - toMillis(a.date)).slice(0, 100).map((event) => ({ ...event, journalLine: `${event.title}${event.detail ? ` — ${event.detail}` : ""}` })); }
export function buildEscapeRecoveryChecklist() { return ["Secure other reptiles and close escape routes.", "Record the last confirmed location and time.", "Search warm, dark and concealed areas methodically.", "Keep doors and windows controlled while searching.", "Record where and when the animal is recovered.", "Escalate to appropriate local help if the animal cannot be safely recovered."] as const; }
export function buildEmergencyBoundary() { return { steps: ["Stabilise the situation and protect the animal and people nearby.", "Record observable facts rather than attempting a diagnosis.", "Use the animal's species-specific emergency guidance where available.", "Contact an appropriately qualified reptile veterinarian or emergency service when professional assessment is needed."] as const, boundary: "Tiny Titans can organise observations and safety steps; it does not diagnose or replace professional veterinary assessment." }; }
function toMillis(value: number | string): number { if (typeof value === "number" && Number.isFinite(value)) return value; const parsed = Date.parse(String(value)); return Number.isFinite(parsed) ? parsed : 0; }
