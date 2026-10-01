import type { Snapshot,TileKey,DetailFilter,UserDetailFilter,OperationsDetailFilter,DrillRecord } from "../types/creatorSnapshot";
import { countBy,topEntries } from "./creatorSnapshotAnalytics";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";

export type CreatorSnapshotView={snapshot:Snapshot;tiles:Array<{key:TileKey;icon:TinyTitansIconName;value:number;label:string;detail:string}>;usersByExperience:Array<[string,number]>;usersByLearning:Array<[string,number]>;activeGrowth:{day:number;week:number;month:number};activeFilterLabel:Record<string,string>};

export function buildCreatorSnapshotView(snapshot:Snapshot):CreatorSnapshotView{
 const usersByExperience=topEntries(countBy(snapshot.users,"experienceLevel"));
 const usersByLearning=topEntries(countBy(snapshot.users,"learningLevel"));
 const activeGrowth={day:snapshot.stats.activeTodayUsers??0,week:snapshot.stats.activeWeekUsers??0,month:snapshot.stats.activeMonthUsers??0};
 const tiles:CreatorSnapshotView["tiles"]=[
  {key:"users" as const,icon:"family",value:snapshot.stats.registeredUsers,label:"Users & Consent",detail:snapshot.consent.accepted+" contributors · "+snapshot.consent.declined+" declined · "+snapshot.consent.unset+" not established"},
  {key:"snakes" as const,icon:"animals",value:snapshot.stats.snakeProfiles,label:"Snake Population",detail:(snapshot.stats.usersWithData??0)+" contributing keepers · "+(snapshot.stats.engagedUsers??0)+" engaged keepers"},
  {key:"husbandry" as const,icon:"analytics",value:snapshot.stats.mealsFed+snapshot.stats.weightLogs+snapshot.stats.shedsLogged,label:"Husbandry Activity",detail:snapshot.stats.mealsFed+" feeds · "+snapshot.stats.weightLogs+" weights · "+snapshot.stats.shedsLogged+" sheds"},
  {key:"community" as const,icon:"community",value:snapshot.stats.communityContributors??0,label:"Community & Geography",detail:snapshot.consent.location+" location-sharing accounts · consent gated"},
  {key:"mentorship" as const,icon:"mentorship",value:snapshot.mentors.published,label:"Mentor Network",detail:snapshot.mentors.accepting+" accepting · "+snapshot.mentors.activeWorkspaces+" active workspaces"},
  {key:"learning" as const,icon:"academy",value:snapshot.stats.activatedUsers??0,label:"Learning & Experience",detail:usersByLearning.length+" learning levels · "+usersByExperience.length+" experience groups"},
  {key:"genetics" as const,icon:"genetics",value:snapshot.genetics.calculations,label:"Genetics & Morphs",detail:snapshot.genetics.approvedMorphImages+" approved images · "+snapshot.community.pendingMorphs+" pending submissions"},
  {key:"operations" as const,icon:"creator",value:snapshot.community.issues+snapshot.community.feedback,label:"Community Operations",detail:snapshot.community.activeIssues+" active issues · "+snapshot.community.feedback+" feedback records"},
  {key:"data" as const,icon:"search",value:snapshot.stats.dataQualityIssues??0,label:"Data Quality",detail:(snapshot.stats.invalidWeightLogs??0)+" invalid weights · "+(snapshot.stats.invalidShedLogs??0)+" invalid sheds"},
  {key:"growth" as const,icon:"analytics",value:activeGrowth.month,label:"Adoption & Activity",detail:activeGrowth.day+" today · "+activeGrowth.week+" week · "+activeGrowth.month+" month"},
 ];
 return {snapshot,tiles,usersByExperience,usersByLearning,activeGrowth,activeFilterLabel:{all:"All records",snakes:"Keepers with snake profiles",community:"Community consent ON",declined:"Explicitly declined",unset:"Preference not established",location:"Location sharing ON",analytics:"Anonymous analytics ON",posts:"Community posts",feedback:"Feedback records",issues:"Bug / issue reports",activeIssues:"Active issues",morphs:"Morph submissions"}};
}

export function filterCreatorSnapshotRecords(snapshot:Snapshot,selected:TileKey,detailFilter:DetailFilter):DrillRecord[]{
 const base=snapshot.records[selected];if(detailFilter==="all")return base;
 if(selected==="users"){const userRecords=snapshot.records.users;const userRecordAt=(index:number)=>userRecords.find((record)=>record.id===snapshot.userIds[index]);switch(detailFilter as UserDetailFilter){
  case "snakes":return snapshot.users.map((user,index)=>Number(user.snakeCount??user.numberOfSnakes??0)>0?userRecordAt(index):undefined).filter((record):record is DrillRecord=>Boolean(record));
  case "community":return snapshot.users.map((_,index)=>snapshot.consentByUser[snapshot.userIds[index]]?.community?userRecordAt(index):undefined).filter((record):record is DrillRecord=>Boolean(record));
  case "declined":return snapshot.users.map((_,index)=>{const consent=snapshot.consentByUser[snapshot.userIds[index]];return consent?.established&&!consent.community?userRecordAt(index):undefined;}).filter((record):record is DrillRecord=>Boolean(record));
  case "unset":return snapshot.users.map((_,index)=>!snapshot.consentByUser[snapshot.userIds[index]]?.established?userRecordAt(index):undefined).filter((record):record is DrillRecord=>Boolean(record));
  case "location":return snapshot.users.map((_,index)=>snapshot.consentByUser[snapshot.userIds[index]]?.location?userRecordAt(index):undefined).filter((record):record is DrillRecord=>Boolean(record));
  case "analytics":return snapshot.users.map((_,index)=>snapshot.consentByUser[snapshot.userIds[index]]?.analytics?userRecordAt(index):undefined).filter((record):record is DrillRecord=>Boolean(record));
  default:return base;
 }}
 if(selected==="operations"){switch(detailFilter as OperationsDetailFilter){case "posts":return base.filter((record)=>record.source==="communityPosts");case "feedback":return base.filter((record)=>record.source==="feedback");case "issues":return base.filter((record)=>record.source==="issueReports");case "activeIssues":return base.filter((record)=>record.source==="issueReports"&&!record.status?.toLowerCase().match(/^(resolved|closed|archived|complete|completed)$/));case "morphs":return base.filter((record)=>record.source==="morphImageSubmissions");default:return base;}}
 return base;
}
