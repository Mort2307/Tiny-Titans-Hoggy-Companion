import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSpeciesContext } from '../context/SpeciesContext';
import { findSnakeSpecies } from '../data/species/speciesRegistry';
import { getSpeciesVisualMorphs } from '../data/species/speciesGenetics';
import { masterMorphs } from '../data/masterMorphDatabase';
import { getApprovedMorphImages } from '../services/creatorService';
import type { ApprovedMorphImage, MorphMediaType } from '../types/morphSubmission';
import BackHomeButton from '../components/BackHomeButton';
import '../styles/morphLibrary.css';
import '../styles/morphCommunityGallery.css';

function mediaKind(item: ApprovedMorphImage): MorphMediaType { return item.mediaType ?? 'image'; }

export default function SpeciesMorphGallery() {
  const { morphId } = useParams();
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const speciesId = selectedSpeciesId || selectedSpecies?.id || 'heterodon-nasicus';
  const species = selectedSpecies ?? findSnakeSpecies(speciesId);
  const morph = useMemo(() => speciesId === 'heterodon-nasicus'
    ? masterMorphs.find((entry) => entry.geneId === morphId)
    : getSpeciesVisualMorphs(speciesId).find((entry) => entry.geneId === morphId), [morphId, speciesId]);
  const [media, setMedia] = useState<ApprovedMorphImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApprovedMorphImage | null>(null);
  const speciesName = species?.commonNames[0] ?? species?.acceptedScientificName ?? 'Selected species';

  useEffect(() => {
    if (!morph) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    void getApprovedMorphImages(morph.geneId, speciesId).then((items) => {
      if (!cancelled) setMedia(items.filter((item) => Boolean(item.imageUrl)));
    }).catch(() => {
      if (!cancelled) setMedia([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [morph, speciesId]);

  if (!morph) return <main className="page-container morph-library-page"><BackHomeButton /><section className="tracker-card"><h1>Morph gallery not found</h1><p>This morph is not published for {speciesName}.</p><Link className="morph-card__open" to="/morph-library">Back to Morph Library</Link></section></main>;

  return <main className="page-container morph-library-page">
    <BackHomeButton />
    <header className="morph-library__header">
      <div className="morph-library__eyebrow">📷 TINY TITANS · MORPH GALLERY</div>
      <h1>{morph.name}</h1>
      <p>{speciesName} · {loading ? 'Loading approved community media…' : `${media.length} approved ${media.length === 1 ? 'submission' : 'submissions'}`}</p>
      <div className="morph-library__filters"><Link className="morph-card__open" to={`/morph-library/${encodeURIComponent(morph.geneId)}`}>← Morph Information</Link><Link className="morph-card__image-submit" to={`/morph-library?submitMorphImage=1&morphId=${encodeURIComponent(morph.geneId)}`}>📷 Add submission</Link></div>
    </header>

    <section className="morph-community-gallery morph-community-gallery--page">
      <div className="morph-community-gallery__header"><div><h2>All approved examples</h2><p>Every approved image and video is kept as its own gallery item. New submissions never replace older examples.</p></div></div>
      {loading ? <p className="morph-community-gallery__state">Loading {morph.name} gallery…</p> : media.length === 0 ? <div className="morph-community-gallery__state"><strong>No approved community submissions yet.</strong><span>The gallery is ready for the first {speciesName} · {morph.name} example.</span></div> : <div className="morph-community-gallery__grid">{media.map((item, index) => mediaKind(item) === 'video' ? <button key={item.id ?? index} type="button" className="morph-community-gallery__card" onClick={() => setSelected(item)}><video src={item.imageUrl} muted playsInline preload="metadata" aria-label={`${morph.name} community video ${index + 1}`} /><span className="morph-community-gallery__media-badge">▶ VIDEO</span>{item.description && <span className="morph-community-gallery__description">{item.description}</span>}{(item.creditName || item.creditSocial) && <span className="morph-community-gallery__credit">{item.creditName || item.creditSocial}</span>}</button> : <button key={item.id ?? index} type="button" className="morph-community-gallery__card" onClick={() => setSelected(item)}><img src={item.imageUrl} alt={`${morph.name} community example ${index + 1}`} loading={index < 4 ? 'eager' : 'lazy'} />{item.description && <span className="morph-community-gallery__description">{item.description}</span>}{(item.creditName || item.creditSocial) && <span className="morph-community-gallery__credit">{item.creditName || item.creditSocial}</span>}</button>)}</div>}
    </section>

    {selected && <div className="morph-community-gallery__lightbox" role="presentation" onMouseDown={() => setSelected(null)}><button type="button" className="morph-community-gallery__lightbox-close" onClick={() => setSelected(null)} aria-label="Close media">×</button>{mediaKind(selected) === 'video' ? <video src={selected.imageUrl} controls playsInline autoPlay onMouseDown={(event) => event.stopPropagation()} /> : <img src={selected.imageUrl} alt={`${morph.name} community example`} onMouseDown={(event) => event.stopPropagation()} />}{selected.description && <p className="morph-community-gallery__lightbox-description">{selected.description}</p>}{selected.observedTraits && <p><strong>Observed traits:</strong> {selected.observedTraits}</p>}{selected.proofDetails && <p><strong>Evidence:</strong> {selected.proofDetails}</p>}{selected.proofReference && <p><strong>Reference:</strong> {selected.proofReference}</p>}{(selected.creditName || selected.creditSocial) && <p>Credit: {selected.creditName || selected.creditSocial}</p>}</div>}
  </main>;
}