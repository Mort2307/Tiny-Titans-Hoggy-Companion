import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Room3DSelection } from "../types/reptileRoom3D";

export const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
export const snap=(value:number,grid=5)=>Math.round(value/grid)*grid;
export const nextId=(prefix:string)=>prefix+"-"+crypto.randomUUID();
export const snakeName=(snake:{name?:string}|undefined)=>snake?.name??"Unnamed Hoggy";
export const vivWidth=(slot:ReptileRoomSlot)=>Math.max(1,slot.w);
export const vivDepth=(slot:ReptileRoomSlot)=>Math.max(1,slot.depth??slot.h);
export const vivHeight=(slot:ReptileRoomSlot)=>Math.max(1,slot.height??45);

export type SlotTransform=ReptileRoomSlot & { rotation?:number; parentAssetId?:string|null };
export const slotRotation=(slot:ReptileRoomSlot|null)=>slot?(slot as SlotTransform).rotation??0:0;
export const slotParentAssetId=(slot:ReptileRoomSlot|null)=>slot?(slot as SlotTransform).parentAssetId??null:null;

export type NodeRef={type:"slot"|"object";id:string};
export function entityGroup(room:ReptileRoomWorkspace,node:NodeRef){
 return node.type==="slot"
   ? room.slots.find((item)=>item.id===node.id)?.stackGroupId??null
   : (room.objects??[]).find((item)=>item.id===node.id)?.stackGroupId??null;
}
export function getMovementMembers(room:ReptileRoomWorkspace,selection:NodeRef):NodeRef[]{
 const result=new Map<string,NodeRef>();
 const add=(node:NodeRef)=>{const key=node.type+":"+node.id;if(!result.has(key))result.set(key,node);};
 add(selection);
 const group=entityGroup(room,selection);
 if(group){
   room.slots.forEach((slot)=>{if(slot.stackGroupId===group)add({type:"slot",id:slot.id});});
   (room.objects??[]).forEach((object)=>{if(object.stackGroupId===group)add({type:"object",id:object.id});});
 }
 return [...result.values()];
}
export function getMovedRoom(room:ReptileRoomWorkspace,selection:Room3DSelection,dx:number,dy:number,dz:number,commit:boolean):ReptileRoomWorkspace{
 if(!selection)return room;
 const members=getMovementMembers(room,selection);
 const moveSlot=(slot:ReptileRoomSlot):ReptileRoomSlot=>({...slot,x:clamp(slot.x+dx,0,Math.max(0,(room.width??0)-vivWidth(slot))),y:clamp(slot.y+dy,0,Math.max(0,(room.depth??0)-vivDepth(slot))),z:clamp(slot.z+dz,0,Math.max(0,(room.height??0)-vivHeight(slot)))});
 const moveObject=(object:ReptileRoomObject):ReptileRoomObject=>({...object,x:clamp(object.x+dx,0,Math.max(0,(room.width??0)-object.width)),y:clamp(object.y+dy,0,Math.max(0,(room.depth??0)-object.depth)),z:clamp(object.z+dz,0,Math.max(0,(room.height??0)-object.height))});
 const slotIds=new Set(members.filter((item)=>item.type==="slot").map((item)=>item.id));
 const objectIds=new Set(members.filter((item)=>item.type==="object").map((item)=>item.id));
 return {...room,slots:room.slots.map((slot)=>slotIds.has(slot.id)?moveSlot(slot):slot),objects:(room.objects??[]).map((object)=>objectIds.has(object.id)?moveObject(object):object),updatedAt:commit?new Date().toISOString():room.updatedAt};
}
export function latestDate(...dates:Array<string|undefined>){return dates.filter(Boolean).map((date)=>date as string).filter((date)=>Number.isFinite(Date.parse(date))).sort((a,b)=>Date.parse(b)-Date.parse(a))[0];}
export function heatingTypeForKind(kind:string,fallback:"Heat Mat"|"CHE"|"Halogen"|"Deep Heat Projector"|"Radiant Heat Panel"|"Other"){
 if(kind==="heat-mat")return"Heat Mat";if(kind==="che")return"CHE";if(kind==="halogen"||kind==="basking-light")return"Halogen";if(kind==="dhp")return"Deep Heat Projector";if(kind==="rhp")return"Radiant Heat Panel";return fallback;
}
