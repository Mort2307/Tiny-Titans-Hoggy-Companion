import type { Snake } from "../types/Snake";
import type { TitanWeeklyMetricId } from "../context/EasyNavContext";
import { getRecordCountForWeek, type TitanWeekRange } from "../utils/titanWeek";

export type TargetMap = Partial<Record<TitanWeeklyMetricId, number>>;
export type MetricSummary = {
  id:TitanWeeklyMetricId; label:string; icon:string; actual:number; expected:number; completion:number;
  status:"complete"|"progress"|"outstanding"|"tracked"; detail:string;
};
export type Priority = {
  id:string; title:string; detail:string; route:string; severity:"urgent"|"attention"|"info"; confidence?:number;
};
export const TARGETABLE_METRICS:TitanWeeklyMetricId[]=["feed","weight","shed","health","behaviour","breeding"];
export const WEIGHT_INTERVALS:Record<string,number>={Weekly:7,Fortnightly:14,"Every 3 Weeks":21,Monthly:30};
export const toLocalKey=(date:Date)=>date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
export function parseDateKey(key:string|null,fallback:Date){if(!key||!/^\d{4}-\d{2}-\d{2}$/.test(key))return fallback;const [year,month,day]=key.split("-").map(Number);const parsed=new Date(year,month-1,day);return Number.isFinite(parsed.getTime())?parsed:fallback;}
export function addDays(date:Date,days:number){const next=new Date(date);next.setDate(next.getDate()+days);return next;}
export function scheduleCount(anchor:string|undefined,intervalDays:number,range:TitanWeekRange){if(!anchor||intervalDays<=0)return 0;const first=new Date(anchor.slice(0,10)+"T00:00:00");if(!Number.isFinite(first.getTime()))return 0;let cursor=first;while(cursor>range.start)cursor=addDays(cursor,-intervalDays);let count=0;while(cursor<=range.end){if(cursor>=range.start)count++;cursor=addDays(cursor,intervalDays);}return count;}
export function lastTwo<T extends {date:string}>(records:T[]|undefined){return (records??[]).filter((item)=>Number.isFinite(Date.parse(item.date))).slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,2);}
export function metricRecords(snake:Snake,metric:TitanWeeklyMetricId):Array<{date:string}>|undefined{
 switch(metric){case"feed":return snake.feedingHistory;case"weight":return snake.weightHistory;case"shed":return snake.shedHistory;case"health":return snake.healthHistory;case"behaviour":return snake.timeline?.filter((event)=>event.type==="Behaviour");case"breeding":return snake.breedingHistory?.map((item)=>({date:item.pairingDate}));default:return undefined;}
}
export function countMetric(snake:Snake,metric:TitanWeeklyMetricId,range:TitanWeekRange){return getRecordCountForWeek(metricRecords(snake,metric),range);}
export function intelligentExpected(snake:Snake,metric:TitanWeeklyMetricId,range:TitanWeekRange){
 if(metric==="feed"&&snake.feedingSchedule?.enabled)return scheduleCount(snake.feedingSchedule.nextFeedingDate,Math.max(1,snake.feedingSchedule.intervalDays),range);
 if(metric==="weight"&&snake.weightTracking?.enabled&&snake.lastWeighedDate)return scheduleCount(snake.lastWeighedDate,WEIGHT_INTERVALS[snake.weightTracking.frequency]??7,range);
 return 0;
}
export function actionRoute(metric:TitanWeeklyMetricId,snakeId?:string){
 const encoded=snakeId?encodeURIComponent(snakeId):"";
 switch(metric){case"feed":return snakeId?"/snakes/"+encoded+"/feeding?action=log":"/feeding";case"weight":return snakeId?"/snakes/"+encoded+"/weights?action=log":"/weights";case"shed":return snakeId?"/snakes/"+encoded+"/shedding":"/shedding";case"health":return snakeId?"/snakes/"+encoded+"/health":"/health";case"behaviour":return snakeId?"/snakes/"+encoded+"/behaviour":"/behaviour";case"breeding":return"/breeding";case"reminders":return"/reminders";case"intelligence":return"/titan-intelligence";}
}
export function makeCurrentPriorities(snakes:Snake[],intelligenceAccess:boolean,decision:{id:string;title:string;animalName?:string;reason:string;destination?:string;score:number;confidence:number}|null):Priority[]{
 const today=toLocalKey(new Date());const priorities:Priority[]=[];
 if(intelligenceAccess&&decision)priorities.push({id:"decision-"+decision.id,title:decision.title,detail:(decision.animalName??"Your Titan")+": "+decision.reason,route:decision.destination||"/titan-intelligence",severity:decision.score>=80?"urgent":"attention",confidence:decision.confidence});
 for(const snake of snakes){
  const feed=snake.feedingSchedule;if(feed?.enabled&&feed.nextFeedingDate){const next=feed.nextFeedingDate.slice(0,10);if(next<today)priorities.push({id:"feed-"+snake.id,title:snake.name+" is overdue on the recorded feeding schedule",detail:"The next scheduled feed date ("+next+") has passed. This is a schedule signal, not a health judgement.",route:actionRoute("feed",snake.id),severity:"urgent"});else if(next===today)priorities.push({id:"feed-today-"+snake.id,title:snake.name+" is due for a feed today",detail:"The keeper's recorded feeding schedule points to today.",route:actionRoute("feed",snake.id),severity:"attention"});}
  if(snake.weightTracking?.enabled&&snake.lastWeighedDate){const interval=WEIGHT_INTERVALS[snake.weightTracking.frequency]??7;const due=addDays(new Date(snake.lastWeighedDate.slice(0,10)+"T00:00:00"),interval);if(toLocalKey(due)<today)priorities.push({id:"weight-"+snake.id,title:snake.name+" is due a weight check",detail:"Based on the recorded "+snake.weightTracking.frequency.toLowerCase()+" interval.",route:actionRoute("weight",snake.id),severity:"attention"});}
  const followUp=(snake.healthHistory??[]).filter((item)=>item.followUpDate&&item.followUpDate<=today&&item.status!=="Recovered").sort((a,b)=>String(a.followUpDate).localeCompare(String(b.followUpDate)))[0];
  if(followUp)priorities.push({id:"health-"+snake.id,title:snake.name+" has a recorded health follow-up due",detail:"Review “"+followUp.title+"” and the keeper's recorded follow-up plan.",route:actionRoute("health",snake.id),severity:"urgent"});
  const feeding=lastTwo(snake.feedingHistory);
  if(feeding.length===2&&snake.feedingSchedule?.intervalDays){const gap=Math.round((Date.parse(feeding[0].date)-Date.parse(feeding[1].date))/86400000);if(gap>snake.feedingSchedule.intervalDays*1.5)priorities.push({id:"gap-"+snake.id,title:snake.name+" has an unusually long recorded feeding gap",detail:gap+" days between the two latest recorded feeds versus the "+snake.feedingSchedule.intervalDays+"-day recorded schedule interval. More context may be needed before changing the routine.",route:actionRoute("feed",snake.id),severity:"attention"});}
 }
 const rank={urgent:3,attention:2,info:1};return priorities.sort((a,b)=>rank[b.severity]-rank[a.severity]).slice(0,6);
}
