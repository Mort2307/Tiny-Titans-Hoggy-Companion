import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getBreedingProjects,getBreedingCycleEvents,getBreedingCyclePlan,saveBreedingCycleEvent,saveBreedingCyclePlan,saveBreedingProject } from "../services/breedingService";
import type { Snake } from "../types/Snake";
import type { BreedingProject } from "../types/Breeding";
import type { BreedingCycleEvent,BreedingCycleEventKind,BreedingCyclePhase,BreedingCyclePlan } from "../types/BreedingCycle";
import { BREEDING_CYCLE_PHASES,BREEDING_EVENT_KINDS,BREEDING_PHASE_STATUS,todayDateKey,makeBreedingId } from "../lib/breedingCycleManager";

export function useBreedingCycleManager() {
  const navigate=useNavigate();
  const { user,loading,profileLoading }=useAuth();
  const [snakes,setSnakes]=useState<Snake[]>([]);
  const [projects,setProjects]=useState<BreedingProject[]>([]);
  const [projectId,setProjectId]=useState("");
  const [events,setEvents]=useState<BreedingCycleEvent[]>([]);
  const [,setPlan]=useState<BreedingCyclePlan|null>(null);
  const [phase,setPhase]=useState<BreedingCyclePhase>("Planning");
  const [method,setMethod]=useState("");
  const [targetTemperature,setTargetTemperature]=useState("");
  const [plannedStart,setPlannedStart]=useState("");
  const [plannedEnd,setPlannedEnd]=useState("");
  const [frequency,setFrequency]=useState("Daily");
  const [equipment,setEquipment]=useState("");
  const [backupPlan,setBackupPlan]=useState("");
  const [decision,setDecision]=useState("");
  const [uncertainty,setUncertainty]=useState("");
  const [eventDate,setEventDate]=useState(todayDateKey());
  const [eventKind,setEventKind]=useState<BreedingCycleEventKind>("note");
  const [eventAnimal,setEventAnimal]=useState("");
  const [eventWeight,setEventWeight]=useState("");
  const [eventTemperature,setEventTemperature]=useState("");
  const [eventObservation,setEventObservation]=useState("");
  const [eventAction,setEventAction]=useState("");
  const [eventConcern,setEventConcern]=useState("");
  const [confidence,setConfidence]=useState<BreedingCycleEvent["confidence"]>("Unknown");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    if(loading||profileLoading||!user)return;
    void Promise.all([getUserSnakes(user.uid),getBreedingProjects(user.uid)])
      .then(([loadedSnakes,loadedProjects])=>{
        setSnakes(loadedSnakes.filter((snake)=>Boolean(snake?.id)));
        setProjects(loadedProjects);
        setProjectId((current)=>current||loadedProjects[0]?.id||"");
      })
      .catch((err)=>setError(err instanceof Error?err.message:"Unable to load breeding projects."));
  },[user,loading,profileLoading]);

  useEffect(()=>{
    if(!user||!projectId)return;
    void Promise.all([getBreedingCycleEvents(user.uid,projectId),getBreedingCyclePlan(user.uid,projectId)])
      .then(([loadedEvents,loadedPlan])=>{
        setEvents(loadedEvents);
        setPlan(loadedPlan);
        if(loadedPlan){
          setPhase(loadedPlan.currentPhase);
          setMethod(loadedPlan.method||"");
          setTargetTemperature(loadedPlan.targetTemperatureC?.toString()||"");
          setPlannedStart(loadedPlan.plannedStart||"");
          setPlannedEnd(loadedPlan.plannedEnd||"");
          setFrequency(loadedPlan.monitoringFrequency||"Daily");
          setEquipment(loadedPlan.equipment||"");
          setBackupPlan(loadedPlan.backupPlan||"");
          setDecision(loadedPlan.keeperDecision||"");
          setUncertainty(loadedPlan.uncertainty||"");
        }else{
          setPhase("Planning");setMethod("");setTargetTemperature("");setPlannedStart("");setPlannedEnd("");
          setEquipment("");setBackupPlan("");setDecision("");setUncertainty("");
        }
        setError("");
      })
      .catch((err)=>setError(err instanceof Error?err.message:"Unable to load this breeding cycle."));
  },[user,projectId]);

  const project=projects.find((item)=>item.id===projectId);
  const male=snakes.find((snake)=>snake.id===project?.maleId);
  const female=snakes.find((snake)=>snake.id===project?.femaleId);
  const currentIndex=BREEDING_CYCLE_PHASES.indexOf(phase);
  const previousPhase=BREEDING_CYCLE_PHASES[Math.max(0,currentIndex-1)];
  const nextPhase=BREEDING_CYCLE_PHASES[Math.min(BREEDING_CYCLE_PHASES.length-1,currentIndex+1)];
  const animalOptions=useMemo(()=>[male,female].filter((snake):snake is Snake=>Boolean(snake)),[male,female]);
  const concerns=events.filter((event)=>event.concern?.trim());
  const weightEvents=events.filter((event)=>typeof event.weightG==="number");
  const latestWeight=weightEvents[0]?.weightG;

  async function savePlan(nextPhase=phase){
    if(!user||!project)return;
    setSaving(true);setError("");
    const nextPlan:BreedingCyclePlan={
      projectId:project.id,currentPhase:nextPhase,
      method:method.trim()||undefined,
      targetTemperatureC:targetTemperature?Number(targetTemperature):undefined,
      plannedStart:plannedStart||undefined,plannedEnd:plannedEnd||undefined,
      monitoringFrequency:frequency,equipment:equipment.trim()||undefined,
      backupPlan:backupPlan.trim()||undefined,keeperDecision:decision.trim()||undefined,
      uncertainty:uncertainty.trim()||undefined,
    };
    try{
      await saveBreedingCyclePlan(user.uid,project.id,nextPlan);
      const status=BREEDING_PHASE_STATUS[nextPhase];
      const updatedProject:BreedingProject=status?{...project,status}:project;
      if(status&&project.status!==status)await saveBreedingProject(user.uid,updatedProject);
      setPlan(nextPlan);setPhase(nextPhase);
      setProjects((current)=>current.map((item)=>item.id===project.id?updatedProject:item));
      setMessage(`Cycle saved: ${nextPhase}.`);
    }catch(err){setError(err instanceof Error?err.message:"Unable to save the breeding cycle plan.");}
    finally{setSaving(false);}
  }

  async function addEvent(){
    if(!user||!project)return;
    if(!eventObservation.trim()&&!eventAction.trim()&&!eventConcern.trim()){
      setError("Add an observation, action or concern before saving the event.");return;
    }
    setSaving(true);setError("");
    const event:BreedingCycleEvent={
      id:makeBreedingId("cycle"),projectId:project.id,phase,kind:eventKind,date:eventDate,
      animalId:eventAnimal||undefined,weightG:eventWeight?Number(eventWeight):undefined,
      temperatureC:eventTemperature?Number(eventTemperature):undefined,
      observation:eventObservation.trim()||undefined,action:eventAction.trim()||undefined,
      concern:eventConcern.trim()||undefined,confidence,
    };
    try{
      await saveBreedingCycleEvent(user.uid,project.id,event);
      setEvents((current)=>[event,...current].sort((a,b)=>b.date.localeCompare(a.date)));
      setEventObservation("");setEventAction("");setEventConcern("");setEventWeight("");setEventTemperature("");
      setMessage("Cycle event saved.");
    }catch(err){setError(err instanceof Error?err.message:"Unable to save the cycle event.");}
    finally{setSaving(false);}
  }

  return {
    navigate,user,loading,profileLoading,snakes,projects,projectId,setProjectId,events,phase,setPhase,method,setMethod,
    targetTemperature,setTargetTemperature,plannedStart,setPlannedStart,plannedEnd,setPlannedEnd,frequency,setFrequency,
    equipment,setEquipment,backupPlan,setBackupPlan,decision,setDecision,uncertainty,setUncertainty,eventDate,setEventDate,
    eventKind,setEventKind,eventAnimal,setEventAnimal,eventWeight,setEventWeight,eventTemperature,setEventTemperature,
    eventObservation,setEventObservation,eventAction,setEventAction,eventConcern,setEventConcern,confidence,setConfidence,
    saving,error,message,project,male,female,previousPhase,nextPhase,animalOptions,concerns,latestWeight,
    currentIndex,savePlan,addEvent,phases:BREEDING_CYCLE_PHASES,eventKinds:BREEDING_EVENT_KINDS,
  };
}
