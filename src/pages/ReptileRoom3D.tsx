import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Snake } from "../types/Snake";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-room-3d.css";

type Selection = { type: "slot" | "object"; id: string } | null;
type Preset = { kind: ReptileFurnitureKind | "vivarium"; label: string; icon: string; width: number; depth: number; height: number };
const PRESETS: Preset[] = [
  ["vivarium","Vivarium","🦎",100,50,45],["rack","Rack","▤",100,55,180],["shelving","Shelving","▥",90,40,160],["table","Table","▱",120,60,75],["sofa","Sofa","🛋️",160,80,80],["chair","Chair","🪑",55,55,85],["workbench","Workbench","🔧",140,65,90],["storage-cabinet","Cabinet","🗄️",90,50,120],["plant","Plant","🪴",45,45,100],["lamp","Lamp","💡",35,35,150],["equipment-station","Equipment","⚡",90,50,80],["door","Door","🚪",90,8,205],["window","Window","🪟",120,8,80]
].map(([kind,label,icon,width,depth,height]) => ({ kind: kind as Preset["kind"], label: label as string, icon: icon as string, width: width as number, depth: depth as number, height: height as number }));
const clamp = (v:number,min:number,max:number) => Math.min(max,Math.max(min,v));
const snap = (v:number,g=5) => Math.round(v/g)*g;
const nameOf = (s:Snake|undefined) => s?.name ?? "Unnamed Hoggy";
const sw = (s:ReptileRoomSlot) => Math.max(1,s.w);
const sd = (s:ReptileRoomSlot) => Math.max(1,s.h);
const sh = (s:ReptileRoomSlot) => Math.max(1,s.height ?? 45);

function Cube({ width, depth, height, className="" }:{width:number;depth:number;height:number;className?:string}) {
  return <div className={`rr3d-cube ${className}`} style={{width,height:depth,"--cube-h":`${height}px`,"--cube-d":`${depth}px`} as React.CSSProperties}><i className="rr3d-cube-top"/><i className="rr3d-cube-front"/><i className="rr3d-cube-side"/></div>;
}
function VivModel({slot,image,selected}:{slot:ReptileRoomSlot;image?:string;selected:boolean}) {
  const w=sw(slot),d=sd(slot),h=sh(slot);
  return <div className={`rr3d-model ${selected?"is-selected":""}`} style={{width:w,height:d,"--model-h":`${h}px`} as React.CSSProperties}><Cube width={w} depth={d} height={h} className="rr3d-viv-cube"/><div className="rr3d-viv-face" style={{width:w,height:h}}>{image?<img src={image} alt="Vivarium"/>:<span>VIVARIUM</span>}</div><div className="rr3d-viv-lid" style={{width:w,height:d}}/></div>;
}
function FurnitureModel({object,selected}:{object:ReptileRoomObject;selected:boolean}) {
  const {width:w,depth:d,height:h,kind}=object;
  return <div className={`rr3d-model ${selected?"is-selected":""}`} style={{width:w,height:d,"--model-h":`${h}px`} as React.CSSProperties}><Cube width={w} depth={d} height={h} className={`rr3d-furniture-cube kind-${kind}`}/>{kind==="sofa"&&<><div className="rr3d-sofa-back"/><div className="rr3d-sofa-seat"/></>}{(kind==="rack"||kind==="shelving")&&[.22,.45,.68,.9].map(n=><div key={n} className="rr3d-shelf" style={{width:w*.92,top:d*.04,height:4,transform:`translateZ(${h*n}px)`}}/>)}{kind==="plant"&&<div className="rr3d-plant">🌿</div>}{kind==="window"&&<div className="rr3d-window"/>}{kind==="door"&&<div className="rr3d-door"/>}</div>;
}

