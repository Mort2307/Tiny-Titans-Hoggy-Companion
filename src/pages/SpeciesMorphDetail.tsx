import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSpeciesContext } from '../context/SpeciesContext';
import { findSnakeSpecies } from '../data/species/speciesRegistry';
import { getSpeciesVisualMorphs } from '../data/species/speciesGenetics';
import { masterMorphs } from '../data/masterMorphDatabase';
import BackHomeButton from '../components/BackHomeButton';
import '../styles/morphLibrary.css';

export default function SpeciesMorphDetail() {
  const { morphId } = useParams();
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const speciesId = selectedSpeciesId || selectedSpecies?.id || 'heterodon-nasicus';
  const species = selectedSpecies ?? findSnakeSpecies(speciesId);
  const morph = useMemo(() => speciesId === 'heterodon-nasicus'
    ? masterMorphs.find((entry) => entry.id === morphId || entry.geneId === morphId)
    : getSpeciesVisualMorphs(speciesId).find((entry) => entry.geneId === morphId), [morphId, speciesId]);
  const speciesName = species?.commonNames[0] ?? species?.acceptedScientificName ?? 'Selected species';

  if (!morph) return <main className="page-container morph-library-page"><BackHomeButton /><section className="tracker-card"><h1>Morph not found</h1><p>This morph is not published for {speciesName} in the current species context.</p><Link className="morph-card__open" to="/morph-library">Back to Morph Library</Link></section></main>;

  const components = 'components' in morph ? (morph.components ?? []).map((item) => item.morphId) : ('contains' in morph ? (morph.contains ?? []) : []);
  const description = morph.description ?? 'No full description has been published yet.';
  const notes = morph.educationalNotes ?? 'No additional educational notes have been published yet.';
  const galleryPath = `/morph-library/${encodeURIComponent(morph.geneId ?? morph.id)}/gallery`;

  return <main className="page-container morph-library-page">
    <BackHomeButton />
    <header className="morph-library__header">
      <div className="morph-library__eyebrow">🧬 TINY TITANS · MORPH INTELLIGENCE</div>
      <h1>{morph.name}</h1>
      <p>{speciesName} · complete published morph record</p>
      <div className="morph-library__filters"><Link className="morph-card__open" to="/morph-library">← Back to Morph Library</Link><Link className="morph-card__image-submit" to={galleryPath}>📷 Morph Gallery</Link></div>
    </header>

    <section className="morph-detail morph-detail--page">
      <div className="morph-detail__badges"><span>{morph.kind}</span><span>{morph.category}</span><span>{morph.inheritance}</span><span>{morph.verification}</span></div>
      <section className="morph-detail__section"><h2>What is {morph.name}?</h2><p className="morph-detail__description">{description}</p></section>
      <section className="morph-detail__section"><h2>How it works</h2><p>{notes}</p><p><strong>Species boundary:</strong> This record belongs specifically to {speciesName}. Tiny Titans does not import another species' genetics to fill a missing field.</p></section>
      {morph.aliases?.length ? <section className="morph-detail__section"><h2>Recognised names</h2><p>{morph.aliases.join(' · ')}</p></section> : null}
      {components.length ? <section className="morph-detail__section"><h2>Genetic components</h2><ul>{components.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
      <section className="morph-detail__section"><h2>Inheritance & classification</h2><p><strong>Inheritance:</strong> {morph.inheritance}</p><p><strong>Type:</strong> {morph.kind}</p><p><strong>Classification:</strong> {morph.category}</p><p><strong>Verification:</strong> {morph.verification}</p></section>
      <section className="morph-detail__section"><h2>📷 Community record</h2><p>Every approved submission is retained as a separate item. Multiple keepers can contribute examples without replacing or overwriting earlier media.</p><Link className="morph-card__image-submit" to={galleryPath}>Open {morph.name} Morph Gallery →</Link></section>
      <section className="morph-detail__source"><strong>Reference</strong><span>{morph.sourceLabel ?? 'Tiny Titans canonical species genetics record'}</span>{morph.sourceUrl ? <a href={morph.sourceUrl} target="_blank" rel="noreferrer">Open source reference →</a> : null}</section>
    </section>
  </main>;
}
