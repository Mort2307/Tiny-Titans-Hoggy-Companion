import { collection, getDocs, getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebase/config";
import { getCreatorFeedback, getCreatorReports, getGlobalStats, getMorphImageSubmissions } from "./creatorService";
import { getCanonicalReportIssueStatus, isActiveReportIssueStatus } from "./reportLifecycle";
import type { CreatorDashboardData, CreatorUser } from "../types/creatorAdmin";
const db = getFirestore(app);
const functions = getFunctions(app, "europe-west2");
const setCreatorClaim = httpsCallable<{ uid:string; enabled:boolean }, { success:boolean; uid:string; creator:boolean }>(functions, "setCreatorClaim");
export async function fetchCreatorDashboardData(): Promise<CreatorDashboardData> {
  const [canonicalStats, submissions, reports, feedback] = await Promise.all([getGlobalStats(), getMorphImageSubmissions(), getCreatorReports(), getCreatorFeedback()]);
  const actionableReports = reports.filter((item) => item.archived !== true && isActiveReportIssueStatus(getCanonicalReportIssueStatus(item.status)));
  return { canonicalStats, morphPending: submissions.filter((item)=>item.status==="Pending" || item.status==="NeedsInfo").length, bugPending: actionableReports.length, feedbackNew: feedback.filter((item)=>!item.status || item.status==="New").length };
}
export async function fetchCreatorUsers(): Promise<CreatorUser[]> {
  const snapshot = await getDocs(collection(db, "users"));
  const users = snapshot.docs.map((item)=>({ uid:item.id, ...(item.data() as Omit<CreatorUser,"uid">) }));
  users.sort((a,b)=>(a.displayName||"").localeCompare(b.displayName||""));
  return users;
}
export async function grantCreatorTesterAccess(uid:string) { if(!uid) throw new Error("A target account is required."); return setCreatorClaim({uid,enabled:true}); }