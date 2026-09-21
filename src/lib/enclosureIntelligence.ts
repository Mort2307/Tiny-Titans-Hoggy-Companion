import type { Enclosure } from "../types/Enclosure";
import type { Snake } from "../types/Snake";
import type { SubstrateMixPart } from "../types/Enclosure";
import { metrics } from "../config/enclosureIntelligence";

export function readingStatus(value:number|undefined,min:number,max:number) {
  if(value===undefined)return "unknown";
  return value>=min&&value<=max?"good":"check";
}

export function blankEnclosure(snake:Snake):Enclosure {
  return snake.enclosure ?? {
    id:"enclosure-"+snake.id,snakeId:snake.id,length:0,width:0,height:0,enclosureType:"",
    substrate:"Other",heatingType:"Other",uvbEnabled:false,hides:0,waterBowl:false,bioactive:false,environmentHistory:[],
  };
}

export function formatRecordedAt(value:string) {
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "Unknown time";
  return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(date);
}

export function normaliseMix(parts:SubstrateMixPart[]) {
  return parts.filter((part)=>part.material.trim()&&Number.isFinite(part.percentage)&&part.percentage>0);
}

export function nextEnclosureRecord(enclosure:Enclosure,snake:Snake,environmentCoverage:number) {
  if(!enclosure||!snake)return "Build the enclosure profile first so later environment readings have context.";
  const priorities:Array<[boolean,string]>=[
    [enclosure.length<=0||enclosure.width<=0||enclosure.height<=0,"Add the enclosure dimensions next. Tiny Titans can then calculate floor area and volume automatically."],
    [enclosure.heatingType==="Other"||!enclosure.heatingDevice,"Add the heating source next. That gives environmental readings a real equipment context."],
    [!enclosure.thermostat,"Add the thermostat next so temperature records can be interpreted alongside the recorded control setup."],
    [enclosure.substrate==="Other","Record the actual substrate next. You do not need to fill unrelated fields just to raise completeness."],
    [environmentCoverage<metrics.length,"Record the next environmental measurement when you actually take it. Never invent a value just to complete the record."],
  ];
  return priorities.find(([missing])=>missing)?.[1] ?? "Keep recording consistent readings. Repeated personal evidence is more useful than chasing a perfect completeness score.";
}

export function enclosureRecordCoverage(enclosure:Enclosure|null) {
  if(!enclosure)return {complete:0,total:0,percent:0};
  const checks=[
    enclosure.length>0,enclosure.width>0,enclosure.height>0,Boolean(enclosure.enclosureType),
    enclosure.heatingType!=="Other",Boolean(enclosure.heatingDevice),enclosure.substrate!=="Other",
    Boolean(enclosure.thermostat),enclosure.hides>0,enclosure.waterBowl,
    Boolean(enclosure.uvbEnabled||enclosure.uvbDetails),Boolean(enclosure.uvbPhotoperiodHours),
    Boolean(enclosure.plants?.length||enclosure.decorations?.length),
  ];
  const complete=checks.filter(Boolean).length;
  return {complete,total:checks.length,percent:checks.length?Math.round((complete/checks.length)*100):0};
}
