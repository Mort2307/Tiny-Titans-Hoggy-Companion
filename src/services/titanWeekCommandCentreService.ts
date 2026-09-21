import { doc,getDoc,getFirestore,setDoc } from "firebase/firestore";
import app from "../firebase/config";
import type { TitanWeeklyMetricId, WeekStartDay } from "../context/EasyNavContext";
import type { TargetMap } from "../lib/titanWeekCommandCentre";
const db=getFirestore(app);
export async function loadTitanWeekTargets(uid:string):Promise<TargetMap>{
 if(!uid)return {};
 try{const snapshot=await getDoc(doc(db,"users",uid));const preferences=snapshot.exists()?snapshot.data().easyNavPreferences as Record<string,unknown>|undefined:undefined;const stored=preferences?.weeklyTargets;if(!stored||typeof stored!=="object")return {};const parsed:TargetMap={};for(const [key,value] of Object.entries(stored as Record<string,unknown>)){if(["feed","weight","shed","health","behaviour","breeding"].includes(key)&&typeof value==="number"&&Number.isFinite(value)&&value>=0)parsed[key as TitanWeeklyMetricId]=Math.min(52,Math.floor(value));}return parsed;}catch{return {};}
}
export async function saveTitanWeekTarget(uid:string,targets:TargetMap){if(!uid)return;await setDoc(doc(db,"users",uid),{easyNavPreferences:{weeklyTargets:targets}},{merge:true});}
