import type { MorphImageSubmission } from "../types/morphSubmission";
import type { MasterMorphDefinition } from "../data/masterMorphDatabase";

export type ReviewDraft = {
  speciesId:string; speciesName:string; morphId:string; morphName:string; description:string;
  geneticsNotes:string; observedTraits:string; proofDetails:string; proofReference:string;
  creditType:MorphImageSubmission["creditType"]; creditName:string; creditSocial:string;
  allowMorphLibraryLink:boolean; creatorReviewerNotes:string;
};

export const normalise=(value:string)=>value.trim().toLowerCase();
export const normaliseSearch=(value:string)=>normalise(value).replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();

export function editDistance(a:string,b:string){
 if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;
 const previous=Array.from({length:b.length+1},(_,index)=>index);
 for(let i=1;i<=a.length;i+=1){const current=[i];for(let j=1;j<=b.length;j+=1)current[j]=Math.min(previous[j]+1,current[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<current.length;j+=1)previous[j]=current[j];}
 return previous[b.length];
}

export function matchesMorphSearch(morph:MasterMorphDefinition,search:string){
 const terms=normaliseSearch(search).split(" ").filter(Boolean);if(!terms.length)return true;
 const values=[morph.geneId,morph.name,...(morph.aliases??[])].map(normaliseSearch);
 return terms.every((term)=>values.some((value)=>value.includes(term)||value.split(" ").some((word)=>word.startsWith(term))||value.split(" ").some((word)=>Math.min(term.length,word.length)>=4&&editDistance(term,word)<=1)));
}

export function isUnknownMorph(morph:MasterMorphDefinition){const key=normaliseSearch(morph.name);return key==="unknown"||normaliseSearch(morph.geneId)==="unknown";}
export const toDraft=(item:MorphImageSubmission):ReviewDraft=>({
 speciesId:item.speciesId??"",speciesName:item.speciesName??"",morphId:item.morphId??"",morphName:item.morphName??"",
 description:item.description??"",geneticsNotes:item.geneticsNotes??"",observedTraits:item.observedTraits??"",proofDetails:item.proofDetails??"",
 proofReference:item.proofReference??"",creditType:item.creditType??"anonymous",creditName:item.creditName??"",creditSocial:item.creditSocial??"",
 allowMorphLibraryLink:item.allowMorphLibraryLink!==false,creatorReviewerNotes:"",
});
export function formatCreatorReviewDate(value:unknown){
 if(!value)return "—";
 if(typeof value==="object"&&value!==null&&"toMillis" in value&&typeof (value as {toMillis?:unknown}).toMillis==="function")return new Date((value as {toMillis:()=>number}).toMillis()).toLocaleString("en-GB");
 const date=new Date(String(value));return Number.isNaN(date.getTime())?"—":date.toLocaleString("en-GB");
}
