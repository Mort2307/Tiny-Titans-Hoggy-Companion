import { collection, deleteDoc, doc, getDocs, query, setDoc } from "firebase/firestore";
import type { ShedRecord } from "../types/Shed";
import { db } from "../firebase/config";
import { resolveDataOwnerUid } from "./familyService";
function getShedCollection(uid:string,snakeId:string){return collection(db,"users",uid,"snakes",snakeId,"sheds");}
export async function getSnakeSheds(uid:string,snakeId:string):Promise<ShedRecord[]>{const dataOwnerUid=await resolveDataOwnerUid(uid);const snapshot=await getDocs(query(getShedCollection(dataOwnerUid,snakeId)));return snapshot.docs.map((shedDoc)=>({...shedDoc.data() as ShedRecord,id:shedDoc.id,snakeId} as ShedRecord)).sort((a,b)=>b.date.localeCompare(a.date));}
export async function saveSnakeShed(uid:string,shed:ShedRecord):Promise<ShedRecord>{const dataOwnerUid=await resolveDataOwnerUid(uid);const shedRef=doc(getShedCollection(dataOwnerUid,shed.snakeId),shed.id);await setDoc(shedRef,{...shed,snakeId:shed.snakeId,id:shed.id,lastModifiedBy:uid},{merge:true});return shed;}
export async function deleteSnakeShed(uid:string,snakeId:string,shedId:string):Promise<void>{const dataOwnerUid=await resolveDataOwnerUid(uid);await deleteDoc(doc(getShedCollection(dataOwnerUid,snakeId),shedId));}
