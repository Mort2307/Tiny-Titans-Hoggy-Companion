import type { WeightRecord } from "../types/Weight";
export function weightTrend(records: WeightRecord[]) {
  const sorted=[...records].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
  if(sorted.length<2)return {tone:"unknown",text:"Keep recording weights so Tiny Titans can establish this snake's own trajectory.",change:null as number|null};
  const change=sorted[sorted.length-1].weight-sorted[0].weight;
  return {tone:change<0?"check":"good",text:sorted.length+" measurements show a "+(change>0?"upward":change<0?"downward":"stable")+" recorded trajectory ("+(change>=0?"+":"")+change.toFixed(1)+" g).",change};
}
export function rangeText(range?:{min:number;max:number;unit:string;context?:string}) {
  if(!range)return null;
  return range.min+"–"+range.max+range.unit+(range.context?" · "+range.context:"");
}
