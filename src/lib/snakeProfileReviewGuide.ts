import type { Snake } from "../types/Snake";
import { ageLabel, daysAgo, dateMs } from "./dateCalculations";
import { getSpeciesDiet } from "../data/feeding/speciesDiet";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";

export type ReviewAreaId = "shed" | "weight" | "feeding" | "enclosure" | "health" | "behaviour" | "master";
export type ReviewArea = { id: ReviewAreaId; label: string; icon: TinyTitansIconName; reason: string; fields: string; route: string; };
export type SnakeProfileReviewGuideData = { areas: ReviewArea[]; coverage: number; tone: "attention" | "watch" | "clear"; statusLabel: string; };

function hasRecentNonRecoveredHealth(snake: Snake, now: Date) {
  const latest=[...(snake.healthHistory??[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(!latest||latest.status==="Recovered") return false;
  const age=daysAgo(latest.date,now);
  return age!==null&&age<=30;
}

function areaPriority(areas: ReviewArea[]) {
  const order: ReviewAreaId[]=["health","weight","feeding","shed","enclosure","behaviour","master"];
  return [...areas].sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
}

export function buildSnakeProfileReviewGuide(snake: Snake, now = new Date()): SnakeProfileReviewGuideData {
  const areas:ReviewArea[]=[];
  const weightCount=snake.weightHistory?.length??0;
  const feedingCount=snake.feedingHistory?.length??0;
  const shedCount=snake.shedHistory?.length??0;
  const latestWeight=[...(snake.weightHistory??[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const latestFeeding=[...(snake.feedingHistory??[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const latestShed=[...(snake.shedHistory??[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const latestEnvironment=[...(snake.enclosure?.environmentHistory??[])].sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))[0];
  const diet=getSpeciesDiet(snake);
  const dietText=diet.recommended.length?diet.recommended.join(", "):"the actual prey item under Other";

  if(hasRecentNonRecoveredHealth(snake,now)) areas.push({id:"health",label:"Health",icon:"health",reason:"A recent health record is still active, so Tiny Titans needs the current keeper/vet outcome rather than assuming what it means.",fields:"Date, observed signs, recorded status, vet findings where applicable, treatment/medication, follow-up and outcome.",route:`/health/${snake.id}`});
  const currentWeight=latestWeight?.weight??snake.weight;
  const weightAge=daysAgo(latestWeight?.date,now);
  if(currentWeight==null||!weightCount||(weightAge!==null&&weightAge>30)) areas.push({id:"weight",label:"Weight",icon:"weight",reason:weightCount?"The latest weight is getting stale, so a current measurement would improve the growth and change trend.":"No usable weight history is available yet, so Tiny Titans cannot establish this snake personal weight baseline.",fields:"Body mass, exact date, unit and body length in cm when known; repeated measurements are especially valuable for trend analysis.",route:`/weights/${snake.id}`});
  const feedingAge=daysAgo(latestFeeding?.date,now);
  if(!feedingCount||(feedingAge!==null&&feedingAge>45)) areas.push({id:"feeding",label:"Feeding",icon:"feeding",reason:feedingCount?`The feeding history is getting stale, so the next actual meal will help re-establish this snake pattern. Species guidance currently prioritises ${dietText}.`:"No feeding history is available yet. Record the actual prey so Tiny Titans can learn this snake individual response instead of applying a rodent-only assumption.",fields:"Actual prey type, prey category, quantity, size where meaningful, single-item or total prey mass, response, feeding method, preparation and useful meal notes.",route:`/feeding/${snake.id}`});
  const shedAge=daysAgo(latestShed?.date,now);
  if(!shedCount||latestShed?.status==="Partial"||latestShed?.status==="Problematic"||(shedAge!==null&&shedAge>120)) areas.push({id:"shed",label:"Shed",icon:"shed",reason:latestShed?.status==="Partial"||latestShed?.status==="Problematic"?`The latest shed is recorded as ${latestShed.status.toLowerCase()}, so the exact outcome and surrounding conditions are worth reviewing.`:shedCount?"The shed record is getting stale, so a current shed event will improve this snake individual shed rhythm.":"No shed history is available yet, so Tiny Titans cannot establish this snake individual shed rhythm.",fields:"Shed date, complete/partial/problematic outcome, retained eye caps or tail tip, humidity/condition notes when relevant and anything unusual about the event.",route:`/shedding/${snake.id}`});
  const environmentAge=daysAgo(latestEnvironment?.recordedAt,now);
  if(!snake.enclosure||!latestEnvironment||(environmentAge!==null&&environmentAge>30)) areas.push({id:"enclosure",label:"Enclosure",icon:"enclosure",reason:snake.enclosure?"The environment record is getting stale, so a current setup and reading check would improve context around feeding, shedding and behaviour.":"No current enclosure/environment record is linked, which limits the husbandry context Tiny Titans can associate with this snake other records.",fields:"Enclosure dimensions, warm/cool temperatures, humidity, substrate, hides, water, ventilation, lighting/UVB where applicable, enrichment, equipment and relevant setup changes.",route:`/husbandry/${snake.id}`});
  const masterRecordIncomplete=!snake.species||!snake.sex||!snake.hatchDate||!snake.acquisitionDate||snake.lengthCm==null;
  if(masterRecordIncomplete) areas.push({id:"master",label:"Master Record",icon:"knowledge",reason:"Core identity or physical-reference fields are incomplete, which limits comparisons and longitudinal interpretation.",fields:"Species, sex, hatch date, arrival/acquisition date, breeder/origin, morphs/hets, body length, identifiers and important keeper notes.",route:`/snakes/${snake.id}/master-record`});

  const coverageTargets=[Boolean(snake.species&&snake.sex&&snake.hatchDate),Boolean(weightCount||snake.weight!=null),Boolean(feedingCount||snake.lastMealDate),Boolean(shedCount),Boolean(snake.enclosure),Boolean(snake.healthHistory?.length),Boolean(snake.lengthCm!=null)];
  const coverage=Math.round((coverageTargets.filter(Boolean).length/coverageTargets.length)*100);
  const orderedAreas=areaPriority(areas);
  const tone=orderedAreas.some((area)=>area.id==="health"||(area.id==="weight"&&!weightCount)||(area.id==="shed"&&latestShed?.status==="Problematic"))?"attention":orderedAreas.length?"watch":coverage<70?"watch":"clear";
  const statusLabel=tone==="attention"?"Action worth taking":tone==="watch"?"Worth checking":"Record looks healthy";
  return {areas:orderedAreas,coverage,tone,statusLabel};
}

export function buildAlwaysUsefulAreas(snake: Snake): ReviewArea[] {
  return [
    {id:"weight",label:"Weight",icon:"weight",reason:"Helps Tiny Titans measure growth/change against this snake own history.",fields:"Mass, exact date, unit and body length when known.",route:`/weights/${snake.id}`},
    {id:"feeding",label:"Feeding",icon:"feeding",reason:"Builds the individual feeding pattern and preserves the actual diet instead of guessing from generic snake defaults.",fields:"Actual prey, category, quantity, size where meaningful, mass, response, method, preparation and notes.",route:`/feeding/${snake.id}`},
    {id:"shed",label:"Shed",icon:"shed",reason:"Builds the individual shed rhythm and records whether each event completed normally.",fields:"Date, outcome, retained material and relevant environmental/context notes.",route:`/shedding/${snake.id}`},
    {id:"enclosure",label:"Enclosure",icon:"enclosure",reason:"Provides the environmental context needed to interpret feeding, shedding and behaviour.",fields:"Dimensions, temperature gradient, humidity, substrate, hides, water, ventilation, lighting/UVB and enrichment.",route:`/husbandry/${snake.id}`},
    {id:"health",label:"Health",icon:"health",reason:"Preserves observed health events without asking Tiny Titans to diagnose them.",fields:"Date, observation, recorded status, treatment/vet information, follow-up and outcome.",route:`/health/${snake.id}`},
    {id:"behaviour",label:"Behaviour",icon:"behaviour",reason:"A consistent description of what the snake actually did is more useful than a guessed interpretation.",fields:"Observed behaviour, context, frequency/duration, change from baseline and possible triggers.",route:`/behaviour/${snake.id}`},
  ];
}

export function formatReviewAge(value?: string|null,now = new Date()) { return dateMs(value)===null ? "-" : ageLabel(value,now); }