import { getAuth, type User } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, updateDoc } from "firebase/firestore";
import app from "../firebase/config";
import packageJson from "../../package.json";
import type { UserProfile } from "../context/AuthContextValue";
import { parseUserProfile } from "../lib/authProfileParser";

const db=getFirestore(app);
const OWNER_EMAIL="tinytitans.exotics@gmail.com";
type CreatorReconcileResponse={success?:boolean;creator?:boolean;refreshRequired?:boolean};

export async function loadUserProfile(user:User):Promise<UserProfile|null>{
  const snapshot=await getDoc(doc(db,"users",user.uid));
  if(!snapshot.exists())return null;
  return parseUserProfile(snapshot.data(),user);
}

export async function reconcileCreatorCapability(user:User,profile:UserProfile|null):Promise<void>{
  const isOwner=String(user.email||"").trim().toLowerCase()===OWNER_EMAIL;
  if(!isOwner&&profile?.profileType!=="creator")return;
  try{
    const {getFunctions,httpsCallable}=await import("firebase/functions");
    const functions=getFunctions(app,"europe-west2");
    const reconcile=httpsCallable<Record<string,never>,CreatorReconcileResponse>(functions,"reconcileCreatorClaim");
    const result=await reconcile({});
    if(result.data?.refreshRequired)await getAuth(app).currentUser?.getIdToken(true);
  }catch(error){console.warn("Tiny Titans: creator capability reconciliation unavailable",error);}
}

function detectPlatform():UserProfile["platform"]{
  const ua=navigator.userAgent.toLowerCase();
  if(/iphone|ipad|ipod/.test(ua))return "iOS";
  if(/android/.test(ua))return "Android";
  if(/windows/.test(ua))return "Windows";
  if(/macintosh|mac os x/.test(ua))return "macOS";
  if(/linux/.test(ua))return "Linux";
  return "Other";
}
export async function recordUserActivity(user:User){
  try{
    await updateDoc(doc(db,"users",user.uid),{lastActiveAt:serverTimestamp(),platform:detectPlatform(),appVersion:String(packageJson.version||"unknown")});
  }catch(error){console.warn("Tiny Titans: unable to update activity timestamp",error);}
}
export async function syncAuthenticatedUser(user:User,profile:UserProfile|null){
  try{
    await reconcileCreatorCapability(user,profile);
    const refreshedProfile=await loadUserProfile(user);
    if(getAuth(app).currentUser?.uid===user.uid)return refreshedProfile;
  }catch(error){console.warn("Tiny Titans: creator capability reconciliation unavailable",error);}
  return profile;
}
