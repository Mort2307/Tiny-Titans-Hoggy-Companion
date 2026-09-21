import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { FounderApplication } from "./creatorService";
import type { MorphImageSubmission } from "../types/morphSubmission";

export async function getUserMorphImageSubmissions(uid:string):Promise<MorphImageSubmission[]>{
 if(!uid)return [];
 const snapshot=await getDocs(query(collection(db,"morphImageSubmissions"),where("userId","==",uid)));
 return snapshot.docs.map((item)=>({id:item.id,...(item.data() as Omit<MorphImageSubmission,"id">)}));
}

export async function getUserFounderApplications(uid:string):Promise<FounderApplication[]>{
 if(!uid)return [];
 const snapshot=await getDocs(query(collection(db,"founderApplications"),where("uid","==",uid)));
 return snapshot.docs.map((item)=>({id:item.id,...(item.data() as Omit<FounderApplication,"id">)}));
}