export default function ReptileRoom3D(){
  const {user,loading,profileLoading}=useAuth();
  const [rooms,setRooms]=useState<ReptileRoomWorkspace[]>([]); const [snakes,setSnakes]=useState<Snake[]>([]); const [roomId,setRoomId]=useState(""); const [selected,setSelected]=useState<Selection>(null); const [notice,setNotice]=useState(""); const [saving,setSaving]=useState(false); const [yaw,setYaw]=useState(-32); const [pitch,setPitch]=useState(62); const [zoom,setZoom]=useState(.82); const [pan,setPan]=useState({x:0,y:45}); const [ceiling,setCeiling]=useState(false);
  const orbit=useRef<{x:number;y:number;yaw:number;pitch:number}|null>(null); const panRef=useRef<{x:number;y:number;px:number;py:number}|null>(null); const dragRef=useRef<{type:"slot"|"object";id:string;startX:number;startY:number;ox:number;oy:number}|null>(null);
  const room=useMemo(()=>rooms.find(r=>r.id===roomId)??rooms[0]??null,[rooms,roomId]); const slots=room?.slots??[]; const objects=room?.objects??[]; const snakeMap=useMemo(()=>new Map(snakes.map(s=>[s.id,s])),[snakes]);
  const width=Math.max(100,room?.width??490),depth=Math.max(100,room?.depth??315),height=Math.max(100,room?.height??245); const scale=Math.min(1.65,Math.max(.9,760/Math.max(width,depth))); const W=width*scale,D=depth*scale,H=height*scale;
  const selectedSlot=selected?.type==="slot"?slots.find(s=>s.id===selected.id)??null:null; const selectedObject=selected?.type==="object"?objects.find(o=>o.id===selected.id)??null:null;
  const persist=useCallback(async(next:ReptileRoomWorkspace[],message?:string)=>{const stamped=next.map(r=>({...r,roomVersion:Math.max(3,r.roomVersion??3),updatedAt:new Date().toISOString()}));setRooms(stamped);if(!user)return;setSaving(true);try{await saveReptileRooms(user.uid,stamped);if(message)setNotice(message);}catch{setNotice("Saved locally; cloud sync failed.");}finally{setSaving(false);}},[user]);
  const updateRoom=useCallback((fn:(r:ReptileRoomWorkspace)=>ReptileRoomWorkspace,message?:string)=>{if(room)void persist(rooms.map(r=>r.id===room.id?fn(r):r),message);},[persist,room,rooms]);
  const load=useCallback(async()=>{if(!user)return;try{const [r,s]=await Promise.all([loadReptileRooms(user.uid),getUserSnakes(user.uid)]);setRooms(r);setSnakes(s);if(r.length)setRoomId(cur=>r.some(x=>x.id===cur)?cur:r[0].id);}catch(e){setNotice(e instanceof Error?e.message:"Unable to load room.");}},[user]);
  useEffect(()=>{if(!loading&&!profileLoading&&user)void load();},[loading,profileLoading,user,load]);
  const addAsset=(p:Preset)=>{if(!room)return;const x=clamp(snap((width-p.width)/2),0,Math.max(0,width-p.width)),y=clamp(snap((depth-p.depth)/2),0,Math.max(0,depth-p.depth));if(p.kind==="vivarium"){const slot:ReptileRoomSlot={id:`viv-${Date.now()}`,snakeId:null,label:"New Vivarium",x,y,z:0,w:p.width,h:p.depth,depth:p.depth,height:p.height,lifecycleStatus:"empty",condition:"good",availability:"available",stackGroupId:null,stackIndex:0,parentSlotId:null,photoUrl:""};updateRoom(r=>({...r,slots:[...r.slots,slot]}),"Vivarium added.");setSelected({type:"slot",id:slot.id});}else{const o:ReptileRoomObject={id:`${p.kind}-${Date.now()}`,kind:p.kind as ReptileFurnitureKind,label:p.label,x,y,z:0,width:p.width,depth:p.depth,height:p.height,rotation:0,wall:null};updateRoom(r=>({...r,objects:[...(r.objects??[]),o]}),`${p.label} added.`);setSelected({type:"object",id:o.id});}};
  const moveAsset=(type:"slot"|"object",id:string,dx:number,dy:number)=>{if(type==="slot")updateRoom(r=>({...r,slots:r.slots.map(s=>s.id===id?{...s,x:clamp(snap(s.x+dx),0,Math.max(0,width-sw(s))),y:clamp(snap(s.y+dy),0,Math.max(0,depth-sd(s)))}:s)}));else updateRoom(r=>({...r,objects:(r.objects??[]).map(o=>o.id===id?{...o,x:clamp(snap(o.x+dx),0,Math.max(0,width-o.width)),y:clamp(snap(o.y+dy),0,Math.max(0,depth-o.depth))}:o)}));};
  const pointerDown=(e:ReactPointerEvent<HTMLDivElement>)=>{if(e.button===0){orbit.current={x:e.clientX,y:e.clientY,yaw,pitch};e.currentTarget.setPointerCapture(e.pointerId);}else if(e.button===1){panRef.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};e.preventDefault();}};
  const pointerMove=(e:ReactPointerEvent<HTMLDivElement>)=>{if(orbit.current){const dx=e.clientX-orbit.current.x,dy=e.clientY-orbit.current.y;setYaw(orbit.current.yaw+dx*.35);setPitch(clamp(orbit.current.pitch-dy*.3,35,82));}else if(panRef.current){setPan({x:panRef.current.px+(e.clientX-panRef.current.x),y:panRef.current.py+(e.clientY-panRef.current.y)});}};
  const pointerUp=()=>{orbit.current=null;panRef.current=null;dragRef.current=null;};
  const wheel=(e:WheelEvent<HTMLDivElement>)=>{e.preventDefault();setZoom(z=>clamp(z-(e.deltaY>0?.07:-.07),.55,1.55));};
  const onAssetDown=(e:ReactPointerEvent<HTMLDivElement>,type:"slot"|"object",id:string,x:number,y:number)=>{e.stopPropagation();setSelected({type,id});dragRef.current={type,id,startX:e.clientX,startY:e.clientY,ox:x,oy:y};e.currentTarget.setPointerCapture(e.pointerId);};
  const onAssetMove=(e:ReactPointerEvent<HTMLDivElement>)=>{const d=dragRef.current;if(!d)return;const dx=(e.clientX-d.startX)/(scale*.8),dy=(e.clientY-d.startY)/(scale*.8);moveAsset(d.type,d.id,dx,dy);dragRef.current={...d,startX:e.clientX,startY:e.clientY,ox:d.ox+dx,oy:d.oy+dy};};
  const rotate=()=>{if(!selectedObject)return;updateRoom(r=>({...r,objects:(r.objects??[]).map(o=>o.id===selectedObject.id?{...o,rotation:(o.rotation+90)%360}:o)}),"Rotated.");};
  const snapWall=()=>{if(selectedSlot){const s=selectedSlot,d=sd(s),w=sw(s);const vals=[{wall:"north" as const,v:s.y},{wall:"south" as const,v:depth-d-s.y},{wall:"west" as const,v:s.x},{wall:"east" as const,v:width-w-s.x}];const n=vals.sort((a,b)=>a.v-b.v)[0];const pos=n.wall==="north"?{x:s.x,y:0}:n.wall==="south"?{x:s.x,y:depth-d}:n.wall==="west"?{x:0,y:s.y}:{x:width-w,y:s.y};updateRoom(r=>({...r,slots:r.slots.map(x=>x.id===s.id?{...x,x:snap(pos.x),y:snap(pos.y)}:x)}),"Vivarium snapped to wall.");}else if(selectedObject){const o=selectedObject,vals=[{wall:"north" as const,v:o.y},{wall:"south" as const,v:depth-o.depth-o.y},{wall:"west" as const,v:o.x},{wall:"east" as const,v:width-o.width-o.x}],n=vals.sort((a,b)=>a.v-b.v)[0];const pos=n.wall==="north"?{x:o.x,y:0}:n.wall==="south"?{x:o.x,y:depth-o.depth}:n.wall==="west"?{x:0,y:o.y}:{x:width-o.width,y:o.y};updateRoom(r=>({...r,objects:(r.objects??[]).map(x=>x.id===o.id?{...x,x:snap(pos.x),y:snap(pos.y),wall:n.wall}:x)}),"Object snapped to wall.");}};
  const remove=()=>{if(!selected)return;updateRoom(r=>selected.type==="slot"?{...r,slots:r.slots.filter(s=>s.id!==selected.id)}:{...r,objects:(r.objects??[]).filter(o=>o.id!==selected.id)},"Removed.");setSelected(null);};
  const assign=(snakeId:string)=>{if(!selectedSlot)return;const snake=snakeMap.get(snakeId);updateRoom(r=>({...r,slots:r.slots.map(s=>s.id===selectedSlot.id?{...s,snakeId:snakeId||null,label:snake?`${nameOf(snake)}'s Vivarium`:"Empty Vivarium",photoUrl:snake?.photo??s.photoUrl??"",lifecycleStatus:snakeId?"active":"empty",availability:snakeId?"occupied":"available"}:s)}),snake?`${nameOf(snake)} assigned.`:"Vivarium cleared.");};
  if(loading||profileLoading)return <div className="rr3d-loading">Loading your reptile room…</div>;
  if(!room)return <div className="rr3d-loading"><h2>No room yet</h2><p>Create a room in the 2D builder first.</p></div>;
  const imageFor=(s:ReptileRoomSlot)=>s.photoUrl||snakeMap.get(s.snakeId??"")?.photo;
  return <main className="reptile-room-3d">
    <header className="rr3d-header"><div><span className="rr3d-kicker">TINY TITANS · ROOM SIM</span><h1>{room.name}</h1><p>{Math.round(width)} × {Math.round(depth)} × {Math.round(height)} cm · {slots.length} vivariums · {objects.length} room objects</p></div><div className="rr3d-header-actions"><button onClick={()=>setCeiling(v=>!v)}>{ceiling?"Hide ceiling":"Show ceiling"}</button><button onClick={()=>{setYaw(-32);setPitch(62);setZoom(.82);setPan({x:0,y:45});}}>Reset camera</button><button onClick={()=>setZoom(z=>clamp(z+.1,.55,1.55))}>+</button><button onClick={()=>setZoom(z=>clamp(z-.1,.55,1.55))}>−</button><span className="rr3d-saved">{saving?"Saving…":"✓ Saved"}</span></div></header>
    {notice&&<div className="rr3d-notice">{notice}</div>}
    <section className="rr3d-catalogue"><strong>Build your room</strong>{PRESETS.map(p=><button key={p.kind} onClick={()=>addAsset(p)}><b>{p.icon}</b><span>{p.label}</span></button>)}</section>
    <div className="rr3d-layout"><section className="rr3d-stage" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel}>
      <div className="rr3d-hud"><strong>3D ROOM</strong><span>Left drag orbit</span><span>Middle drag pan</span><span>Wheel zoom</span><span>Drag assets</span></div>
      <div className="rr3d-scene" style={{transform:`translate(calc(-50% + ${pan.x}px),calc(-50% + ${pan.y}px)) perspective(1500px) rotateX(${pitch}deg) rotateZ(${yaw}deg) scale(${zoom})`}}>
        <div className="rr3d-floor" style={{width:W,height:D}}/>
        <div className="rr3d-wall rr3d-wall-back" style={{width:W,height:H}}/>
        <div className="rr3d-wall rr3d-wall-left" style={{width:D,height:H}}/>
        <div className="rr3d-wall rr3d-wall-right" style={{width:D,height:H}}/>
        <div className="rr3d-wall rr3d-wall-front" style={{width:W,height:H}}/>
        {ceiling&&<div className="rr3d-ceiling" style={{width:W,height:D,transform:`translateZ(${H}px)`}}/>}
        {slots.map(s=>{const w=sw(s),d=sd(s),z=(s.z??0)*scale;return <div key={s.id} className="rr3d-asset" style={{left:(s.x+ w/2)*scale,top:(s.y+d/2)*scale,width:w*scale,height:d*scale,transform:`translate(-50%,-50%) translateZ(${z}px)`}} onPointerDown={e=>onAssetDown(e,"slot",s.id,s.x,s.y)} onPointerMove={onAssetMove}><VivModel slot={s} image={imageFor(s)} selected={selected?.type==="slot"&&selected.id===s.id}/><span className="rr3d-label">{s.label}</span></div>})}
        {objects.map(o=><div key={o.id} className="rr3d-asset" style={{left:(o.x+o.width/2)*scale,top:(o.y+o.depth/2)*scale,width:o.width*scale,height:o.depth*scale,transform:`translate(-50%,-50%) translateZ(${o.z*scale}px) rotateZ(${o.rotation}deg)`}} onPointerDown={e=>onAssetDown(e,"object",o.id,o.x,o.y)} onPointerMove={onAssetMove}><FurnitureModel object={{...o,width:o.width*scale,depth:o.depth*scale,height:o.height*scale}} selected={selected?.type==="object"&&selected.id===o.id}/><span className="rr3d-label">{o.label}</span></div>)}
      </div>
    </section>
    <aside className="rr3d-inspector">{selectedSlot?<><span className="rr3d-kicker">SELECTED VIVARIUM</span><h2>{selectedSlot.label}</h2><div className="rr3d-stat"><span>Dimensions</span><strong>{sw(selectedSlot)} × {sd(selectedSlot)} × {sh(selectedSlot)} cm</strong></div><label>Snake<select value={selectedSlot.snakeId??""} onChange={e=>assign(e.target.value)}><option value="">No snake assigned</option>{snakes.map(s=><option key={s.id} value={s.id}>{nameOf(s)}</option>)}</select></label><div className="rr3d-actions"><button onClick={snapWall}>Snap to wall</button><button onClick={()=>setSelected(null)}>Deselect</button><button className="danger" onClick={remove}>Delete</button></div></>:selectedObject?<><span className="rr3d-kicker">SELECTED OBJECT</span><h2>{selectedObject.label}</h2><div className="rr3d-stat"><span>Dimensions</span><strong>{selectedObject.width} × {selectedObject.depth} × {selectedObject.height} cm</strong></div><div className="rr3d-actions"><button onClick={snapWall}>Snap to wall</button><button onClick={rotate}>Rotate</button><button onClick={()=>setSelected(null)}>Deselect</button><button className="danger" onClick={remove}>Delete</button></div></>:<><span className="rr3d-kicker">ROOM</span><h2>{room.name}</h2><div className="rr3d-stat"><span>Dimensions</span><strong>{Math.round(width)} × {Math.round(depth)} × {Math.round(height)} cm</strong></div><div className="rr3d-stat"><span>Vivariums</span><strong>{slots.length}</strong></div><div className="rr3d-stat"><span>Room objects</span><strong>{objects.length}</strong></div><p>This is the real 3D room. Your 2D coordinates, enclosure dimensions, snake assignments and furniture are rendered here.</p></>}</aside></div>
    <BackHomeButton/>
  </main>;
}
