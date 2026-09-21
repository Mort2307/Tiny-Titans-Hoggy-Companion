import type { FormEvent } from "react";
import type { MorphReferenceEntry } from "../../data/hognoseMorphCatalog";
import type { MorphCreditMode } from "../../services/morphSubmissionServiceV2";
import SpeciesSelector from "../SpeciesSelector";
import { useMorphImageSubmission } from "../../hooks/useMorphImageSubmission";

type Props={entries:MorphReferenceEntry[];onClose:()=>void;initialMorphId?:string;initialSpeciesId?:string;};

export default function MorphImageSubmissionDialog({entries,onClose,initialMorphId="",initialSpeciesId="heterodon-nasicus"}:Props){
  const {
    fileRef,speciesId,setSpeciesId,selectedMorph,setSelectedMorph,morphSearch,setMorphSearch,morphMenuOpen,setMorphMenuOpen,
    description,setDescription,observedTraits,setObservedTraits,proofDetails,setProofDetails,proofReference,setProofReference,
    photoRequirementsConfirmed,setPhotoRequirementsConfirmed,factualAccuracyConfirmed,setFactualAccuracyConfirmed,
    creditMode,setCreditMode,creditName,setCreditName,creditSocial,setCreditSocial,image,setImage,busy,error,sent,
    selectedSpecies,geneticsMapped,morphOptions,submit
  }=useMorphImageSubmission(entries,initialMorphId,initialSpeciesId);

  return <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}>
    <article className="morph-detail" role="dialog" aria-modal="true" onMouseDown={(event)=>event.stopPropagation()}>
      <button type="button" className="morph-detail__close" onClick={onClose} aria-label="Close">×</button>
      {sent?<><div className="morph-detail__eyebrow">🐍 SUBMISSION RECEIVED</div><h2>Thanks — it is in review.</h2><p className="morph-detail__description">Your image for {selectedSpecies?.commonNames[0]??selectedSpecies?.acceptedScientificName} has been linked to the canonical Morph Library entry and sent to Creator review.</p><button type="button" onClick={onClose}>Done</button></>
      :<form onSubmit={(event:FormEvent)=>void submit(event)}>
        <div className="morph-detail__eyebrow">🐍 MORPH IMAGE SUBMISSION</div><h2>Submit a morph image</h2>
        <SpeciesSelector id="morph-image-submission-species" value={speciesId} onChange={setSpeciesId} label="Species"/>
        {!geneticsMapped?<section className="morph-detail__section"><h3>🧬 Species genetics not mapped yet</h3><p className="morph-detail__description">{selectedSpecies?.commonNames[0]??selectedSpecies?.acceptedScientificName} is in the Tiny Titans species registry, but its species-specific genetics catalogue has not been reviewed and mapped yet. We will not show Hognose genetics here by mistake.</p><p className="morph-detail__source-note">Use “Can’t find a morph? Submit it” to send species-specific terminology, evidence or breeder information for Creator review.</p></section>
        :<section className="morph-detail__section"><h3>🧬 Select the canonical morph</h3><div className="morph-selector"><button type="button" className="morph-selector__trigger" onClick={()=>setMorphMenuOpen((open)=>!open)}>{selectedMorph?.name??"Select a morph…"}</button>{morphMenuOpen&&<div className="morph-selector__menu"><input autoFocus value={morphSearch} onChange={(event)=>setMorphSearch(event.target.value)} placeholder="Search morphs or aliases…"/>{morphOptions.map((entry)=><button key={entry.geneId} type="button" onClick={()=>{setSelectedMorph(entry);setMorphMenuOpen(false);}}>{entry.name}<small>{entry.kind} · {entry.kind==="Combination"?"Component genetics":entry.inheritance}</small></button>)}</div>}</div></section>}
        <label>What are we looking at?<textarea value={description} onChange={(event)=>setDescription(event.target.value)} rows={3} required/></label>
        <label>Known genetic information<textarea value={observedTraits} onChange={(event)=>setObservedTraits(event.target.value)} rows={2}/></label>
        <label>Evidence / proof<textarea value={proofDetails} onChange={(event)=>setProofDetails(event.target.value)} rows={3} required/></label>
        <label>Proof reference<input value={proofReference} onChange={(event)=>setProofReference(event.target.value)}/></label>
        <label className="morph-submit-check"><input type="checkbox" checked={photoRequirementsConfirmed} onChange={(event)=>setPhotoRequirementsConfirmed(event.target.checked)}/><span>Photo is clear, full-body and unfiltered.</span></label>
        <label className="morph-submit-check"><input type="checkbox" checked={factualAccuracyConfirmed} onChange={(event)=>setFactualAccuracyConfirmed(event.target.checked)}/><span>I have provided evidence supporting the identification.</span></label>
        <input ref={fileRef} className="morph-submit-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event)=>setImage(event.target.files?.[0]??null)} required/>
        <button type="button" className="morph-submit-photo-button" onClick={()=>fileRef.current?.click()}>📷 {image?"Change photo":"Add photo"}</button>
        <section className="morph-detail__section"><h3>Credit</h3><div className="morph-detail__badges">{(["name","social","anonymous"] as MorphCreditMode[]).map((mode)=><button key={mode} type="button" className={creditMode===mode?"is-active":""} onClick={()=>setCreditMode(mode)}>{mode==="name"?"Name":mode==="social"?"Social":"Anonymous"}</button>)}</div>{creditMode==="name"&&<input value={creditName} onChange={(event)=>setCreditName(event.target.value)} placeholder="Name" required/>}{creditMode==="social"&&<input value={creditSocial} onChange={(event)=>setCreditSocial(event.target.value)} placeholder="@handle" required/>}</section>
        {error&&<p role="alert">{error}</p>}<button type="submit" disabled={busy||!geneticsMapped}>{busy?"Submitting…":"Submit for review"}</button>
      </form>}
    </article>
  </div>;
}
