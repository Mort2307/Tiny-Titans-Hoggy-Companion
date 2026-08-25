import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Snake } from "../types/Snake";
import "../styles/reptile-room-3d.css";

type Selection = { type: "slot" | "object"; id: string } | null;
type CameraSnap = -1 | 0 | 1;
type Preset = { kind: ReptileFurnitureKind | "vivarium"; label: string; icon: string; width: number; depth: number; height: number };
const PRESETS: Preset[] = [["vivarium","Vivarium","🦎",100,50,45],["rack","Rack","▤",100,55,180],["shelving","Shelving","▥",90,40,160],["table","Table","▱",120,60,75],["storage-cabinet","Storage","🗄️",90,50,120],["equipment-station","Equipment","⚡",90,50,80]].map(([kind,label,icon,width,depth,height])=>({kind:kind as Preset["kind"],label:label as string,icon:icon as string,width:width as number,depth:depth as number,height:height as number}));
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const snap=(v:number,g=5)=>Math.round(v/g)*g;
const snakeName=(s:Snake|undefined)=>s?.name??"Unnamed Hoggy";
const sw=(s:ReptileRoomSlot)=>Math.max(1,s.w);
const sd=(s:ReptileRoomSlot)=>Math.max(1,s.h);
const sh=(s:ReptileRoomSlot)=>Math.max(1,s.height??45);
const cameraYaw=(snapPoint:CameraSnap)=>snapPoint*22;
const nextRoomAssetId=(prefix:string)=>`${prefix}-${crypto.randomUUID()}`;
function Block({
  width,
  depth,
  height,
  className = "",
}: {
  width: number;
  depth: number;
  height: number;
  className?: string;
}) {
  return (
    <div
      className={`rr3d-block ${className}`}
      style={
        {
          width,
          height: depth,
          "--block-height": `${height}px`,
          "--block-depth": `${depth}px`,
        } as React.CSSProperties
      }
    >
      <i className="rr3d-block-top" />
      <i className="rr3d-block-front" />
      <i className="rr3d-block-side" />
    </div>
  );
}
function Vivarium({slot,photo,selected}:{slot:ReptileRoomSlot;photo?:string;selected:boolean}){const w=sw(slot),d=sd(slot),h=sh(slot);return <div className={`rr3d-vivarium ${selected?"is-selected":""}`} style={{width:w,height:d,"--viv-height":`${h}px`} as React.CSSProperties}><Block width={w} depth={d} height={h} className="rr3d-viv-shell"/><div className="rr3d-viv-door" style={{width:Math.max(1,w-8),height:Math.max(1,h-8)}}>{photo?<img src={photo} alt={`${slot.label} enclosure`}/>:<span>EMPTY</span>}<i/></div><div className="rr3d-viv-top" style={{width:w,height:d}}/></div>}
function Furniture({object,selected}:{object:ReptileRoomObject;selected:boolean}){return <div className={`rr3d-furniture ${selected?"is-selected":""}`} style={{width:object.width,height:object.depth,"--asset-height":`${object.height}px`} as React.CSSProperties}><Block width={object.width} depth={object.depth} height={object.height} className={`kind-${object.kind}`}/>{(object.kind==="rack"||object.kind==="shelving")&&[.2,.42,.64,.86].map(r=><i key={r} className="rr3d-shelf" style={{width:object.width*.9,transform:`translateZ(${object.height*r}px)`}}/>)}{object.kind==="table"&&<i className="rr3d-table-top" style={{width:object.width*.94,height:object.depth*.94,transform:`translateZ(${object.height}px)`}}/>}</div>}
export default function ReptileRoom3D(){
 const {user,loading,profileLoading}=useAuth();
 const [rooms,setRooms]=useState<ReptileRoomWorkspace[]>([]),[snakes,setSnakes]=useState<Snake[]>([]),[roomId,setRoomId]=useState(""),[selected,setSelected]=useState<Selection>(null),[notice,setNotice]=useState(""),[saving,setSaving]=useState(false),[yaw,setYaw]=useState(0),[pitch,setPitch]=useState(52),[zoom,setZoom]=useState(.9),[pan,setPan]=useState({x:0,y:35}),[ceiling,setCeiling]=useState(false),[cameraSnap,setCameraSnap]=useState<CameraSnap>(0),[openItem,setOpenItem]=useState<Selection>(null),[assigning,setAssigning]=useState(false);