import type { FounderApplication } from "../services/creatorService";
import type { PublicContributionEntry, PublicContributionSnapshot } from "../services/communityIntelligenceService";
import type { Snake } from "../types/Snake";
import type { PrivacyPreferences } from "../types/privacy";
import type { Feedback } from "../types/feedback";
import type { ReportIssue } from "../types/reportIssue";
import type { KeeperObservation } from "../types/keeperObservation";
import type { MorphImageSubmission, UserMorphSubmission } from "../types/morphSubmission";

export const EMPTY_CONTRIBUTION_PRIVACY: PrivacyPreferences = { consentVersion:"", communityLocation:false, anonymousAnalytics:false, communityHusbandryData:false, productUpdates:false };

export type PersonalContributionEvent = { id:string; icon:string; category:string; title:string; detail:string; status?:string; date?:unknown; link?:string; };
export type ContributionCategory = { icon:string; title:string; description:string; count:number; submitted?:number; approved?:number; open?:number; link?:string; };
export function safeNumber(value:unknown):number{return typeof value==="number"&&Number.isFinite(value)?value:0;}
export function statusOf(value:unknown):string{return typeof value==="string"&&value.trim()?value.trim():"Recorded";}
export function dateMillis(value:unknown):number{if(!value)return 0;if(typeof value==="number"&&Number.isFinite(value))return value;if(typeof value==="object"&&value!==null&&"toMillis" in value&&typeof value.toMillis==="function")return value.toMillis();const parsed=Date.parse(String(value));return Number.isFinite(parsed)?parsed:0;}
export function formatContributionDate(value:unknown):string{const millis=dateMillis(value);if(!millis)return "Date not recorded";return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(millis);}
export function isApproved(value:unknown):boolean{return ["approved","accepted","published","complete","completed"].includes(String(value??"").trim().toLowerCase());}

export function buildContributionEvents(observations:KeeperObservation[],morphSubmissions:UserMorphSubmission[],morphImages:MorphImageSubmission[],feedback:Feedback[],issues:ReportIssue[],founders:FounderApplication[],counts:{intelligenceRecords:number;weights:number;feedings:number;sheds:number;health:number}):PersonalContributionEvent[]{
 const items:PersonalContributionEvent[]=[];
 observations.forEach((item)=>{const data=item as KeeperObservation & Record<string,unknown>;items.push({id:`obs-${String(item.id)}`,icon:"🔭",category:"Behaviour Observatory",title:String(data.title||data.behaviourName||data.observationTitle||data.primaryCategory||"Behaviour observation"),detail:String(data.description||data.observation||"Keeper observation submitted to Tiny Titans."),status:statusOf(item.status),date:data.createdAt||data.submittedAt||data.updatedAt,link:"/behaviour-observatory"});});
 morphSubmissions.forEach((item)=>items.push({id:`morph-${item.id}`,icon:"🧬",category:"Morph terminology",title:String(item.submittedName||"Morph terminology submission"),detail:String(item.description||"Morph Library contribution submitted for review."),status:statusOf(item.status),date:item.createdAt,link:"/morph-library"}));
 morphImages.forEach((item)=>{const data=item as MorphImageSubmission & Record<string,unknown>;items.push({id:`morph-image-${item.id}`,icon:"🖼️",category:"Morph image",title:String(data.morphName||data.morphId||"Morph image submission"),detail:String(data.description||"Community reference image submitted to the Morph Library."),status:statusOf(data.status),date:data.createdAt||data.submittedAt||data.approvedAt,link:"/morph-library"});});
 feedback.forEach((item)=>{const data=item as Feedback & Record<string,unknown>;items.push({id:`feedback-${String(data.id||items.length)}`,icon:"💡",category:"Feedback",title:String(data.subject||data.title||"Feedback to Tiny Titans"),detail:String(data.message||data.description||"Product feedback contribution."),status:statusOf(data.status),date:data.createdAt||data.updatedAt,link:"/feedback"});});
 issues.forEach((item)=>{const data=item as ReportIssue & Record<string,unknown>;items.push({id:`bug-${String(data.id||items.length)}`,icon:"🐛",category:"Bug report",title:String(data.title||data.subject||"Bug report"),detail:String(data.description||data.details||"Bug report helping Tiny Titans improve."),status:statusOf(data.status),date:data.createdAt||data.updatedAt,link:"/my-issue-reports"});});
 founders.forEach((item)=>{const data=item as FounderApplication & Record<string,unknown>;items.push({id:`founder-${String(data.id||items.length)}`,icon:"🏆",category:"Founder",title:"Founder application",detail:"Your Founder/support contribution to Tiny Titans.",status:statusOf(data.status),date:data.createdAt||data.submittedAt,link:"/founder"});});
 if(counts.intelligenceRecords>0)items.push({id:"intelligence",icon:"🧠",category:"Community Intelligence",title:`${counts.intelligenceRecords} private tracker records contributing`,detail:`${counts.weights} weight, ${counts.feedings} feeding, ${counts.sheds} shed and ${counts.health} health records are eligible for anonymised aggregate analysis because you enabled optional husbandry contribution.`,status:"Enabled by you",link:"/account/data-privacy"});
 return items.sort((a,b)=>dateMillis(b.date)-dateMillis(a.date));
}

export function buildContributionCategories(counts:{morphLibrary:number;morphNames:number;morphImages:number;observations:number;approvedObservations:number;feedback:number;issues:number;founders:number;trackerRecords:number},morphSubmissions:UserMorphSubmission[],morphImages:MorphImageSubmission[],feedback:Feedback[],issues:ReportIssue[]):ContributionCategory[]{
 return [
  {icon:"🧬",title:"Morph Library",count:counts.morphLibrary,submitted:counts.morphLibrary,approved:morphSubmissions.filter((item)=>isApproved(item.status)).length+morphImages.filter((item)=>isApproved(item.status)).length,description:"Morph names, terminology, evidence and approved reference images.",link:"/morph-library"},
  {icon:"🔭",title:"Behaviour Observatory",count:counts.observations,submitted:counts.observations,approved:counts.approvedObservations,description:"Real-world behaviour observations shared for learning and pattern recognition.",link:"/behaviour-observatory"},
  {icon:"💡",title:"Feedback & Ideas",count:counts.feedback,submitted:counts.feedback,open:feedback.filter((item)=>!isApproved((item as Feedback & Record<string,unknown>).status)).length,description:"Ideas and product feedback that help shape Tiny Titans.",link:"/feedback"},
  {icon:"🐛",title:"Bug Reports",count:counts.issues,submitted:counts.issues,open:issues.filter((item)=>!isApproved((item as ReportIssue & Record<string,unknown>).status)).length,description:"Problems, diagnostics and reproducible reports that improve reliability.",link:"/my-issue-reports"},
  {icon:"🏆",title:"Founder / Support",count:counts.founders,submitted:counts.founders,description:"Founder applications and support activity associated with your account.",link:"/founder"},
  {icon:"🐍",title:"Keeper Records",count:counts.trackerRecords,description:"Private weight, feeding, shed and health history — tracked separately from public contributions.",link:"/snakes"},
 ];
}