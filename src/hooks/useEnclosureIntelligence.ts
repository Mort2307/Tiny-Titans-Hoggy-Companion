import { useCallback,useEffect,useMemo,useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import type { Enclosure, EnvironmentHistoryEntry, SubstrateMixPart } from "../types/Enclosure";
import { blankEnclosure,enclosureRecordCoverage,formatRecordedAt,nextEnclosureRecord,normaliseMix,readingStatus } from "../lib/enclosureIntelligence";
import { emptyReadings,metrics,substratePresets,type EnvironmentKey } from "../config/enclosureIntelligence";

export function useEnclosureIntelligence(){
  const {id}=useParams();
  const {user,loading,profileLoading}=useAuth();
  const [snakes,setSnakes]=useState<Snake[]>([]);
  const [selectedId,setSelectedId]=useState(id??"");
  const [loadingData,setLoadingData]=useState(true);
  const [error,setError]=useState("");
  const [editingEnvironment,setEditingEnvironment]=useState<"all"|typeof metrics[number]["key"]|null>(null);
  const [readings,setReadings]=useState(emptyReadings);
  const [savingReadings,setSavingReadings]=useState(false);
  const [editingField,setEditingField]=useState<"dimensions"|"enclosureType"|"heating"|"thermostat"|"substrate"|"uvb"|"hides"|"water"|"furnishings"|"bioactive"|"maintenance"|"all"|null>(null);
  const [enclosureDraft,setEnclosureDraft]=useState<Enclosure|null>(null);
  const [mixParts,setMixParts]=useState<SubstrateMixPart[]>([]);
  const [savingEnclosure,setSavingEnclosure]=useState(false);
  const [message,setMessage]=useState("");

  const loadData=useCallback(async()=>{
    if(!user)return;
    setLoadingData(true);setError("");
    try{
      const loaded=await getUserSnakes(user.uid);
      setSnakes(loaded);
      setSelectedId((current)=>loaded.some((snake)=>snake.id===current)?current:id&&loaded.some((snake)=>snake.id===id)?id:loaded[0]?.id??"");
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to load enclosure data.");}
    finally{setLoadingData(false);}
  },[user,id]);

  useEffect(()=>{if(!user||loading||profileLoading)return;void loadData();},[user,loading,profileLoading,loadData]);

  const snake=useMemo(()=>snakes.find((item)=>item.id===selectedId)??snakes[0],[snakes,selectedId]);
  const enclosure=useMemo(()=>snake?blankEnclosure(snake):null,[snake]);
  const area=enclosure&&enclosure.length>0&&enclosure.width>0?enclosure.length*enclosure.width:0;
  const volume=area>0&&enclosure&&enclosure.height>0?area*enclosure.height:0;
  const coverage=enclosureRecordCoverage(enclosure);
  const environmentHistory=useMemo(()=>[...(enclosure?.environmentHistory??[])].sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt)),[enclosure]);
  const environmentReview=snake?metrics.filter(({key,min,max})=>readingStatus(snake.enclosure?.[key],min,max)==="check").length:0;
  const environmentCoverage=snake?metrics.filter(({key})=>typeof snake.enclosure?.[key]==="number").length:0;
  const nextBestRecord=useMemo(()=>enclosure&&snake?nextEnclosureRecord(enclosure,snake,environmentCoverage):"Build the enclosure profile first so later environment readings have context.",[enclosure,snake,environmentCoverage]);

  function openEnvironment(which:"all"|EnvironmentKey){
    if(!snake)return;
    const current={...emptyReadings};
    for(const metric of metrics){const value=snake.enclosure?.[metric.key];current[metric.key]=typeof value==="number"?String(value):"";}
    setReadings(current);setMessage("");setEditingEnvironment(which);
  }
  function updateEnclosure<K extends keyof Enclosure>(key:K,value:Enclosure[K]){setEnclosureDraft((current)=>current?{...current,[key]:value}:current);}
  function startEnclosureEdit(field:NonNullable<typeof editingField>){if(!snake)return;const current=blankEnclosure(snake);setEnclosureDraft(current);setMixParts(current.substrateMix?.length?current.substrateMix:[]);setMessage("");setEditingField(field);}
  function applySubstratePreset(preset:typeof substratePresets[number]){setMixParts(preset.parts);setEnclosureDraft((current)=>current?{...current,substrate:preset.substrate,customSubstrate:preset.name,substrateMix:preset.parts}:current);}
  function updateMix(index:number,key:keyof SubstrateMixPart,value:string){setMixParts((parts)=>parts.map((part,partIndex)=>partIndex===index?{...part,[key]:key==="percentage"?Math.max(0,Number(value)||0):value}:part));}
  function addMixPart(){setMixParts((parts)=>[...parts,{material:"",percentage:0}]);}
  function removeMixPart(index:number){setMixParts((parts)=>parts.filter((_,partIndex)=>partIndex!==index));}

  async function saveEnvironment(){
    if(!user||!snake)return;
    const values:Partial<Record<EnvironmentKey,number>>={};
    for(const metric of metrics){const raw=readings[metric.key].trim();if(!raw)continue;const value=Number(raw);if(!Number.isFinite(value)||value<0){setMessage(metric.label+" must be a valid non-negative number.");return;}values[metric.key]=value;}
    if(!Object.keys(values).length){setMessage("Enter at least one measured reading before saving.");return;}
    setSavingReadings(true);setMessage("");
    try{
      const current=blankEnclosure(snake);
      const entry:EnvironmentHistoryEntry={id:"environment-"+Date.now(),snakeId:snake.id,enclosureId:current.id,recordedAt:new Date().toISOString(),source:"manual",...values,heatingType:current.heatingType,heatingDevice:current.heatingDevice,thermostat:current.thermostat};
      const updated=await updateUserSnake(user.uid,{...snake,enclosure:{...current,...values,environmentHistory:[entry,...(current.environmentHistory??[])].slice(0,100)}});
      setSnakes((items)=>items.map((item)=>item.id===updated.id?updated:item));setEditingEnvironment(null);setMessage("Environment reading saved with its time and enclosure context.");
    }catch(reason){setMessage(reason instanceof Error?reason.message:"Unable to save environment readings.");}
    finally{setSavingReadings(false);}
  }

  async function saveEnclosure(){
    if(!user||!snake||!enclosureDraft)return;
    if(enclosureDraft.length<0||enclosureDraft.width<0||enclosureDraft.height<0){setMessage("Enclosure dimensions cannot be negative.");return;}
    const cleanMix=normaliseMix(mixParts);
    if(editingField==="substrate"&&cleanMix.length>0){
      const total=cleanMix.reduce((sum,part)=>sum+part.percentage,0);
      if(Math.round(total*10)/10!==100){setMessage("Substrate mix currently totals "+total+"%. The mix must total exactly 100%.");return;}
    }
    setSavingEnclosure(true);setMessage("");
    try{
      const updated=await updateUserSnake(user.uid,{...snake,enclosure:{...enclosureDraft,snakeId:snake.id,substrateMix:cleanMix.length?cleanMix:undefined}});
      setSnakes((items)=>items.map((item)=>item.id===updated.id?updated:item));setEditingField(null);setMessage("Enclosure profile saved.");
    }catch(reason){setMessage(reason instanceof Error?reason.message:"Unable to save the enclosure profile.");}
    finally{setSavingEnclosure(false);}
  }

  return {id,user,loading,profileLoading,snakes,selectedId,setSelectedId,loadingData,error,setError,editingEnvironment,setEditingEnvironment,readings,setReadings,savingReadings,editingField,setEditingField,enclosureDraft,setEnclosureDraft,mixParts,setMixParts,savingEnclosure,message,setMessage,snake,enclosure,area,volume,coverage,environmentHistory,environmentReview,environmentCoverage,nextBestRecord,metrics,substratePresets,loadData,openEnvironment,saveEnvironment,startEnclosureEdit,updateEnclosure,applySubstratePreset,updateMix,addMixPart,removeMixPart,saveEnclosure,formatRecordedAt};
}

