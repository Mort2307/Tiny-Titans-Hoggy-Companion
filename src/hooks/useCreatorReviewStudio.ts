import { useCallback,useEffect,useMemo,useState } from "react";
import { getDownloadURL,ref } from "firebase/storage";
import { useAuth } from "../context/useAuth";
import { storage } from "../firebase/config";
import { approveMorphImageSubmission,getMorphImageSubmissions,getCreatorUserDisplayNames,rejectMorphImageSubmission } from "../services/creatorService";
import { saveMorphSubmissionReview } from "../services/creatorReviewStudioService";
import { canTransitionMorphSubmission,isAwaitingMorphReview,validateMorphSubmissionForApproval } from "../services/morphSubmissionLifecycle";
import { getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import { searchSnakeSpecies } from "../data/species/speciesRegistry";
import { masterMorphs,resolveMasterMorph,type MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { MorphImageSubmission } from "../types/morphSubmission";
import { matchesMorphSearch,isUnknownMorph,normaliseSearch,toDraft,type ReviewDraft } from "../lib/creatorReviewStudio";

export function useCreatorReviewStudio(){
 const {profile,user}=useAuth();
 const [items,setItems]=useState<MorphImageSubmission[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [selectedId,setSelectedId]=useState("");
 const [draft,setDraft]=useState<ReviewDraft|null>(null);
 const [imageUrl,setImageUrl]=useState("");
 const [queueFilter,setQueueFilter]=useState<"pending"|"all">("pending");
 const [speciesSearch,setSpeciesSearch]=useState("");
 const [morphSearch,setMorphSearch]=useState("");
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const selected=useMemo(()=>items.find((item)=>item.id===selectedId)??null,[items,selectedId]);
 const visible=useMemo(()=>queueFilter==="pending"?items.filter((item)=>isAwaitingMorphReview(item.status)):items,[items,queueFilter]);
 const speciesOptions=useMemo(()=>{const needle=normaliseSearch(speciesSearch);return searchSnakeSpecies("").filter((species)=>!needle?[true]:[species.id,...species.commonNames,species.acceptedScientificName].some((value)=>normaliseSearch(String(value)).includes(needle))).slice(0,60);},[speciesSearch]);
 const speciesIdForMorphs=draft?.speciesId??"";
 const morphOptions=useMemo(()=>{if(!speciesIdForMorphs)return [];return [...getSpeciesVisualMorphs(speciesIdForMorphs)].filter((morph)=>matchesMorphSearch(morph,morphSearch)).sort((a,b)=>{const aUnknown=isUnknownMorph(a);const bUnknown=isUnknownMorph(b);if(aUnknown!==bUnknown)return aUnknown?1:-1;return a.name.localeCompare(b.name,"en",{sensitivity:"base",numeric:true});});},[speciesIdForMorphs,morphSearch]);
 const currentCanonical=useMemo(()=>{const key=draft?.morphId||draft?.morphName;if(!key)return null;return resolveMasterMorph(key)??masterMorphs.find((morph)=>morph.geneId===draft?.morphId)??null;},[draft?.morphId,draft?.morphName]);
 const load=useCallback(async()=>{if(!user)return;setLoading(true);setError("");try{const next=await getMorphImageSubmissions();setItems(next);setNames(await getCreatorUserDisplayNames(next.map((item)=>item.userId).filter((uid):uid is string=>Boolean(uid))));}catch(reason){setError(reason instanceof Error?reason.message:"Unable to load morph submissions.");}finally{setLoading(false);}},[user]);
 useEffect(()=>{if(profile?.role==="admin"&&user)void load();},[profile?.role,user,load]);
 useEffect(()=>{if(!selectedId&&items[0])setSelectedId(items[0].id);},[items,selectedId]);
 useEffect(()=>{if(!selected)return;setDraft(toDraft(selected));setDirty(false);setNotice("");setError("");setSpeciesSearch("");setMorphSearch("");if(!selected.attachment?.path){setImageUrl("");return;}let active=true;void getDownloadURL(ref(storage,selected.attachment.path)).then((url)=>active&&setImageUrl(url)).catch(()=>active&&setImageUrl(""));return()=>{active=false;};},[selected]);
 function patch(partial:Partial<ReviewDraft>){setDraft((current)=>current?{...current,...partial}:current);setDirty(true);setNotice("");setError("");}
 function selectSpecies(speciesId:string){const species=searchSnakeSpecies("").find((item)=>item.id===speciesId);patch({speciesId,speciesName:species?.commonNames[0]??"",morphId:"",morphName:""});setMorphSearch("");}
 function selectMorph(morph:MasterMorphDefinition){const canonical=resolveMasterMorph(morph.geneId)??resolveMasterMorph(morph.name)??morph;patch({morphId:canonical.geneId,morphName:canonical.name});setMorphSearch(canonical.name);}
 async function saveDraft(status?:"Pending"|"NeedsInfo"){if(!selected||!draft)return false;setWorking(true);setError("");try{await saveMorphSubmissionReview(selected.id,{...draft,status});const next={...selected,...draft,...(status?{status}:{})} as MorphImageSubmission;setItems((current)=>current.map((item)=>item.id===selected.id?next:item));setDirty(false);setNotice(status==="NeedsInfo"?"Saved and marked Needs Info.":"Draft saved privately.");return true;}catch(reason){setError(reason instanceof Error?reason.message:"Unable to save the review draft.");return false;}finally{setWorking(false);}}
 async function approve(){if(!selected||!draft||!user)return;const proposed={...selected,...draft} as MorphImageSubmission;if(!canTransitionMorphSubmission(selected.status,"Approved")){setError("This submission cannot transition to Approved from its current state.");return;}const validation=validateMorphSubmissionForApproval(proposed);if(validation){setError(validation);return;}setWorking(true);setError("");setNotice("");try{await saveMorphSubmissionReview(selected.id,draft);await approveMorphImageSubmission(proposed,user.uid);setNotice("Approved and published "+draft.morphName+".");setDirty(false);setSelectedId("");setDraft(null);await load();}catch(reason){setError(reason instanceof Error?reason.message:"Unable to approve this submission.");}finally{setWorking(false);}}
 async function requestInfo(){if(!selected||!draft)return;const note=window.prompt("What information should the creator provide before approval?",draft.creatorReviewerNotes)??"";if(!note.trim())return;setWorking(true);setError("");try{await saveMorphSubmissionReview(selected.id,{...draft,creatorReviewerNotes:note,status:"NeedsInfo"});setNotice("Request for information saved. The submission remains in the live queue.");setDirty(false);await load();}catch(reason){setError(reason instanceof Error?reason.message:"Unable to request more information.");}finally{setWorking(false);}}
 async function reject(){if(!selected||!user)return;const reason=window.prompt("Rejection reason for the creator:","")??"";if(!reason.trim())return;setWorking(true);setError("");try{await rejectMorphImageSubmission(selected.id,selected.attachment.path,user.uid,reason);setNotice("Rejected "+(draft?.morphName??selected.morphName)+".");setSelectedId("");setDraft(null);await load();}catch(reasonError){setError(reasonError instanceof Error?reasonError.message:"Unable to reject this submission.");}finally{setWorking(false);}}
 return {profile,user,items,names,selectedId,setSelectedId,draft,imageUrl,queueFilter,setQueueFilter,speciesSearch,setSpeciesSearch,morphSearch,setMorphSearch,loading,working,dirty,error,notice,visible,speciesOptions,morphOptions,currentCanonical,selected,load,patch,selectSpecies,selectMorph,saveDraft,approve,requestInfo,reject};
}
