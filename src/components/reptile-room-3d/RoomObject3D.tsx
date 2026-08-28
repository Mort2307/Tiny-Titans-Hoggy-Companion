import { useEffect, useMemo, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";

type Room3DMoveHandler = (dx: number, dy: number, dz: number, commit: boolean) => void;
type RoomObject3DProps = { room: ReptileRoomWorkspace; object: ReptileRoomObject | ReptileRoomSlot; selected: boolean; onSelect: (id: string) => void; onMove?: Room3DMoveHandler; isSlot?: boolean; photoUrl?: string };
type SlotWithRotation = ReptileRoomSlot & { rotation?: number };

const woodColour = (kind: string) => kind === "oak-table" || kind === "table" ? "#8b5a2b" : kind === "teak-corner-unit" || kind === "cabinet" ? "#a66a3f" : "#5a3a24";

function dimensions(object: ReptileRoomObject | ReptileRoomSlot) {
  if ("width" in object) return { width: object.width, depth: object.depth, height: object.height };
  return { width: object.w, depth: object.depth ?? object.h, height: object.height ?? 40 };
}
function rotationFor(object: ReptileRoomObject | ReptileRoomSlot) { return "width" in object ? object.rotation ?? 0 : (object as SlotWithRotation).rotation ?? 0; }

function FurnitureModel({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const colour = woodColour(kind); const accent = selected ? "#d89a32" : "#5b6570";
  if (kind === "table" || kind === "oak-table") return <group><mesh castShadow receiveShadow position={[0, height / 2 - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} /><meshStandardMaterial color={colour} roughness={0.66} /></mesh>{[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z]) => <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x * width * 0.39, height * 0.22, z * depth * 0.39]}><boxGeometry args={[0.07, height * 0.44, 0.07]} /><meshStandardMaterial color={colour} /></mesh>)}</group>;
  if (kind === "cabinet" || kind === "teak-corner-unit") return <group><mesh castShadow receiveShadow position={[0, height / 2, 0]}><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.62} /></mesh><mesh position={[0, height / 2, depth / 2 + 0.008]}><boxGeometry args={[width * 0.92, height * 0.78, 0.018]} /><meshStandardMaterial color="#6d432c" roughness={0.5} /></mesh><mesh position={[0, height * 0.5, depth / 2 + 0.022]}><boxGeometry args={[width * 0.035, 0.035, 0.03]} /><meshStandardMaterial color={accent} metalness={0.35} /></mesh></group>;
  if (kind === "shelving" || kind === "rack") return <group>{[0.08,0.31,0.54,0.77,0.96].map((level) => <mesh key={level} castShadow receiveShadow position={[0,height*level,0]}><boxGeometry args={[width,0.045,depth]} /><meshStandardMaterial color={kind === "rack" ? "#3d4248" : colour} roughness={0.7}/></mesh>)}<mesh position={[-width*.45,height/2,0]}><boxGeometry args={[.045,height,.045]}/><meshStandardMaterial color={accent}/></mesh><mesh position={[width*.45,height/2,0]}><boxGeometry args={[.045,height,.045]}/><meshStandardMaterial color={accent}/></mesh></group>;
  if (kind === "workbench") return <group><mesh castShadow receiveShadow position={[0,height-.05,0]}><boxGeometry args={[width,.1,depth]}/><meshStandardMaterial color={colour}/></mesh>{[-1,1].map((x)=><mesh key={x} position={[x*width*.42,height/2,-depth*.42]}><boxGeometry args={[.07,height,.07]}/><meshStandardMaterial color={colour}/></mesh>)}</group>;
  return <mesh castShadow receiveShadow><boxGeometry args={[width,height,depth]}/><meshStandardMaterial color={colour} roughness={0.72}/></mesh>;
}

