import type { FeedingRecord } from "../types/Feeding";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { dateMs, daysAgo } from "./dateCalculations";

export type SmartSummaryTone = "neutral" | "watch" | "attention";
export type SmartSummaryCategory = "weight" | "feeding" | "shedding" | "husbandry" | "behaviour" | "health" | "data";
export type SmartSummarySignal = {
  id: string; category: SmartSummaryCategory; tone: SmartSummaryTone;
  confidence: "High" | "Moderate" | "Low" | "Insufficient";
  title: string; reason: string; actionLabel: string; route: string;
};

export type SnakeProfileSmartSummaryData = {
  ws: Array<WeightRecord & { grams: number }>;
  fs: FeedingRecord[];
  ss: Snake["shedHistory"];
  current: number | null;
  delta: number | null;
  signals: SmartSummarySignal[];
  reviewCount: number;
  priority?: SmartSummarySignal;
  coverage: number;
  feedMedian: number | null;
  shedMedian: number | null;
};

export function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function intervals(records: Array<{ date: string }>): number[] {
  const dates = records.map((record) => dateMs(record.date)).filter((value): value is number => value !== null).sort((a, b) => a - b);
  return dates.slice(1).map((value, index) => Math.round((value - dates[index]) / 86_400_000)).filter((value) => value > 0);
}

export function normaliseWeightHistory(history: WeightRecord[]) {
  return [...history]
    .map((record) => ({ ...record, grams: record.unit === "kg" ? record.weight * 1000 : record.weight }))
    .filter((record) => Number.isFinite(record.grams) && record.grams > 0 && dateMs(record.date) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function signalLabel(tone: SmartSummaryTone) { return tone === "attention" ? "Action worth taking" : tone === "watch" ? "Worth checking" : "Building baseline"; }
function signalIcon(tone: SmartSummaryTone) { return tone === "attention" ? "🔴" : tone === "watch" ? "🟠" : "⚪"; }
function signalRoute(category: SmartSummaryCategory, id: string) {
  return category === "weight" ? `/weights/${id}` : category === "feeding" ? `/feeding/${id}` : category === "shedding" ? `/shedding/${id}` : category === "husbandry" ? `/husbandry/${id}` : category === "behaviour" ? `/behaviour/${id}` : category === "health" ? `/health/${id}` : `/snakes/${id}/edit`;
}

export function buildSignals(snake: Snake, now: Date, feedings: FeedingRecord[]): SmartSummarySignal[] {
  const result: SmartSummarySignal[] = [];
  const ws = normaliseWeightHistory(snake.weightHistory ?? []);
  const ss = [...(snake.shedHistory ?? [])].filter((record) => dateMs(record.date) !== null).sort((a, b) => b.date.localeCompare(a.date));
  if (ss[0] && (ss[0].status === "Problematic" || ss[0].status === "Partial")) result.push({ id:"shed-status", category:"shedding", tone:"attention", confidence:ss.length >= 2 ? "Moderate" : "Low", title:"Latest shed record needs reviewing", reason:`${snake.name}'s latest shed is marked ${ss[0].status.toLowerCase()}. Tiny Titans is surfacing the recorded outcome rather than assuming a cause.`, actionLabel:"Review Shed", route:signalRoute("shedding",snake.id) });
  if (ws.length >= 3) { const latest=ws[ws.length-1].grams; const previous=ws[ws.length-2].grams; const change=previous?((latest-previous)/previous)*100:0; if(change<=-5) result.push({id:"weight-change",category:"weight",tone:"watch",confidence:ws.length>=5?"High":"Moderate",title:"Recent weight change is worth checking",reason:`The latest recorded weight is ${Math.abs(change).toFixed(1)}% lower than the previous record. A single change can have many explanations, so Tiny Titans recommends checking the records first.`,actionLabel:"Review Weight",route:signalRoute("weight",snake.id)}); }
  if (feedings.length >= 4) { const recent=feedings.slice(0,4); const refusals=recent.filter((record)=>record.response!=="Accepted").length; if(refusals>=2) result.push({id:"feeding-response",category:"feeding",tone:"watch",confidence:feedings.length>=8?"High":"Moderate",title:"Recent feeding responses are worth checking",reason:`${snake.name} has ${refusals} non-accepted responses across the latest ${recent.length} feeding records. This identifies a log pattern, not a diagnosis.`,actionLabel:"Review Feeding",route:signalRoute("feeding",snake.id)}); const base=median(intervals(feedings).slice(-6)); const gap=daysAgo(feedings[0]?.date,now); if(base!==null&&gap!==null&&gap>Math.max(base*1.75,base+7)) result.push({id:"feeding-gap",category:"feeding",tone:"watch",confidence:feedings.length>=8?"High":"Moderate",title:"Feeding interval has moved outside the personal pattern",reason:`The current gap is ${gap} days versus a personal median of ${base.toFixed(0)} days. This is a prompt to inspect the history, not a claim that something is wrong.`,actionLabel:"Review Feeding",route:signalRoute("feeding",snake.id)}); }
  if (ss.length >= 3) { const base=median(intervals(ss).slice(-6)); const gap=daysAgo(ss[0]?.date,now); if(base!==null&&gap!==null&&gap>Math.max(base*1.9,base+14)) result.push({id:"shed-gap",category:"shedding",tone:"watch",confidence:ss.length>=5?"High":"Moderate",title:"Time since the last shed is outside the recorded rhythm",reason:`The current gap is ${gap} days versus a personal median of ${base.toFixed(0)} days. Tiny Titans compares this snake with its own history rather than a generic schedule.`,actionLabel:"Review Shed",route:signalRoute("shedding",snake.id)}); }
  if (snake.enclosure?.environmentHistory?.length) { const latest=[...snake.enclosure.environmentHistory].sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))[0]; const age=daysAgo(latest?.recordedAt,now); if(age!==null&&age>30) result.push({id:"husbandry-freshness",category:"husbandry",tone:"watch",confidence:"Moderate",title:"Husbandry records could use a refresh",reason:`The latest environment entry is ${age} days old. Tiny Titans recommends checking the current setup rather than assuming the old reading still applies.`,actionLabel:"Review Husbandry",route:signalRoute("husbandry",snake.id)}); }
  if (snake.healthHistory?.length) { const latest=[...snake.healthHistory].sort((a,b)=>b.date.localeCompare(a.date))[0]; const age=daysAgo(latest?.date,now); if(age!==null&&age<=14&&latest.status!=="Recovered") result.push({id:"health-active",category:"health",tone:"watch",confidence:"Moderate",title:"Recent health record is active",reason:`A recent health entry is still marked ${String(latest.status).toLowerCase()}. Tiny Titans is surfacing the keeper's recorded status, not making a medical judgement.`,actionLabel:"Review Health",route:signalRoute("health",snake.id)}); }
  if (!ws.length && snake.weight === null) result.push({id:"missing-weight",category:"weight",tone:"neutral",confidence:"Insufficient",title:"Weight history needs a starting point",reason:"No usable weight record is available, so Tiny Titans cannot build a personal growth baseline.",actionLabel:"Record Weight",route:signalRoute("weight",snake.id)});
  if (!feedings.length) result.push({id:"missing-feeding",category:"feeding",tone:"neutral",confidence:"Insufficient",title:"Feeding history needs a starting point",reason:"No feeding record is available, so Tiny Titans cannot learn this snake's individual feeding pattern.",actionLabel:"Record Feeding",route:signalRoute("feeding",snake.id)});
  if (!ss.length) result.push({id:"missing-shed",category:"shedding",tone:"neutral",confidence:"Insufficient",title:"Shed history needs a starting point",reason:"No shed record is available, so Tiny Titans cannot learn this snake's individual shed rhythm.",actionLabel:"Record Shed",route:signalRoute("shedding",snake.id)});
  if (!snake.enclosure) result.push({id:"missing-husbandry",category:"husbandry",tone:"neutral",confidence:"Insufficient",title:"Husbandry baseline needs a record",reason:"No enclosure record is currently linked to this snake, limiting personalised husbandry context.",actionLabel:"Review Husbandry",route:signalRoute("husbandry",snake.id)});
  return result;
}

