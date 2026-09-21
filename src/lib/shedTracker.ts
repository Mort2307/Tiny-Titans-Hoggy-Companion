import type { RetainedShedArea, ShedRecord, ShedStage } from "../types/Shed";

export const SHED_STAGES: ShedStage[] = ["Blue","Clear","Complete"];
export const SHED_QUALITIES = ["Perfect","Good","Partial","Difficult","Unknown"] as const;
export const SHED_STATUSES = ["Complete","Partial","Problematic"] as const;
export const RETAINED_SHED_AREAS: RetainedShedArea[] = ["Eye Cap","Head","Tail Tip","Body","Other"];
export const SHED_ASSISTANCES = ["None","Monitoring Only","Humidity Adjustment","Keeper Intervention","Veterinary Assistance"] as const;

export function todayIso(){return new Date().toISOString().slice(0,10);}
export function displayDate(iso:string){if(!iso)return "";const [year,month,day]=iso.split("-");return day&&month&&year?day+"/"+month+"/"+year:"";}
export function parseShedDate(value:string){
 const clean=value.trim().replace(/\./g,"/").replace(/-/g,"/");
 const parts=clean.split("/"); if(parts.length!==3)return null;
 const day=Number(parts[0]);const month=Number(parts[1]);let year=Number(parts[2]);
 if(year<100)year+=2000;
 if(!Number.isInteger(day)||!Number.isInteger(month)||!Number.isInteger(year)||month<1||month>12||day<1||day>31)return null;
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
 return String(year).padStart(4,"0")+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}
export function daysBetweenShedStages(from?:string,to?:string){
 if(!from||!to)return null;const a=Date.parse(from+"T00:00:00Z");const b=Date.parse(to+"T00:00:00Z");
 if(!Number.isFinite(a)||!Number.isFinite(b))return null;return Math.max(0,Math.round((b-a)/86400000));
}
export function retainedAreasFromRecord(record:ShedRecord):RetainedShedArea[]{
 if(record.retainedAreas?.length)return record.retainedAreas;
 const areas:RetainedShedArea[]=[];
 if(record.retainedEyeCaps)areas.push("Eye Cap");
 if(record.retainedTailTip)areas.push("Tail Tip");
 if(record.retainedShedArea&&record.retainedShedArea!=="None"&&record.retainedShedArea!=="Multiple Areas")areas.push(record.retainedShedArea as RetainedShedArea);
 return [...new Set(areas)];
}
export function stageLabel(stage:ShedStage){return stage==="Blue"?"🔵 Blue Phase":stage==="Clear"?"⚪ Clear Phase":"🟢 Full Shed";}
export function sortShedRecords(records:ShedRecord[]){return [...records].sort((a,b)=>(b.completedAt||b.cycleStartedAt||b.date).localeCompare(a.completedAt||a.cycleStartedAt||a.date));}
export function calculateShedSummary(records:ShedRecord[]){
 const activeCycle=records.find((record)=>record.currentStage!=="Complete"&&!record.completedAt)??null;
 const completed=records.filter((record)=>record.completedAt||record.currentStage==="Complete");
 const measured=records.filter((record)=>typeof record.shedLength==="number"&&Number.isFinite(record.shedLength)&&record.shedLength>0);
 const averageLength=measured.length?measured.reduce((sum,record)=>sum+(record.shedLength??0),0)/measured.length:0;
 const dates=completed.map((record)=>record.completedAt||record.date).filter(Boolean).sort();
 const gaps=dates.slice(1).map((date,index)=>daysBetweenShedStages(dates[index],date)).filter((value):value is number=>value!==null&&value>0);
 const averageInterval=gaps.length?gaps.reduce((sum,value)=>sum+value,0)/gaps.length:null;
 const activeDuration=activeCycle?daysBetweenShedStages(activeCycle.cycleStartedAt||activeCycle.date,todayIso()):null;
 return {activeCycle,completedCycles:completed,measured,averageLength,averageInterval,activeDuration};
}
