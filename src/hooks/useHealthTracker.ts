import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { HealthEventType, HealthRecord, HealthStatus, MedicationAdministration } from "../types/Health";
import type { Snake } from "../types/Snake";
import { getSnakeHealthRecords,deleteSnakeHealthRecord,saveSnakeHealthRecord,recordMedicationAdministration,cancelMedicationSchedule } from "../services/healthService";
import { getUserSnakes } from "../services/snakeService";
import { generateId } from "../utils/generateId";
import { browserTimezone,healthToday } from "../lib/healthTracker";

export function useHealthTracker(){
  const {id:routeSnakeId}=useParams();
  const [searchParams,setSearchParams]=useSearchParams();
  const {user,loading,profileLoading}=useAuth();
  const [snakes,setSnakes]=useState<Snake[]>([]); const [snakeId,setSnakeId]=useState(""); const [records,setRecords]=useState<HealthRecord[]>([]);
  const [eventType,setEventType]=useState<HealthEventType>("Observation"); const [status,setStatus]=useState<HealthStatus>("Monitoring"); const [date,setDate]=useState(healthToday()); const [title,setTitle]=useState(""); const [description,setDescription]=useState(""); const [vetName,setVetName]=useState(""); const [followUpDate,setFollowUpDate]=useState(""); const [notes,setNotes]=useState("");
  const [medicationName,setMedicationName]=useState(""); const [dose,setDose]=useState(""); const [frequency,setFrequency]=useState<NonNullable<HealthRecord["medicationSchedule"]>["frequency"]>("daily"); const [firstDoseAt,setFirstDoseAt]=useState(""); const [intervalHours,setIntervalHours]=useState("24"); const [remindersEnabled,setRemindersEnabled]=useState(true);
  const [editingId,setEditingId]=useState<string|null>(null); const [deleteTarget,setDeleteTarget]=useState<HealthRecord|null>(null); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  const selectedSnake=useMemo(()=>snakes.find((snake)=>snake.id===snakeId),[snakes,snakeId]);
  const medicationRecords=useMemo(()=>records.filter((record)=>record.eventType==="Medication"&&record.medicationSchedule?.enabled),[records]);

  useEffect(()=>{ if(loading||profileLoading||!user)return; void getUserSnakes(user.uid).then((loaded)=>{ setSnakes(loaded); setSnakeId((current)=>routeSnakeId&&loaded.some((snake)=>snake.id===routeSnakeId)?routeSnakeId:loaded.some((snake)=>snake.id===current)?current:loaded[0]?.id??""); }).catch(()=>setMessage("Unable to load your animals.")); },[loading,profileLoading,routeSnakeId,user]);
  useEffect(()=>{ if(!user||!snakeId)return; void getSnakeHealthRecords(user.uid,snakeId).then(setRecords).catch(()=>setMessage("Unable to load health records.")); },[snakeId,user]);

  const reset=()=>{ setEditingId(null); setEventType("Observation"); setStatus("Monitoring"); setDate(healthToday()); setTitle(""); setDescription(""); setVetName(""); setFollowUpDate(""); setNotes(""); setMedicationName(""); setDose(""); setFrequency("daily"); setFirstDoseAt(""); setIntervalHours("24"); setRemindersEnabled(true); };
  const edit=(record:HealthRecord)=>{ setEditingId(record.id); setEventType(record.eventType); setStatus(record.status); setDate(record.date); setTitle(record.title); setDescription(record.description); setVetName(record.vetName??""); setFollowUpDate(record.followUpDate??""); setNotes(record.notes??""); const schedule=record.medicationSchedule; setMedicationName(schedule?.medicationName??record.medication??""); setDose(schedule?.dose??record.dosage??""); setFrequency(schedule?.frequency??"daily"); setFirstDoseAt(schedule?.nextDueAt?schedule.nextDueAt.slice(0,16):""); setIntervalHours(String(schedule?.intervalHours??24)); setRemindersEnabled(schedule?.reminderEnabled!==false); window.scrollTo({top:0,behavior:"smooth"}); };
  useEffect(()=>{ const recordId=searchParams.get("record"); if(!recordId||records.length===0)return; const record=records.find((item)=>item.id===recordId); if(!record)return; queueMicrotask(()=>{ edit(record); setMessage("Opened from the Life Timeline. You are editing this exact health record."); requestAnimationFrame(()=>document.getElementById("health-record")?.scrollIntoView({behavior:"smooth",block:"center"})); setSearchParams((current)=>{current.delete("record");return current;},{replace:true}); }); },[records,searchParams,setSearchParams]);
  useEffect(()=>{ if(!user||!snakeId||searchParams.get("action")!=="log")return; queueMicrotask(()=>{ reset(); setMessage("Tiny Titans opened the health & vet log because this is the next supported keeper action."); requestAnimationFrame(()=>document.getElementById("health-record")?.scrollIntoView({behavior:"smooth",block:"center"})); setSearchParams((current)=>{current.delete("action");return current;},{replace:true}); }); },[searchParams,setSearchParams,snakeId,user]);

  async function submit(event:React.FormEvent){
    event.preventDefault(); if(!user||!snakeId)return;
    if(!title.trim()||!description.trim()){setMessage("Describe what happened so the record is useful later.");return;}
    if(eventType==="Medication"&&(!medicationName.trim()||!dose.trim()||!firstDoseAt)){setMessage("Medication records need the medication, dose and first due time so reminders can work reliably.");return;}
    setBusy(true); setMessage("");
    try{
      const medicationSchedule=eventType==="Medication"?{enabled:true,medicationName:medicationName.trim(),dose:dose.trim(),frequency,...(frequency==="custom"?{intervalHours:Number(intervalHours)}:{}),administrationTimes:[],startDate:date,...(followUpDate?{endDate:followUpDate}:{}),timezone:browserTimezone(),reminderEnabled:remindersEnabled,...(followUpDate?{followUpDate}:{}),nextDueAt:new Date(firstDoseAt).toISOString()}:undefined;
      const saved=await saveSnakeHealthRecord(user.uid,{id:editingId??generateId(),snakeId,date,eventType,status,title:title.trim(),description:description.trim(),...(eventType==="Medication"?{medication:medicationName.trim(),dosage:dose.trim(),medicationSchedule,reminderState:"active" as const}:{}),...(vetName.trim()?{vetName:vetName.trim()}:{}),...(followUpDate?{followUpDate}:{}),...(notes.trim()?{notes:notes.trim()}:{} )});
      const wasEditing=Boolean(editingId); const wasMedication=eventType==="Medication";
      setRecords((current)=>[saved,...current.filter((record)=>record.id!==saved.id)].sort((a,b)=>b.date.localeCompare(a.date))); reset(); setMessage(wasEditing?"Health record updated.":wasMedication?"Medication schedule saved. Tiny Titans will generate due and follow-up notifications when notifications are enabled.":"Health record saved. This is a record, not a diagnosis.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to save this health record.");}finally{setBusy(false);}
  }
  async function medicationAction(record:HealthRecord,statusValue:MedicationAdministration["status"]){
    if(!user||!record.medicationSchedule?.nextDueAt)return; setBusy(true); setMessage("");
    try{ const administration:MedicationAdministration={id:"dose-"+record.medicationSchedule.nextDueAt,scheduledFor:record.medicationSchedule.nextDueAt,administeredAt:statusValue==="given"?new Date().toISOString():undefined,status:statusValue}; const saved=await recordMedicationAdministration(user.uid,record,administration); setRecords((current)=>current.map((item)=>item.id===saved.id?saved:item)); setMessage(statusValue==="given"?"Dose recorded for "+(selectedSnake?.name??"your snake")+".":"Dose marked as skipped."); }catch(error){setMessage(error instanceof Error?error.message:"Unable to record the medication dose.");}finally{setBusy(false);}
  }
  async function stopMedication(record:HealthRecord){ if(!user)return; setBusy(true); try{const saved=await cancelMedicationSchedule(user.uid,record);setRecords((current)=>current.map((item)=>item.id===saved.id?saved:item));setMessage("Medication reminders stopped. The health record remains in the timeline.");}catch(error){setMessage(error instanceof Error?error.message:"Unable to stop medication reminders.");}finally{setBusy(false);} }
  async function remove(){ if(!user||!deleteTarget)return; setBusy(true); try{await deleteSnakeHealthRecord(user.uid,deleteTarget.snakeId,deleteTarget.id);setRecords((current)=>current.filter((record)=>record.id!==deleteTarget.id));const wasEditing=editingId===deleteTarget.id;setDeleteTarget(null);if(wasEditing)reset();setMessage("Health record deleted.");}catch(error){setMessage(error instanceof Error?error.message:"Unable to delete this health record.");}finally{setBusy(false);} }

  return {user,loading,profileLoading,snakes,snakeId,setSnakeId,records,eventType,setEventType,status,setStatus,date,setDate,title,setTitle,description,setDescription,vetName,setVetName,followUpDate,setFollowUpDate,notes,setNotes,medicationName,setMedicationName,dose,setDose,frequency,setFrequency,firstDoseAt,setFirstDoseAt,intervalHours,setIntervalHours,remindersEnabled,setRemindersEnabled,editingId,deleteTarget,setDeleteTarget,message,busy,selectedSnake,medicationRecords,reset,edit,submit,medicationAction,stopMedication,remove};
}