import type { CreatorUser, CreatorUserActivityBand, CreatorUserInsights } from "../types/creatorAdmin";
export const formatCreatorNumber = (value:number) => new Intl.NumberFormat("en-GB").format(value);
export function toCreatorMillis(value:CreatorUser["lastActiveAt"]):number|null {
  if(!value)return null;
  if(typeof value==="object" && value!==null && typeof value.toMillis==="function")return value.toMillis();
  const parsed=new Date(String(value)).getTime();
  return Number.isNaN(parsed)?null:parsed;
}
export function creatorActivityBand(value:CreatorUser["lastActiveAt"],now:number|null):CreatorUserActivityBand {
  const millis=toCreatorMillis(value);
  if(millis===null || now===null)return {label:"No activity signal",detail:"No usable last-active timestamp is recorded."};
  const days=Math.floor((now-millis)/86400000);
  if(days<=0)return {label:"Active today",detail:"Used Tiny Titans within the last day."};
  if(days<=7)return {label:"Active this week",detail:days+" day"+(days===1?"":"s")+" since the latest recorded activity."};
  if(days<=30)return {label:"Active this month",detail:days+" days since the latest recorded activity."};
  if(days<=90)return {label:"Cooling off",detail:days+" days since the latest recorded activity."};
  return {label:"Long inactive",detail:days+" days since the latest recorded activity."};
}
export function formatCreatorDate(value:unknown){
  if(!value)return "—";
  if(typeof value==="object" && value!==null && "toMillis" in value && typeof value.toMillis==="function")return new Date(value.toMillis()).toLocaleString("en-GB");
  const date=new Date(String(value));
  return Number.isNaN(date.getTime())?"—":date.toLocaleString("en-GB");
}
export function filterCreatorUsers(users:CreatorUser[],search:string){
  const term=search.trim().toLowerCase(); if(!term)return users;
  return users.filter((item)=>[item.displayName,item.profileType,item.category,item.experienceLevel,item.learningLevel,item.approximateLocation?.city,item.approximateLocation?.country,item.platform,item.appVersion].some((value)=>String(value??"").toLowerCase().includes(term)));
}
export function buildCreatorUserInsights(users:CreatorUser[],now:number|null):CreatorUserInsights {
  const bands={today:0,week:0,month:0,cooling:0,inactive:0,unknown:0}; let setupComplete=0,locationOn=0,analyticsOn=0,husbandryOn=0,productUpdatesOn=0;
  for(const item of users){
    if(item.setupComplete)setupComplete++; if(item.dataCollectionPreferences?.approximateLocation===true)locationOn++;
    if(item.dataCollectionPreferences?.analytics===true)analyticsOn++; if(item.dataCollectionPreferences?.communityHusbandryData===true)husbandryOn++;
    if(item.dataCollectionPreferences?.productUpdates===true)productUpdatesOn++;
    const millis=toCreatorMillis(item.lastActiveAt);
    if(millis===null || now===null){bands.unknown++;}else{const days=Math.floor((now-millis)/86400000);if(days<=0)bands.today++;else if(days<=7)bands.week++;else if(days<=30)bands.month++;else if(days<=90)bands.cooling++;else bands.inactive++;}
  }
  return {bands,setupComplete,locationOn,analyticsOn,husbandryOn,productUpdatesOn};
}