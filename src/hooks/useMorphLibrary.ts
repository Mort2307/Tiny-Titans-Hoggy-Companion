import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { masterMorphs, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import { reptifitMorphCatalog } from "../data/reptifitMorphCatalog";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import { getPreferredRegionalMorphName, getRegionalAliases, getMorphTerminologyAudit, type MorphRegion } from "../data/morphRegionalTerminology";
import { getApprovedMorphImages } from "../services/creatorService";
import { rankSearchResults } from "../utils/searchRanking";

const DEFAULT_SPECIES_ID="heterodon-nasicus";

function normalise(value:string){return value.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[×✕]/g,"x").replace(/\s+/g," ");}
function asReferenceEntry(entry:MasterMorphDefinition):MorphReferenceEntry{return entry as MorphReferenceEntry;}

export function useMorphLibrary(){
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<"all"|"gene"|"combination"|"polygenic"|"line-bred">("all");
  const [region,setRegion]=useState<MorphRegion>("global");
  const [selected,setSelected]=useState<MorphReferenceEntry|null>(null);
  const [showImageSubmission,setShowImageSubmission]=useState(false);
  const [showNewMorphSubmission,setShowNewMorphSubmission]=useState(false);
  const [imageSubmissionMorphId,setImageSubmissionMorphId]=useState("");
  const [imageSubmissionSpeciesId,setImageSubmissionSpeciesId]=useState(DEFAULT_SPECIES_ID);
  const [approvedImagesByMorph,setApprovedImagesByMorph]=useState<Record<string,{id?:string;morphId?:string;imageUrl:string;creditName?:string;creditSocial?:string;creditMode?:string;approvedAt?:unknown}>>({});
  const [approvedImagesLoading,setApprovedImagesLoading]=useState(true);
  const [searchParams,setSearchParams]=useSearchParams();
  const submissionRequested=searchParams.get("submitMorphImage")==="1";
  const requestedMorphId=searchParams.get("morphId")??"";
  const requestedSpeciesId=DEFAULT_SPECIES_ID;

  const entries=useMemo<MorphReferenceEntry[]>(()=>{
    const byName=new Map<string,MorphReferenceEntry>();
    [...masterMorphs,...reptifitMorphCatalog].forEach((entry)=>{
      const key=normalise(entry.name);
      if(!byName.has(key))byName.set(key,asReferenceEntry(entry));
    });
    return Array.from(byName.values()).sort((a,b)=>
      getPreferredRegionalMorphName(a as MasterMorphDefinition,region).localeCompare(getPreferredRegionalMorphName(b as MasterMorphDefinition,region))
    );
  },[region]);

  const filtered=useMemo(()=>{
    const typeFiltered=entries.filter((entry)=>
      filter==="all" ||
      (filter==="gene"&&(entry.kind==="Gene"||entry.kind==="Super")) ||
      (filter==="combination"&&entry.kind==="Combination") ||
      (filter==="polygenic"&&entry.inheritance==="Polygenic") ||
      (filter==="line-bred"&&entry.inheritance==="Line-bred")
    );
    if(!query.trim())return typeFiltered;
    return rankSearchResults(query,typeFiltered,(entry)=>{
      const typed=entry as MasterMorphDefinition;
      const regional=getRegionalAliases(typed,region).map((item)=>item.name);
      return {
        canonical:[getPreferredRegionalMorphName(typed,region),entry.name],
        aliases:[...(entry.aliases??[]),...regional],
        secondary:[...(entry.contains??[]),...(typed.searchTerms??[]),typed.geneticFormula??"",typed.directFormula??""],
      };
    }).map(({item})=>item);
  },[entries,filter,query,region]);

  const audit=useMemo(()=>getMorphTerminologyAudit(masterMorphs),[]);
  useEffect(()=>{
    let cancelled=false;
    setApprovedImagesLoading(true);
    void getApprovedMorphImages(undefined, DEFAULT_SPECIES_ID).then((result)=>{
      if(cancelled)return;
      const next:Record<string,{id?:string;morphId?:string;imageUrl:string;creditName?:string;creditSocial?:string;creditMode?:string;approvedAt?:unknown}>={};
      (result as Array<{id?:string;morphId?:string;imageUrl:string;creditName?:string;creditSocial?:string;creditMode?:string;approvedAt?:unknown}>).forEach((image)=>{
        if(image.morphId&&image.imageUrl&&!next[image.morphId])next[image.morphId]=image;
      });
      setApprovedImagesByMorph(next);
      setApprovedImagesLoading(false);
    }).catch(()=>{if(!cancelled)setApprovedImagesLoading(false);});
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    if(!submissionRequested)return;
    setImageSubmissionMorphId(requestedMorphId);
    setImageSubmissionSpeciesId(DEFAULT_SPECIES_ID);
    setShowImageSubmission(true);
  },[submissionRequested,requestedMorphId,requestedSpeciesId]);

  function openImageSubmission(morphId=""){
    setImageSubmissionMorphId(morphId);
    setImageSubmissionSpeciesId(DEFAULT_SPECIES_ID);
    setShowImageSubmission(true);
  }
  function closeImageSubmission(){
    setShowImageSubmission(false);
    setImageSubmissionMorphId("");
    setImageSubmissionSpeciesId(DEFAULT_SPECIES_ID);
    if(submissionRequested)setSearchParams({}, {replace:true});
  }

  return {DEFAULT_SPECIES_ID,query,setQuery,filter,setFilter,region,setRegion,selected,setSelected,showImageSubmission,setShowImageSubmission,showNewMorphSubmission,setShowNewMorphSubmission,imageSubmissionMorphId,imageSubmissionSpeciesId,approvedImagesByMorph,approvedImagesLoading,entries,filtered,audit,openImageSubmission,closeImageSubmission};
}
