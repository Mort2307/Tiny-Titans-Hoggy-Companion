import { useEffect, useState } from "react";
import BackHomeButton from "../components/BackHomeButton";
import MorphDetail from "../components/morph-library/MorphDetail";
import MorphImageSubmissionDialog from "../components/morph-library/MorphImageSubmissionDialog";
import NewMorphSubmissionDialog from "../components/morph-library/NewMorphSubmissionDialog";
import CommunityVariationImageSubmissionDialog from "../components/morph-library/CommunityVariationImageSubmissionDialog";
import { useMorphLibrary } from "../hooks/useMorphLibrary";
import "../styles/morphLibrary.css";
import "../styles/morphCommunityGallery.css";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { getApprovedCommunityVariationCards, type ApprovedCommunityVariationCard } from "../services/communityVariationCardService";

export { default as MorphImageSubmissionDialog } from "../components/morph-library/MorphImageSubmissionDialog";
export { default as NewMorphSubmissionDialog } from "../components/morph-library/NewMorphSubmissionDialog";

export default function MorphLibrary() {
  const [communityCards, setCommunityCards] = useState<ApprovedCommunityVariationCard[]>([]);
  const [variationImageCard, setVariationImageCard] = useState<ApprovedCommunityVariationCard | null>(null);
  const {
    query,setQuery,filter,setFilter,region,setRegion,selected,setSelected,showImageSubmission,
    showNewMorphSubmission,setShowNewMorphSubmission,imageSubmissionMorphId,imageSubmissionSpeciesId,
    approvedImagesByMorph,approvedImagesLoading,entries,filtered,audit,openImageSubmission,closeImageSubmission,
  } = useMorphLibrary();

  useEffect(() => {
    let cancelled = false;
    void getApprovedCommunityVariationCards("heterodon-nasicus")
      .then((cards) => { if (!cancelled) setCommunityCards(cards); })
      .catch(() => { if (!cancelled) setCommunityCards([]); });
    return () => { cancelled = true; };
  }, []);

  return <main className="page-container morph-library-page">
    <BackHomeButton />
    <header className="morph-library__header">
      <div className="morph-library__eyebrow"><TinyTitansIcon name="morph" size={14} /> TINY TITANS · REPTILE GENETICS</div>
      <h1>Morph Library</h1>
      <p>Species-aware genetics, recognised combinations, regional terminology and reference-backed community examples in one place. Hognose genetics are shown only where the species catalogue is currently mapped.</p>
      <div className="morph-library__filters" role="group" aria-label="Morph regions">
        {(["global","uk","usa","europe","australia"] as const).map((value)=><button key={value} type="button" className={region===value?"is-active":""} onClick={()=>setRegion(value)}><TinyTitansIcon name="community" size={13} /> {value==="global"?"Global":value==="uk"?"UK":value==="usa"?"USA":value==="europe"?"Europe":"Australia"}</button>)}
      </div>
      <div className="weight-record-actions"><button type="button" onClick={()=>setShowNewMorphSubmission(true)}><TinyTitansIcon name="morph" size={14} /> Suggest a morph / variation card</button><button type="button" onClick={()=>openImageSubmission()}><TinyTitansIcon name="camera" size={14} /> Submit a morph image</button></div>
      <div className="morph-library__source-strip"><span><strong>Reference sources:</strong></span><a href="https://hognose-morphs.com/morphs/all" target="_blank" rel="noreferrer">Hognose Morphs</a><a href="https://www.morphmarket.com/morphpedia/hognose-snakes/" target="_blank" rel="noreferrer">MorphMarket Morphpedia</a><a href="https://www.reptifit.nl/en/collection" target="_blank" rel="noreferrer">Reptifit</a></div>
      <small>{entries.length} combined genetics records · {audit.mapped} terminology records mapped · {audit.needsReview} catalogue records awaiting regional comparison{approvedImagesLoading?" · Loading approved examples…":" · "+Object.keys(approvedImagesByMorph).length+" records with approved community imagery"}</small>
    </header>

    <div className="morph-library__controls"><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search morphs, aliases, combinations, formulas or components…" aria-label="Search morph library"/><div className="morph-library__filters" role="group" aria-label="Morph type filters">{(["all","gene","combination","polygenic","line-bred"] as const).map((value)=><button key={value} type="button" className={filter===value?"is-active":""} onClick={()=>setFilter(value)}>{value==="all"?"All":value.replace("-"," ")}</button>)}</div></div>
    <div className="morph-library__count">Showing <strong>{filtered.length}</strong> of <strong>{entries.length}</strong> records · {region==="global"?"Canonical names":"Regional display terminology"}</div>

    <div className="morph-grid morph-library__grid">
      {filtered.map((morph)=>{
        const approvedImage=approvedImagesByMorph[morph.geneId];
        const displayName=morph.name;
        const typed=morph as {geneticFormula?:string;recognisedNames?:string[];inheritanceSummary?:string};
        return <article className="morph-card morph-card--library" key={morph.geneId}>
          <div className="morph-card__media">
            {approvedImage?<div className="morph-card__image-wrap"><img src={approvedImage.imageUrl} alt={displayName+" approved community example"} loading="lazy"/>{(approvedImage.creditName||approvedImage.creditSocial)&&<span className="morph-card__credit">Credit: {approvedImage.creditName||approvedImage.creditSocial}</span>}</div>
            :<div className="morph-card__image-empty"><span className="morph-card__image-icon"><TinyTitansIcon name="camera" size={20} /></span><strong>No approved image yet</strong><span>Add the first reviewed example.</span><button type="button" className="morph-card__image-submit" onClick={()=>openImageSubmission(morph.geneId)}>Submit image</button></div>}
          </div>
          <div className="morph-card__body"><div className="morph-card__topline"><span>{morph.kind}</span><span>{morph.verification}</span></div><div className="morph-card__classification"><span>{morph.kind==="Combination"?"Component genetics":morph.inheritance==="Incomplete Dominant"?"Incomplete dominant":morph.inheritance}</span>{morph.hetPossible&&<span>Het-capable</span>}</div><h2>{displayName}</h2>{typed.geneticFormula&&<p className="morph-card__contains"><TinyTitansIcon name="genetics" size={13} /> {typed.geneticFormula}</p>}{typed.recognisedNames?.length ? <p className="morph-card__contains">Recognised as: {typed.recognisedNames.join(", ")}</p> : null}{morph.kind==="Combination"&&typed.inheritanceSummary&&<p className="morph-card__contains">Component inheritance: {typed.inheritanceSummary}</p>}<p className="morph-card__description">{morph.description??"Reference entry."}</p><div className="morph-card__footer"><span className="morph-card__source">Source: {morph.sourceLabel??"Tiny Titans canonical database"}</span>{morph.sourceUrl&&<a href={morph.sourceUrl} target="_blank" rel="noreferrer" onClick={(event)=>event.stopPropagation()}>Reference <TinyTitansIcon name="forward" size={12} /></a>}</div><button type="button" className="morph-card__open" onClick={()=>setSelected(morph)}>Open genetics record <span aria-hidden="true"><TinyTitansIcon name="forward" size={12} /></span></button></div>
        </article>;
      })}
    </div>

    {communityCards.length>0&&<section className="tracker-card" aria-label="Community reviewed variation cards"><div className="morph-library__eyebrow"><TinyTitansIcon name="community" size={14} /> COMMUNITY-REVIEWED VARIATIONS</div><h2>Keeper-contributed variation cards</h2><p>These records document reviewed terminology or observable variation without automatically creating new genetics. They stay outside the breeding calculator until inheritance is separately verified.</p><div className="morph-library-grid">{communityCards.map((card)=>{const image=approvedImagesByMorph["community-"+card.id];return <article key={card.id} className="morph-card morph-card--library"><div className="morph-card__media">{image?<div className="morph-card__image-wrap"><img src={image.imageUrl} alt={card.name+" approved community example"} loading="lazy"/>{(image.creditName||image.creditSocial)&&<span className="morph-card__credit">Credit: {image.creditName||image.creditSocial}</span>}</div>:<div className="morph-card__image-empty"><span className="morph-card__image-icon"><TinyTitansIcon name="morph" size={20} /></span><strong>Community variation card</strong><span>Image awaiting approved user contribution</span></div>}</div><div className="morph-card__body"><div className="morph-card__topline"><span>{card.category.replaceAll("-"," ")}</span><span>Reviewed</span></div><h2>{card.name}</h2><div className="morph-card__classification"><span>Variation record</span><span>Genetics unresolved</span></div><p className="morph-card__description">{card.description}</p>{card.knownGenetics&&<p className="morph-card__contains"><strong>Submitted genetics context:</strong> {card.knownGenetics}</p>}<p className="morph-card__canonical"><strong>Calculator:</strong> Not eligible until inheritance is separately verified.</p><div className="morph-card__actions"><button type="button" className="morph-card__image-submit" onClick={()=>setVariationImageCard(card)}><TinyTitansIcon name="camera" size={13} /> {image?"Add another image":"Contribute image"}</button></div></div></article>})}</div></section>}
        {filtered.length===0&&<div className="welcome-card"><h2>No matching morphs</h2><p>Try another recognised name, formula, alias or submit the missing terminology for review.</p><button type="button" onClick={()=>setShowNewMorphSubmission(true)}>Suggest missing morph / variation</button></div>}
    {selected&&<MorphDetail morph={selected} region={region} onClose={()=>setSelected(null)}/>}
    {showImageSubmission&&<MorphImageSubmissionDialog entries={entries} initialMorphId={imageSubmissionMorphId} initialSpeciesId={imageSubmissionSpeciesId} onClose={closeImageSubmission}/>}
    {showNewMorphSubmission&&<NewMorphSubmissionDialog initialSpeciesId="heterodon-nasicus" onClose={()=>setShowNewMorphSubmission(false)}/>}
    {variationImageCard&&<CommunityVariationImageSubmissionDialog card={variationImageCard} speciesId="heterodon-nasicus" speciesName="Western Hognose Snake" onClose={()=>setVariationImageCard(null)}/>} 
  </main>;
}
