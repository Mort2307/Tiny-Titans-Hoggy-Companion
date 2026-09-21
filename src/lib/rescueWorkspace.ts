import type { RescueAnimal, RescueAnimalStatus, RescueCareRecordType, RescueVisibility } from "../types/rescue";
import { getRescueAccess } from "../services/rescueService";

export const STATUS_LABELS: Record<RescueAnimalStatus,string> = {
  in_care:"In care",quarantine:"Quarantine",under_observation:"Under observation",adopted:"Adopted",transferred:"Transferred",deceased:"Deceased",
};
export const RECORD_LABELS: Record<RescueCareRecordType,string> = {
  feeding:"Feeding",weight:"Weight",shed:"Shedding",health:"Health / medical",behaviour:"Behaviour",husbandry:"Husbandry",note:"General note",
};
export const VISIBILITY_LABELS: Record<RescueVisibility,string> = { public:"Public-safe",staff:"Staff only",medical:"Medical / vet" };

export function formatDate(value:string|undefined|null,includeTime=false){
  if(!value)return "—";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "—";
  return includeTime?date.toLocaleString("en-GB"):date.toLocaleDateString("en-GB");
}
export function roleLabel(role:ReturnType<typeof getRescueAccess>["role"]){
  if(!role)return "Not authorised";
  return role==="owner"?"Owner / Admin":role.charAt(0).toUpperCase()+role.slice(1);
}
export function daysBetween(a:string,b:string){
  const start=new Date(a).getTime();const end=new Date(b).getTime();
  if(!Number.isFinite(start)||!Number.isFinite(end))return null;
  return Math.round(Math.abs(end-start)/86400000);
}
export function calculateIndividualProfile(animal:RescueAnimal){
  const records=animal.careRecords||[];
  const feeds=records.filter((record)=>record.type==="feeding").sort((x,y)=>y.occurredAt.localeCompare(x.occurredAt));
  const weights=records.filter((record)=>record.type==="weight"&&typeof record.value==="number").sort((x,y)=>x.occurredAt.localeCompare(y.occurredAt));
  const sheds=records.filter((record)=>record.type==="shed").sort((x,y)=>x.occurredAt.localeCompare(y.occurredAt));
  const behaviour=records.filter((record)=>record.type==="behaviour");
  const accepted=feeds.filter((record)=>record.accepted===true).length;
  const feedRate=feeds.length?Math.round((accepted/feeds.length)*100):null;
  const lastWeight=weights.length?weights[weights.length-1].value??null:null;
  const firstWeight=weights.length?weights[0].value??null:null;
  const weightChange=firstWeight!==null&&lastWeight!==null?Number((lastWeight-firstWeight).toFixed(1)):null;
  const shedGaps=sheds.length>1?sheds.slice(1).map((event,index)=>daysBetween(sheds[index].occurredAt,event.occurredAt)).filter((value):value is number=>value!==null):[];
  const feedGaps=feeds.length>1?feeds.slice(1).map((event,index)=>daysBetween(feeds[index].occurredAt,event.occurredAt)).filter((value):value is number=>value!==null):[];
  const averageShedDays=shedGaps.length?Math.round(shedGaps.reduce((sum,value)=>sum+value,0)/shedGaps.length):null;
  const averageFeedDays=feedGaps.length?Math.round(feedGaps.reduce((sum,value)=>sum+value,0)/feedGaps.length):null;
  const confidence=records.length>=12?"Strong":records.length>=6?"Developing":records.length>=2?"Early":"Insufficient";
  const upcomingReminders=(animal.reminders||[]).filter((item)=>!item.completed&&new Date(item.dueAt).getTime()>=Date.now()).sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
  return {feeds,weights,sheds,behaviour,accepted,feedRate,lastWeight,firstWeight,weightChange,averageShedDays,averageFeedDays,confidence,upcomingReminders};
}
