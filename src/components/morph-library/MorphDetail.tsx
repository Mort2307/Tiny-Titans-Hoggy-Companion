import type { MorphReferenceEntry } from "../../data/hognoseMorphCatalog";
import type { MasterMorphDefinition } from "../../data/masterMorphDatabase";
import type { MorphRegion } from "../../data/morphRegionalTerminology";
import { getPreferredRegionalMorphName,getRegionalAliases } from "../../data/morphRegionalTerminology";
import CommunityMorphGallery from "./CommunityMorphGallery";

type Props={morph:MorphReferenceEntry;region:MorphRegion;onClose:()=>void;};

export default function MorphDetail({morph,region,onClose}:Props){
  const typedMorph=morph as MasterMorphDefinition;
  const displayName=getPreferredRegionalMorphName(typedMorph,region);
  const aliases=getRegionalAliases(typedMorph,region);
  const recognisedNames=typedMorph.recognisedNames??[];
  const components=morph.components??[];
  const contains=morph.contains??components.map((component)=>component.morphId)??[];
  return <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}><article className="morph-detail" role="dialog" aria-modal="true" aria-labelledby="morph-detail-title" onMouseDown={(event)=>event.stopPropagation()}>
    <button className="morph-detail__close" type="button" onClick={onClose} aria-label="Close morph details">×</button>
    <div className="morph-detail__eyebrow">TINY TITANS · MORPH DATABASE</div><h2 id="morph-detail-title">{displayName}</h2>
    {displayName!==morph.name&&<p><strong>Canonical identity:</strong> {morph.name}</p>}
    <div className="morph-detail__badges"><span>{morph.kind}</span><span>{morph.kind==="Combination"?"Component genetics":morph.inheritance}</span><span>{morph.verification}</span></div>
    {aliases.length>0&&<section className="morph-detail__section"><h3>🌎 Regional terminology</h3><p>{aliases.map((alias)=>alias.name+" · "+alias.status).join(" · ")}</p></section>}
    {typedMorph.geneticFormula&&<section className="morph-detail__section"><h3>🧬 Genetic identity</h3><p><strong>Composition:</strong> {typedMorph.geneticFormula}</p>{typedMorph.directFormula&&typedMorph.directFormula!==typedMorph.geneticFormula&&<p><strong>Direct components:</strong> {typedMorph.directFormula}</p>}{recognisedNames.length>0&&<p><strong>Recognised as:</strong> {recognisedNames.join(", ")}</p>}{typedMorph.inheritanceSummary&&<p><strong>Component inheritance:</strong> {typedMorph.inheritanceSummary}</p>}{typedMorph.evidenceLevel&&<p><strong>Evidence level:</strong> {typedMorph.evidenceLevel}</p>}</section>}
    <p className="morph-detail__description">{morph.description??"No description has been added yet."}</p>
    <CommunityMorphGallery morphId={morph.geneId} morphName={displayName}/>
    {contains.length>0&&<section className="morph-detail__section"><h3>Contains</h3><div className="morph-detail__contains">{contains.map((item)=><span key={item}>{item}</span>)}</div></section>}
    {components.length>0&&<section className="morph-detail__section"><h3>Genetic components</h3><ul>{components.map((component)=><li key={component.morphId+"-"+(component.copies??1)}><strong>{component.morphId}</strong>{component.copies?" ×"+component.copies:""}</li>)}</ul></section>}
    <section className="morph-detail__section"><h3>Genetics notes</h3><p>{morph.educationalNotes??"No additional genetics notes have been published for this entry yet."}</p></section>
    {typedMorph.recognitionSummary&&<section className="morph-detail__section"><h3>Recognition</h3><p>{typedMorph.recognitionSummary}</p></section>}
    <section className="morph-detail__section morph-detail__source"><strong>Reference</strong><span>{morph.sourceLabel??"Tiny Titans canonical database"}</span>{morph.sourceUrl?<a href={morph.sourceUrl} target="_blank" rel="noreferrer">Open source reference →</a>:<span className="morph-detail__source-note">Canonical entry maintained by Tiny Titans.</span>}</section>
  </article></div>;
}
