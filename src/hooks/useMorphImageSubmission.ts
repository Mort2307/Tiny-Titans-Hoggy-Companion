import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import type { MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { MorphCreditMode } from "../services/morphSubmissionServiceV2";
import { submitMorphImageV2 } from "../services/morphSubmissionServiceV2";
import { findSnakeSpecies } from "../data/species/speciesRegistry";
import { isSpeciesGeneticsMapped } from "../data/species/speciesGenetics";
import { rankSearchResults } from "../utils/searchRanking";
import { useAuth } from "../context/useAuth";

export function useMorphImageSubmission(entries:MorphReferenceEntry[],initialMorphId=""){
  const {user}=useAuth();
  const fileRef=useRef<HTMLInputElement>(null);
  const speciesId="heterodon-nasicus";
  const [selectedMorph,setSelectedMorph]=useState<MorphReferenceEntry|null>(initialMorphId?entries.find((entry)=>entry.geneId===initialMorphId)??null:null);
  const [morphSearch,setMorphSearch]=useState("");
  const [morphMenuOpen,setMorphMenuOpen]=useState(false);
  const [description,setDescription]=useState("");
  const [observedTraits,setObservedTraits]=useState("");
  const [proofDetails,setProofDetails]=useState("");
  const [proofReference,setProofReference]=useState("");
  const [photoRequirementsConfirmed,setPhotoRequirementsConfirmed]=useState(false);
  const [factualAccuracyConfirmed,setFactualAccuracyConfirmed]=useState(false);
  const [creditMode,setCreditMode]=useState<MorphCreditMode>("anonymous");
  const [creditName,setCreditName]=useState("");
  const [creditSocial,setCreditSocial]=useState("");
  const [image,setImage]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [sent,setSent]=useState(false);

  const selectedSpecies=findSnakeSpecies(speciesId);
  const geneticsMapped=isSpeciesGeneticsMapped(speciesId);

  useEffect(()=>{
    if(initialMorphId&&geneticsMapped)setSelectedMorph(entries.find((entry)=>entry.geneId===initialMorphId)??null);
  },[initialMorphId,entries,geneticsMapped]);

  useEffect(()=>{
    if(!geneticsMapped){setSelectedMorph(null);setMorphSearch("");setMorphMenuOpen(false);}
  },[geneticsMapped]);

  const morphOptions=useMemo(()=>{
    if(!geneticsMapped)return [];
    if(!morphSearch.trim())return entries.slice(0,80);
    return rankSearchResults(morphSearch,entries,(entry)=>{
      const typed=entry as MasterMorphDefinition;
      return {canonical:[entry.name],aliases:entry.aliases??[],secondary:[...(entry.contains??[]),...(typed.searchTerms??[]),typed.geneticFormula??"",typed.directFormula??""]};
    }).slice(0,80).map(({item})=>item);
  },[entries,morphSearch,geneticsMapped]);

  async function submit(event:FormEvent){
    event.preventDefault();
    setError("");
    if(!user){setError("You must be signed in to submit a morph image.");return;}
    if(!selectedSpecies||selectedSpecies.id!=="heterodon-nasicus"){setError("This legacy image workflow is Western Hognose only.");return;}
    if(!geneticsMapped){setError("This species does not yet have a reviewed genetics catalogue.");return;}
    if(!selectedMorph||!image||!photoRequirementsConfirmed||!factualAccuracyConfirmed){setError("Select a morph, add a compliant photograph and confirm the evidence requirements.");return;}
    setBusy(true);
    try{
      await submitMorphImageV2({speciesId,morphId:selectedMorph.geneId,morphName:selectedMorph.name,description,observedTraits,proofDetails,proofReference,photoRequirementsConfirmed,factualAccuracyConfirmed,creditMode,creditName,creditSocial,image});
      setSent(true);
    }catch(submitError){setError(submitError instanceof Error?submitError.message:"We couldn't submit the morph image.");}
    finally{setBusy(false);}
  }
  return {fileRef,speciesId,selectedMorph,setSelectedMorph,morphSearch,setMorphSearch,morphMenuOpen,setMorphMenuOpen,description,setDescription,observedTraits,setObservedTraits,proofDetails,setProofDetails,proofReference,setProofReference,photoRequirementsConfirmed,setPhotoRequirementsConfirmed,factualAccuracyConfirmed,setFactualAccuracyConfirmed,creditMode,setCreditMode,creditName,setCreditName,creditSocial,setCreditSocial,image,setImage,busy,error,sent,selectedSpecies,geneticsMapped,morphOptions,submit};
}
