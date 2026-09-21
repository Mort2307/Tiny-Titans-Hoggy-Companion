import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useAuth } from "../../context/useAuth";
import type { ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import type { Room3DProps } from "../../types/reptileRoom3D";
import { buildRoomNavigationNodes, ROOM_NAVIGATION_SPACING_CM } from "./RoomNavigation3D";
import type { RoomNavigationNode } from "./RoomNavigation3D";
import { getRoomDimensions3D } from "./room3DScale";
import RoomScene from "./RoomScene";
import NavigationPad from "./NavigationPad";
import VivariumQuickLogDock from "./VivariumQuickLogDock";
import VivariumPhotoDock from "./VivariumPhotoDock";
import FullscreenTools from "./FullscreenTools";
type Room3DWindow = Window & { __tinyTitansRoom3DCamera?: import("three").Camera };
type VivariumPhotoChange = (slotId:string,persistedUrl:string,previewUrl?:string)=>void;
type Room3DCanvasStyle = CSSProperties & { gridColumn?: string; gridTemplateColumns?: string };

export default function Room3D({ room, className, showGrid=true, showCeiling=false, viewerMode=false, objects=[], slots=[], selectedId=null, selectedType=null, photoForSlot, telemetryForSlot, onSelect=()=>undefined, onTransformChange, onRoomChange, onSave, onTeleport }: Room3DProps) {
  const { user }=useAuth();
  const { width,depth,height }=getRoomDimensions3D(room);
  const navigationNodes=useMemo(()=>buildRoomNavigationNodes(room),[room]);
  const defaultNode=useMemo(()=>!navigationNodes.length?{id:"nav-centre",xCm:0,zCm:0}:navigationNodes.reduce((closest,node)=>Math.hypot(node.xCm,node.zCm)<Math.hypot(closest.xCm,closest.zCm)?node:closest,navigationNodes[0]),[navigationNodes]);
  const storageKey="tinyTitans.rr3d.cameraPosition:"+room.id;
  const [navigationNode,setNavigationNode]=useState<RoomNavigationNode>(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)??"null") as {xCm?:number;zCm?:number}|null;return navigationNodes.find((node)=>node.xCm===saved?.xCm&&node.zCm===saved?.zCm)??defaultNode;}catch{return defaultNode;}});
  const [isFullscreen,setIsFullscreen]=useState(false);
  const [photoOverrides,setPhotoOverrides]=useState<Record<string,string>>({});
  const [manualSaving,setManualSaving]=useState(false);
  const [manualSaveMessage,setManualSaveMessage]=useState("");
  const selectedVivarium=!viewerMode&&selectedType==="slot"?slots.find((slot)=>slot.id===selectedId)??null:null;

  useEffect(()=>{setNavigationNode((current)=>navigationNodes.find((node)=>node.xCm===current.xCm&&node.zCm===current.zCm)??defaultNode);},[defaultNode,navigationNodes]);
  useEffect(()=>{const onFullscreenChange=()=>setIsFullscreen(document.fullscreenElement!==null);document.addEventListener("fullscreenchange",onFullscreenChange);return()=>document.removeEventListener("fullscreenchange",onFullscreenChange);},[]);
  useEffect(()=>{setPhotoOverrides((current)=>{const valid=new Set(slots.map((slot)=>slot.id));const next=Object.fromEntries(Object.entries(current).filter(([id])=>valid.has(id)));return Object.keys(next).length===Object.keys(current).length?current:next;});},[slots]);
  useEffect(()=>()=>{Object.values(photoOverrides).forEach((url)=>{if(url.startsWith("blob:"))URL.revokeObjectURL(url);});},[photoOverrides]);

  const handleTeleport=(node:RoomNavigationNode)=>{setNavigationNode(node);try{localStorage.setItem(storageKey,JSON.stringify({xCm:node.xCm,zCm:node.zCm}));}catch{/* optional */}onTeleport?.(node);};
  const handlePhotoUrl:VivariumPhotoChange=(slotId,persistedUrl,previewUrl)=>{setPhotoOverrides((current)=>{const previous=current[slotId];if(previous?.startsWith("blob:")&&previous!==previewUrl)URL.revokeObjectURL(previous);if(previewUrl)return {...current,[slotId]:previewUrl};return persistedUrl?{...current,[slotId]:persistedUrl}:Object.fromEntries(Object.entries(current).filter(([id])=>id!==slotId));});};
  const effectivePhotoForSlot=(slot:ReptileRoomSlot)=>photoOverrides[slot.id]||photoForSlot?.(slot)||slot.photoUrl||undefined;
  const handleManualSave=async()=>{if(!user)return;setManualSaving(true);setManualSaveMessage("");try{await onSave?.();setManualSaveMessage("Room saved to cloud.");}catch(error){setManualSaveMessage(error instanceof Error?error.message:"Room could not be saved to cloud.");}finally{setManualSaving(false);}};
  const toggleFullscreen=async()=>{const host=document.querySelector<HTMLElement>("[data-rr3d-host="+CSS.escape(room.id)+"]");if(!host)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await host.requestFullscreen();}catch{/* normal view remains usable */}};
  const canvasPosition:[number,number,number]=[0,Math.max(.5,height*.55),Math.max(.5,depth*.28)];
  const canvasReady=({camera}:{camera:import("three").Camera})=>{(window as Room3DWindow).__tinyTitansRoom3DCamera=camera;window.dispatchEvent(new CustomEvent("tiny-titans:room3d-camera-ready"));};
  const stageStyle:Room3DCanvasStyle=viewerMode?{display:"block",width:"100%",height:"100%",minWidth:0,minHeight:0,gridColumn:"1 / -1"}:{};

  return <div data-rr3d-host={room.id} className={className} style={{position:"relative",width:"100%",height:"100%",minHeight:isFullscreen?"100vh":0,touchAction:viewerMode?"none":undefined,background:"#0a0d0f"}}>
    <div className="rr3d-stage" style={stageStyle}><Canvas shadows camera={{position:canvasPosition,fov:66,near:.01,far:Math.max(width,depth,height)*4}} dpr={[1,2]} onCreated={canvasReady} onPointerMissed={()=>onSelect(null)}><RoomScene room={room} showGrid={showGrid} showCeiling={showCeiling} viewerMode={viewerMode} objects={objects} slots={slots} selectedId={selectedId} selectedType={selectedType} photoForSlot={effectivePhotoForSlot} telemetryForSlot={telemetryForSlot} onSelect={onSelect} navigationNode={navigationNode} onTeleport={handleTeleport}/></Canvas><button type="button" className="rr3d-fullscreen-button" onClick={()=>void toggleFullscreen()} aria-label={isFullscreen?"Exit full screen":"Open full screen"} title={isFullscreen?"Exit full screen":"Open full screen"}>{isFullscreen?"⛶ Exit":"⛶ Full screen"}</button>{!viewerMode&&<NavigationPad nodes={navigationNodes} activeNode={navigationNode} onMove={handleTeleport}/>}</div>
    {!viewerMode&&selectedVivarium&&<aside className="rr3d-edge-tools" aria-label="Selected vivarium tools"><div className="rr3d-save-card"><div><span className="rr3d-control-kicker">ROOM STATE</span><strong>Digital twin</strong></div><button type="button" className="rr3d-save-room" onClick={()=>void handleManualSave()} disabled={!onSave||manualSaving}>{manualSaving?"Saving…":"Save Room"}</button>{manualSaveMessage&&<small>{manualSaveMessage}</small>}</div><VivariumQuickLogDock slot={selectedVivarium}/><VivariumPhotoDock room={room} slot={{...selectedVivarium,photoUrl:photoOverrides[selectedVivarium.id]??selectedVivarium.photoUrl}} onPhotoUrl={handlePhotoUrl} onPersistPhoto={(slotId,url)=>onTransformChange?.({type:"slot",id:slotId},{photoUrl:url})}/></aside>}
    {isFullscreen&&!viewerMode&&<FullscreenTools room={room} selectedVivarium={selectedVivarium} telemetryForSlot={telemetryForSlot} onRoomChange={onRoomChange} onVivariumChange={(patch)=>selectedVivarium&&onTransformChange?.({type:"slot",id:selectedVivarium.id},patch)} onSave={onSave} saving={manualSaving} saveMessage={manualSaveMessage} onPhotoUrl={handlePhotoUrl} onPersistPhoto={(slotId,url)=>onTransformChange?.({type:"slot",id:slotId},{photoUrl:url})}/>}
  </div>;
}
