import { useCallback,useEffect,useMemo,useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserSnakes,updateUserSnake } from "../services/snakeService";
import { getSnakeWeights } from "../services/weightService";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { ageInYears,growthStageForAge,husbandryReferenceBands } from "../data/husbandryReferences";
import { weightTrend } from "../lib/husbandryCare";

export function useHusbandryCare(){
  const {id}=useParams();
  const {user,loading,profileLoading}=useAuth();
  const [snakes,setSnakes]=useState<Snake[]>([]);
  const [weights,setWeights]=useState<Record<string,WeightRecord[]>>({});
  const [selectedId,setSelectedId]=useState(id??"");
  const [loadingData,setLoadingData]=useState(true);
  const [error,setError]=useState("");
  const [lengthEditing,setLengthEditing]=useState(false);
  const [lengthDraft,setLengthDraft]=useState("");
  const [lengthSaving,setLengthSaving]=useState(false);
  const [message,setMessage]=useState("");

  const loadData=useCallback(async()=>{
    if(!user)return;
    setLoadingData(true);setError("");
    try{
      const loaded=await getUserSnakes(user.uid);
      setSnakes(loaded);
      const entries=await Promise.all(loaded.map(async(snake)=>[snake.id,await getSnakeWeights(user.uid,snake.id)] as const));
      setWeights(Object.fromEntries(entries));
      setSelectedId((current)=>loaded.some((snake)=>snake.id===current)?current:id&&loaded.some((snake)=>snake.id===id)?id:loaded[0]?.id??"");
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to load husbandry data.");}
    finally{setLoadingData(false);}
  },[user,id]);

  useEffect(()=>{if(!user||loading||profileLoading)return;void loadData();},[user,loading,profileLoading,loadData]);

  const snake=useMemo(()=>snakes.find((item)=>item.id===selectedId)??snakes[0],[snakes,selectedId]);
  const history=useMemo(()=>snake?[...(weights[snake.id]??snake.weightHistory??[])].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()):[],[snake,weights]);
  const currentWeight=history[history.length-1]?.weight??snake?.weight??undefined;
  const age=snake?ageInYears(snake.hatchDate):0;
  const stage=growthStageForAge(age);
  const growth=weightTrend(history);
  const adultBand=snake?.sex==="Male"?[husbandryReferenceBands.adultObservedWeight.maleMinG,husbandryReferenceBands.adultObservedWeight.maleMaxG]:snake?.sex==="Female"?[husbandryReferenceBands.adultObservedWeight.femaleMinG,husbandryReferenceBands.adultObservedWeight.femaleMaxG]:null;
  const adultStatus=adultBand&&age>=2.5&&currentWeight!==undefined?(currentWeight>=adultBand[0]&&currentWeight<=adultBand[1]?"good":"check"):"unknown";

  async function saveLength(){
    if(!user||!snake)return;
    const value=Number(lengthDraft);
    if(!Number.isFinite(value)||value<=0||value>200){setMessage("Enter a realistic body length in centimetres.");return;}
    setLengthSaving(true);setMessage("");
    try{
      const updated=await updateUserSnake(user.uid,{...snake,lengthCm:Number(value.toFixed(1))});
      setSnakes((current)=>current.map((item)=>item.id===updated.id?updated:item));
      setLengthEditing(false);setMessage("Body length saved.");
    }catch(reason){setMessage(reason instanceof Error?reason.message:"Unable to save length.");}
    finally{setLengthSaving(false);}
  }
  function openLengthEditor(){setLengthDraft(snake?.lengthCm?.toString()??"");setLengthEditing(true);}
  return {user,loading,profileLoading,snakes,selectedId,setSelectedId,loadingData,error,loadData,lengthEditing,setLengthEditing,lengthDraft,setLengthDraft,lengthSaving,message,setMessage,snake,history,currentWeight,age,stage,growth,adultBand,adultStatus,saveLength,openLengthEditor};
}
