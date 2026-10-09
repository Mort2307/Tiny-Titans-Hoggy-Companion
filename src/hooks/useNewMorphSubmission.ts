import { useState, type FormEvent } from "react";
import type { MorphRegion } from "../data/morphRegionalTerminology";
import { createUserMorphSubmission } from "../services/morphUserSubmissionService";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import { useAuth } from "../context/useAuth";

export function useNewMorphSubmission(initialSpeciesId="heterodon-nasicus"){
  const {user}=useAuth();
  const [speciesId,setSpeciesId]=useState(initialSpeciesId);
  const [name,setName]=useState("");
  const [region,setRegion]=useState<MorphRegion>("uk");
  const [category,setCategory]=useState<"single-gene"|"super-form"|"combination"|"polygenic"|"line-bred"|"colour-variation"|"pattern-variation"|"locality"|"regional-name"|"unknown">("unknown");
  const [description,setDescription]=useState("");
  const [knownGenetics,setKnownGenetics]=useState("");
  const [source,setSource]=useState("");
  const [sourceUrl,setSourceUrl]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState("");
  const selectedSpecies=findUniversalSpecies(speciesId);

  async function submit(event:FormEvent){
    event.preventDefault();
    if(!user){setError("You must be signed in to submit a morph.");return;}
    if(!selectedSpecies){setError("Please select a recognised Tiny Titans species.");return;}
    setBusy(true);setError("");
    try{
      const submissionRegion = region === "all" ? "global" : region;
      await createUserMorphSubmission(user.uid,{speciesId,submittedName:name,region:submissionRegion,category,description,knownGenetics,sourceOrBreeder:source,sourceUrl});
      setSent(true);
    }catch(submitError){setError(submitError instanceof Error?submitError.message:"Unable to submit this morph.");}
    finally{setBusy(false);}
  }
  return {speciesId,setSpeciesId,name,setName,region,setRegion,category,setCategory,description,setDescription,knownGenetics,setKnownGenetics,source,setSource,sourceUrl,setSourceUrl,busy,sent,error,selectedSpecies,submit};
}
