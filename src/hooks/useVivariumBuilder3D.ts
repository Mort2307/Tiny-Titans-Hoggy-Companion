import { useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { loadVivariumTwin, saveVivariumTwin } from "../services/vivariumTwinService";
import { evaluateVivariumTwin } from "../services/vivariumTwinIntelligence";
import { DEFAULT_VIVARIUM_TWIN, type VivariumDigitalTwin } from "../types/vivariumTwin";
import { getRoomAssetPreset, REPTILE_ROOM_ASSETS } from "../data/reptileRoomAssetCatalog";
import { categoryForVivariumAsset, clampVivariumCoordinate, cloneVivariumTwin, createVivariumTwinAssetId, type VivariumCatalogAsset } from "../lib/vivariumTwinEditor";
import type { ReptileRoomSlot } from "../services/reptileRoomService";

export function useVivariumBuilder3D(slot: ReptileRoomSlot, onSaved?: (twin: VivariumDigitalTwin) => void) {
  const { user } = useAuth();
  const [twin,setTwin]=useState<VivariumDigitalTwin>(()=>cloneVivariumTwin(DEFAULT_VIVARIUM_TWIN));
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState<"build"|"checklist"|"intelligence">("build");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const intelligence=useMemo(()=>evaluateVivariumTwin(twin),[twin]);
  const selectedAsset=useMemo(()=>twin.assets.find((asset)=>asset.id===selectedId)??null,[twin.assets,selectedId]);
  const selectedPreset=useMemo(()=>selectedAsset?getRoomAssetPreset(selectedAsset.assetId):undefined,[selectedAsset]);

  function patchChecklist<K extends keyof VivariumDigitalTwin["checklist"]>(key:K,value:VivariumDigitalTwin["checklist"][K]){setTwin((current)=>({...current,checklist:{...current.checklist,[key]:value}}));}

  function addProp(asset:VivariumCatalogAsset){
    const index=twin.assets.length;
    const placement: VivariumDigitalTwin["assets"][number]["placement"] = asset.intelligenceRole === "lighting"
      ? "ceiling"
      : ["thermostat", "sensor"].includes(asset.intelligenceRole ?? "")
        ? "wall"
        : "floor";
    const next: VivariumDigitalTwin["assets"][number] = {
      id:createVivariumTwinAssetId(),assetId:asset.assetId??asset.kind,label:asset.label,category:categoryForVivariumAsset(asset),
      placement,
      x:clampVivariumCoordinate(-0.2+(index%5)*0.1,-0.42,0.42),
      y:asset.intelligenceRole==="lighting"?Math.max(0.03,(slot.height??40)/100-0.12):0.03,
      z:clampVivariumCoordinate(-0.15+(Math.floor(index/5)%4)*0.1,-0.38,0.38),rotationY:0,lockedToVivarium:true,config:asset.config?{...asset.config}: {},
    };
    setTwin((current)=>({...current,assets:[...current.assets,next]}));
    setSelectedId(next.id);
    setMessage(`${asset.label} added to this vivarium.`);
  }

  function mutateSelected(dx:number,dy:number,dz:number){
    if(!selectedAsset)return;
    setTwin((current)=>({...current,assets:current.assets.map((asset)=>asset.id===selectedAsset.id?{...asset,x:clampVivariumCoordinate(asset.x+dx,-0.46,0.46),y:Math.max(0.01,asset.y+dy),z:clampVivariumCoordinate(asset.z+dz,-0.46,0.46)}:asset)}));
  }
  function rotateSelected(degrees:number){if(!selectedAsset)return;setTwin((current)=>({...current,assets:current.assets.map((asset)=>asset.id===selectedAsset.id?{...asset,rotationY:(asset.rotationY??0)+(degrees*Math.PI)/180}:asset)}));}
  function removeSelected(){if(!selectedAsset)return;setTwin((current)=>({...current,assets:current.assets.filter((asset)=>asset.id!==selectedAsset.id)}));setSelectedId(null);setMessage(`${selectedAsset.label} removed.`);}

  async function loadExisting(){
    if(!user)return;setLoading(true);setMessage("");
    try{const loaded=await loadVivariumTwin(user.uid,slot.id);setTwin({...cloneVivariumTwin(loaded),photoUrl:loaded.photoUrl??slot.photoUrl??""});setMessage("Vivarium twin loaded.");}
    catch(error){setMessage(error instanceof Error?error.message:"Unable to load vivarium twin.");}
    finally{setLoading(false);}
  }

  async function save(){
    if(!user)return;setSaving(true);setMessage("");
    try{const next={...twin,intelligence,updatedAt:new Date().toISOString(),photoUrl:twin.photoUrl||slot.photoUrl||""} as VivariumDigitalTwin;await saveVivariumTwin(user.uid,slot.id,next);setTwin(next);setMessage("Vivarium digital twin saved.");onSaved?.(next);}
    catch(error){setMessage(error instanceof Error?error.message:"Unable to save vivarium twin.");}
    finally{setSaving(false);}
  }

  return {user,twin,setTwin,loading,saving,tab,setTab,selectedId,setSelectedId,message,intelligence,selectedAsset,selectedPreset,patchChecklist,addProp,mutateSelected,rotateSelected,removeSelected,loadExisting,save,assets:REPTILE_ROOM_ASSETS};
}