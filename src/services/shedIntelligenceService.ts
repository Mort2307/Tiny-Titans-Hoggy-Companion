import type { ShedIntelligence, ShedRecord, ShedStage } from "../types/Shed";

const DAY = 86400000;
function daysBetween(from?: string, to?: string) {
  if (!from || !to) return null;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / DAY)) : null;
}

export function analyseShedding(records: ShedRecord[], today = new Date().toISOString().slice(0, 10)): ShedIntelligence {
  const ordered = [...records].sort((a, b) => (a.completedAt || a.cycleStartedAt || a.date).localeCompare(b.completedAt || b.cycleStartedAt || b.date));
  const completed = ordered.filter((record) => record.completedAt || record.currentStage === "Complete");
  const active = ordered.find((record) => record.currentStage && record.currentStage !== "Complete" && !record.completedAt);
  const intervals = completed.slice(1).map((record, index) => daysBetween(completed[index].completedAt || completed[index].date, record.completedAt || record.date)).filter((value): value is number => value !== null && value > 0);
  const durations = completed.map((record) => record.cycleDurationDays ?? daysBetween(record.cycleStartedAt || record.date, record.completedAt)).filter((value): value is number => value !== null && value >= 0);
  const retainedCycles = completed.filter((record) => record.retainedAreas?.length || record.retainedEyeCaps || record.retainedTailTip);
  const problematic = completed.filter((record) => record.status === "Problematic" || record.quality === "Difficult");
  const completenessFields = active
    ? [active.cycleStartedAt, active.clearPhaseAt, active.currentStage, active.notes || active.quality !== "Unknown"]
    : completed.length ? [completed[0].completedAt || completed[0].date, completed[0].status, completed[0].quality, completed[0].retainedAreas, completed[0].assistance] : [];
  const completeness = completenessFields.length ? Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100) : 0;
  const activeDays = active ? daysBetween(active.cycleStartedAt || active.date, today) : null;
  const averageIntervalDays = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
  const averageDurationDays = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;
  const insights: string[] = [];
  let severity: ShedIntelligence["severity"] = "info";
  let headline = completed.length ? "Shedding history is building a useful pattern." : "Start a shedding cycle to build this snake's baseline.";

  if (active) {
    headline = active.currentStage === "Blue" ? "Early shedding detected — keep this cycle open." : "Active shedding cycle detected — continue the same record.";
    insights.push(`This is one physical cycle, currently in ${active.currentStage} phase.`);
    if (activeDays !== null) insights.push(`The cycle has been open for ${activeDays} day${activeDays === 1 ? "" : "s"}.`);
  } else if (averageIntervalDays !== null) {
    insights.push(`This snake's recorded completed-shed interval averages about ${averageIntervalDays} days.`);
  }
  if (retainedCycles.length) {
    insights.push(`${retainedCycles.length} completed cycle${retainedCycles.length === 1 ? " has" : "s have"} recorded retained shed areas.`);
    severity = "watch";
  }
  if (problematic.length) {
    insights.push(`${problematic.length} completed cycle${problematic.length === 1 ? " is" : "s are"} marked problematic or difficult.`);
    severity = "action";
    headline = "The shedding history contains a pattern worth reviewing.";
  }
  if (completed.length >= 3 && averageIntervalDays !== null) insights.push("Tiny Titans can now compare future completed cycles against this snake's own history rather than a generic target.");
  if (!insights.length) insights.push("Record the outcome, retained areas and assistance used so future shedding can be interpreted from this snake's own history.");

  const cycleStage: ShedStage | "None" = active?.currentStage ?? (completed.length ? "Complete" : "None");
  const summary = active
    ? `Active ${active.currentStage} phase${activeDays !== null ? ` · ${activeDays} day${activeDays === 1 ? "" : "s"} open` : ""}`
    : completed.length ? `${completed.length} completed cycle${completed.length === 1 ? "" : "s"} recorded${averageIntervalDays !== null ? ` · ${averageIntervalDays}-day average interval` : ""}` : "No completed cycles yet";

  return { completeness, headline, summary, severity, cycleStage, activeDays, averageIntervalDays, averageDurationDays, retainedAreaFrequency: completed.length ? Math.round((retainedCycles.length / completed.length) * 100) : 0, problematicCycleCount: problematic.length, insights };
}
