import { useNewMorphSubmission } from "../../hooks/useNewMorphSubmission";
import SpeciesSelector from "../SpeciesSelector";
import TinyTitansIcon from "../TinyTitansIcon";

type Props={onClose:()=>void;};

export default function NewMorphSubmissionDialog({onClose}:Props){
  const {speciesId,setSpeciesId,name,setName,region,setRegion,category,setCategory,description,setDescription,knownGenetics,setKnownGenetics,source,setSource,sourceUrl,setSourceUrl,busy,sent,error,selectedSpecies,submit}=useNewMorphSubmission();
  return <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}><article className="morph-detail" role="dialog" aria-modal="true" onMouseDown={(event)=>event.stopPropagation()}>
    <button className="morph-detail__close" type="button" onClick={onClose} aria-label="Close"><TinyTitansIcon name="close" size={14} /></button>
    {sent?<><div className="morph-detail__eyebrow"><TinyTitansIcon name="genetics" size={14} /> USER SUBMITTED MORPH</div><h2>Thanks — {name} is now in review.</h2><p className="morph-detail__description">Your submission is tagged to {selectedSpecies?.commonNames[0]??selectedSpecies?.acceptedScientificName} and will remain clearly marked as user-submitted until Tiny Titans verifies whether it is a new genetic identity, regional name, combination or breeder-specific term.</p><button type="button" onClick={onClose}>Done</button></>
    :<form onSubmit={(event)=>void submit(event)}>
      <div className="morph-detail__eyebrow"><TinyTitansIcon name="genetics" size={14} /> USER SUBMITTED MORPH</div><h2>Can’t find a morph?</h2><p className="morph-detail__description">Tell us the species first, then submit the name or evidence you encountered. Regional and unfamiliar terminology stays clearly marked as user-submitted until review.</p>
      <SpeciesSelector id="user-morph-submission-species" value={speciesId} onChange={setSpeciesId} label="Species"/>
      <label>Morph name<input value={name} onChange={(event)=>setName(event.target.value)} required placeholder="e.g. Phoenix Firebelly"/></label>
      <label>Where did you encounter this terminology?<select value={region} onChange={(event)=>setRegion(event.target.value as typeof region)}><option value="uk">UK</option><option value="usa">USA</option><option value="europe">Europe</option><option value="australia">Australia</option><option value="other">Other</option></select></label>
      <label>What kind of thing is it?<select value={category} onChange={(event)=>setCategory(event.target.value as typeof category)}><option value="single-gene">Single gene</option><option value="super-form">Super form</option><option value="combination">Combination</option><option value="polygenic">Polygenic / line-bred</option><option value="regional-name">Regional name / alias</option><option value="unknown">Not sure</option></select></label>
      <label>What do you know about it?<textarea value={description} onChange={(event)=>setDescription(event.target.value)} rows={4} required placeholder="Where you saw it, how it was described, phenotype, etc."/></label>
      <label>Known genetics (optional)<textarea value={knownGenetics} onChange={(event)=>setKnownGenetics(event.target.value)} rows={3} placeholder="Parents, known genes, breeder information…"/></label>
      <label>Breeder / source (optional)<input value={source} onChange={(event)=>setSource(event.target.value)}/></label>
      <label>Source URL (optional)<input value={sourceUrl} onChange={(event)=>setSourceUrl(event.target.value)}/></label>
      {error&&<p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy?"Submitting…":"Submit morph for review"}</button>
    </form>}
  </article></div>;
}
