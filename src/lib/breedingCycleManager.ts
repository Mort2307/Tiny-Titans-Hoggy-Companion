import type { BreedingStatus } from "../types/Breeding";
import type { BreedingCycleEventKind, BreedingCyclePhase } from "../types/BreedingCycle";

export const BREEDING_CYCLE_PHASES: BreedingCyclePhase[] = [
  "Planning","Conditioning","Cooling","Rewarming","Pairing","Reproductive Monitoring",
  "Gravid","Laying","Post-Lay Recovery","Incubation","Hatching","Complete",
];

export const BREEDING_PHASE_STATUS: Partial<Record<BreedingCyclePhase, BreedingStatus>> = {
  Planning: "Planned", Pairing: "Paired", Gravid: "Gravid", Laying: "Laid", Complete: "Complete",
};

export const BREEDING_PHASE_HELP: Record<BreedingCyclePhase,string> = Record<BreedingCyclePhase, string> = {
  Planning: "Define the objective, animals, records and contingency plan before changing the seasonal cycle.",
  Conditioning: "Build a stable baseline. Record feeding, weight, health and body-condition observations rather than chasing a single target number.",
  Cooling: "If you deliberately cool animals, record the method, actual temperatures, weight checks and monitoring. Cooling is not a universal requirement.",
  Rewarming: "Restore normal environmental conditions gradually according to the chosen husbandry protocol and observe recovery before treating breeding as the next automatic step.",
  Pairing: "Record supervised introductions and what was actually observed. A pairing record does not prove successful reproduction.",
  "Reproductive Monitoring": "Record observations such as appetite, behaviour, weight and suspected reproductive milestones without presenting observations as diagnoses.",
  Gravid: "Track the animal and environment. Use suspected/observed language where confirmation is not available and escalate health concerns appropriately.",
  Laying: "Record the actual lay date, clutch and dam observations. Reproductive emergencies require professional veterinary assessment rather than DIY intervention.",
  "Post-Lay Recovery": "Monitor recovery, feeding, hydration, weight and general condition. Do not assume a normal-looking clutch means the dam has recovered.",
  Incubation: "Record the selected incubation method and actual environmental conditions. Different methods are used by experienced keepers; the system does not declare one universal recipe.",
  Hatching: "Record pipping and hatch outcomes without forcing a timetable or inventing certainty. Convert successful hatch records into individual hatchling records.",
  Complete: "Close the cycle only when the keeper considers the breeding record complete. Retrospective analysis can then compare observations without claiming causation."
};;
export const BREEDING_EVENT_KINDS: Array<{ value: BreedingCycleEventKind; label: string }> = Array<{ value: BreedingCycleEventKind; label: string }> = [
  { value: "note", label: "General note" }, { value: "weight", label: "Weight check" }, { value: "feeding", label: "Feeding observation" }, { value: "health", label: "Health observation" }, { value: "temperature", label: "Temperature check" }, { value: "cooling-start", label: "Cooling started" }, { value: "cooling-check", label: "Cooling check" }, { value: "rewarming-start", label: "Rewarming started" }, { value: "pairing-observation", label: "Pairing observation" }, { value: "ovulation-observation", label: "Suspected reproductive milestone" }, { value: "shed-observation", label: "Shed observation" }, { value: "gravid-observation", label: "Gravid observation" }, { value: "laying-observation", label: "Laying observation" }, { value: "recovery-check", label: "Recovery check" }, { value: "incubation-check", label: "Incubation check" }, { value: "hatch-observation", label: "Hatch observation" }, { value: "decision", label: "Keeper decision" }
];;
export const todayDateKey = () => new Date().toISOString().slice(0,10);
export const makeBreedingId = (prefix: string) => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}`;
