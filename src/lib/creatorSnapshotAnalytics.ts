import type { UserRecord, DrillRecord } from "../types/creatorSnapshot";

export const fmt=(value:number)=>new Intl.NumberFormat("en-GB").format(value);
export const pct=(value:number,total:number)=>total>0?Math.round((value/total)*100)+"%":"—";
export function text(value:unknown,fallback="Not recorded"){if(typeof value==="string"&&value.trim())return value.trim();if(typeof value==="number"||typeof value==="boolean")return String(value);return fallback;}
export function dateText(value:unknown){if(!value)return undefined;if(typeof value==="string"||typeof value==="number"){const date=new Date(value);return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString("en-GB");}if(typeof value==="object"&&value!==null&&"toDate" in value&&typeof (value as {toDate?:unknown}).toDate==="function"){const date=(value as {toDate:()=>Date}).toDate();return Number.isNaN(date.getTime())?undefined:date.toLocaleDateString("en-GB");}return undefined;}
export const countBy=(items:UserRecord[],key:string)=>items.reduce<Record<string,number>>((acc,item)=>{const value=text(item[key],"Unknown");acc[value]=(acc[value]??0)+1;return acc;},{});
export const topEntries=(record:Record<string,number>,limit=8)=>Object.entries(record).sort((a,b)=>b[1]-a[1]).slice(0,limit);
export const normalizedStatus=(value:unknown)=>text(value,"").trim().toLowerCase();
export const isClosedIssue=(record:DrillRecord)=>["resolved","closed","archived","complete","completed"].includes(normalizedStatus(record.status));