function VivariumModel({ width, depth, height, selected, photoUrl }: { width: number; depth: number; height: number; selected: boolean; photoUrl?: string }) {
  const frame = Math.min(width, height) * 0.045;
  const trim = selected ? "#d89a32" : "#454c53";
  const body = "#252a2e";
  const side = "#202428";
  const doorWidth = Math.max(0.01, width - frame * 2);
  const doorHeight = Math.max(0.01, height - frame * 2);
  const frontZ = depth / 2;
  return <group>
    <mesh position={[0,0,0]} castShadow receiveShadow><boxGeometry args={[width,height,depth]}/><meshStandardMaterial color={body} roughness={0.72}/></mesh>
    <mesh position={[0,0,frontZ + 0.002]}><boxGeometry args={[doorWidth,doorHeight,Math.max(frame * 0.28,0.008)]}/><meshStandardMaterial color="#b9d7df" transparent opacity={0.14} roughness={0.06} metalness={0.08} /></mesh>
    {!photoUrl && <mesh position={[0,0,frontZ + 0.014]}><planeGeometry args={[doorWidth * 0.97,doorHeight * 0.97]}/><meshBasicMaterial color="#9db8c0" transparent opacity={0.075} depthWrite={false}/></mesh>}
    {photoUrl && <VivariumPhoto url={photoUrl} width={doorWidth * 0.97} height={doorHeight * 0.97} depth={depth} />}
    <mesh position={[0,height/2-frame/2,frontZ+0.035]}><boxGeometry args={[width,frame,frame*2]}/><meshStandardMaterial color={trim} metalness={0.4}/></mesh>
    <mesh position={[0,-height/2+frame/2,frontZ+0.035]}><boxGeometry args={[width,frame,frame*2]}/><meshStandardMaterial color={trim} metalness={0.4}/></mesh>
    <mesh position={[-width/2+frame/2,0,frontZ+0.035]}><boxGeometry args={[frame,height,frame*2]}/><meshStandardMaterial color={trim} metalness={0.4}/></mesh>
    <mesh position={[width/2-frame/2,0,frontZ+0.035]}><boxGeometry args={[frame,height,frame*2]}/><meshStandardMaterial color={trim} metalness={0.4}/></mesh>
    <mesh position={[width*.38,0,frontZ+0.045]}><boxGeometry args={[frame/2,height*.7,frame*.65]}/><meshStandardMaterial color="#596169" metalness={0.6}/></mesh>
    <mesh position={[width*.38,0,frontZ+0.075]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[frame*.55,frame*.18,10,20]}/><meshStandardMaterial color="#c3c8cc" metalness={0.7}/></mesh>
    <mesh position={[0,0,-depth/2+frame/2]}><boxGeometry args={[width,height,frame]}/><meshStandardMaterial color={side} roughness={0.8}/></mesh>
    <mesh position={[-width/2+frame/2,0,0]}><boxGeometry args={[frame,height,depth]}/><meshStandardMaterial color={side} roughness={0.8}/></mesh>
    <mesh position={[width/2-frame/2,0,0]}><boxGeometry args={[frame,height,depth]}/><meshStandardMaterial color={side} roughness={0.8}/></mesh>
    <mesh position={[0,height/2-frame/2,0]}><boxGeometry args={[width,frame,depth]}/><meshStandardMaterial color={side} roughness={0.8}/></mesh>
  </group>;
}

function VivariumPhoto({ url, width, height, depth }: { url: string; width: number; height: number; depth: number }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { let active = true; const img = new Image(); img.onload = () => active && setLoaded(true); img.onerror = () => active && setLoaded(false); img.src = url; return () => { active = false; }; }, [url]);
  const texture = useMemo(() => { if (!loaded) return null; const tex = new THREE.TextureLoader().load(url); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true; return tex; }, [loaded, url]);
  if (!texture) return null;
  return <mesh position={[0,0,depth/2+0.055]} renderOrder={20} userData={{vivariumFaceImage:true}}><planeGeometry args={[width,height]}/><meshBasicMaterial map={texture} transparent opacity={0.96} toneMapped={false} depthWrite={false} depthTest={false}/></mesh>;
}

export function RoomObject3D({ room, object, selected, onSelect, onMove, isSlot=false, photoUrl }: RoomObject3DProps) {
  const size=dimensions(object);
  const position=useMemo<[number,number,number]>(()=>[cmToWorld(object.x+size.width/2)-cmToWorld(room.width??0)/2,cmToWorld((object.z??0)+size.height/2),cmToWorld(object.y+size.depth/2)-cmToWorld(room.depth??0)/2],[object.x,object.y,object.z,room.width,room.depth,size.width,size.depth,size.height]);
  const rotationY=rotationFor(object)*Math.PI/180; const bodyHeight=Math.max(.01,cmToWorld(size.height)); const bodyWidth=Math.max(.01,cmToWorld(size.width)); const bodyDepth=Math.max(.01,cmToWorld(size.depth));
  const select=(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();onSelect(object.id);};
  return <group position={position} rotation={[0,rotationY,0]} userData={{roomObjectId:object.id,isVivarium:isSlot,magLocked:Boolean(object.stackGroupId)}}>
    <mesh onPointerDown={select} onClick={select} visible={false}><boxGeometry args={[bodyWidth*1.08,bodyHeight*1.08,bodyDepth*1.08]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {isSlot ? <VivariumModel width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} photoUrl={photoUrl}/> : <FurnitureModel kind={(object as ReptileRoomObject).kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected}/>} 
    {selected && <mesh position={[0,-bodyHeight/2+.008,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[Math.max(bodyWidth,bodyDepth)*.43,Math.max(bodyWidth,bodyDepth)*.47,32]}/><meshBasicMaterial color="#d89a32" transparent opacity={.75} depthWrite={false}/></mesh>}
  </group>;
}
