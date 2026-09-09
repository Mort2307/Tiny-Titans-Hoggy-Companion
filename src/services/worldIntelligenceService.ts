import type { WorldTimeSnapshot } from "./worldTimeService";

export type WorldIntelligenceTone = "quiet" | "neutral" | "attention";

export interface WorldIntelligenceBrief {
  tone: WorldIntelligenceTone;
  eyebrow: string;
  headline: string;
  detail: string;
}

export function buildWorldIntelligenceBrief(snapshot: WorldTimeSnapshot, hasActiveDecision: boolean): WorldIntelligenceBrief {
  const localWindow = snapshot.localTimePeriod;

  if (localWindow === "late-night") {
    return {
      tone: hasActiveDecision ? "attention" : "quiet",
      eyebrow: hasActiveDecision ? "WORLD CONTEXT · ACTION WAITING" : "WORLD CONTEXT · QUIET HOURS",
      headline: hasActiveDecision ? "A Titan action is waiting, but routine work can wait." : "It is a quiet keeper window.",
      detail: hasActiveDecision
        ? `It is ${snapshot.localTime} in ${snapshot.timezoneLabel}. Tiny Titans will keep the decision visible without treating the middle of the night like a normal routine window.`
        : `It is ${snapshot.localTime} in ${snapshot.timezoneLabel}. Routine logging can wait unless something genuinely needs attention.`,
    };
  }

  if (localWindow === "morning") {
    return {
      tone: hasActiveDecision ? "attention" : "neutral",
      eyebrow: hasActiveDecision ? "WORLD CONTEXT · MORNING PRIORITY" : "WORLD CONTEXT · MORNING",
      headline: hasActiveDecision ? "Your keeper day is starting with a useful next action." : "Good morning — the keeper day is opening up.",
      detail: hasActiveDecision
        ? `Local time is ${snapshot.localTime} (${snapshot.utcOffsetLabel}). The ranked Titan decision stays anchored to this local context.`
        : `Local time is ${snapshot.localTime} (${snapshot.utcOffsetLabel}). Tiny Titans can use this local day context without changing your scheduled reminder timezones.`,
    };
  }

  if (localWindow === "afternoon") {
    return {
      tone: hasActiveDecision ? "attention" : "neutral",
      eyebrow: hasActiveDecision ? "WORLD CONTEXT · PRIORITY" : "WORLD CONTEXT · AFTERNOON",
      headline: hasActiveDecision ? "There is a ranked keeper action worth checking." : "You are in the main daytime keeper window.",
      detail: `It is ${snapshot.localTime} on ${snapshot.localWeekday} in ${snapshot.timezoneLabel}. The app's live context follows your current device timezone while explicit routines stay independently anchored.`,
    };
  }

  if (localWindow === "evening") {
    return {
      tone: hasActiveDecision ? "attention" : "neutral",
      eyebrow: hasActiveDecision ? "WORLD CONTEXT · EVENING PRIORITY" : "WORLD CONTEXT · EVENING",
      headline: hasActiveDecision ? "One useful action is still worth surfacing tonight." : "The keeper day is moving into its evening window.",
      detail: `Local time is ${snapshot.localTime} in ${snapshot.timezoneLabel}. Tiny Titans can distinguish your current local context from any reminder schedule you deliberately set elsewhere.`,
    };
  }

  return {
    tone: hasActiveDecision ? "attention" : "neutral",
    eyebrow: hasActiveDecision ? "WORLD CONTEXT · NIGHT PRIORITY" : "WORLD CONTEXT · NIGHT",
    headline: hasActiveDecision ? "A ranked Titan action is still available to review." : "It is the quieter part of the keeper day.",
    detail: `Local time is ${snapshot.localTime} in ${snapshot.timezoneLabel}. The live clock is contextual; reminder schedules remain explicit and timezone-safe.`,
  };
}