export function completeness(snake: Snake, feedingCount: number): number {
  const checks=[Boolean(snake.name&&snake.species&&snake.sex),Boolean(snake.hatchDate),Boolean(snake.arrivalDate),Boolean(snake.morphs?.length||snake.customMorph),Boolean((snake.weightHistory?.length??0)||snake.weight!==null),Boolean(feedingCount||snake.lastMealDate),Boolean(snake.shedHistory?.length),Boolean(snake.enclosure)];
  return Math.round((checks.filter(Boolean).length/checks.length)*100);
}

export function buildSmartSummary(snake: Snake, now: Date, feedings: FeedingRecord[]): SnakeProfileSmartSummaryData {
  const ws=normaliseWeightHistory(snake.weightHistory??[]);
  const ss=[...(snake.shedHistory??[])].filter((record)=>dateMs(record.date)!==null).sort((a,b)=>b.date.localeCompare(a.date));
  const current=ws.length?ws[ws.length-1].grams:snake.weight;
  const previous=ws.length>=2?ws[ws.length-2].grams:null;
  const delta=current!==null&&previous!==null?current-previous:null;
  const signals=buildSignals(snake,now,feedings);
  const rankTone=(tone:SmartSummaryTone)=>tone==="attention"?3:tone==="watch"?2:1;
  const rankConfidence=(value:SmartSummarySignal["confidence"])=>value==="High"?4:value==="Moderate"?3:value==="Low"?2:1;
  const priority=[...signals].sort((a,b)=>rankTone(b.tone)-rankTone(a.tone)||rankConfidence(b.confidence)-rankConfidence(a.confidence))[0];
  return {ws,fs:feedings,ss,current,delta,signals,reviewCount:signals.filter((signal)=>signal.tone!=="neutral").length,priority,coverage:completeness(snake,feedings.length),feedMedian:median(intervals(feedings)),shedMedian:median(intervals(ss))};
}

export const smartSummaryPresentation = { signalLabel, signalIcon };