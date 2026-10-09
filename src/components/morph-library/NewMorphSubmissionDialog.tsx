import { useNewMorphSubmission } from "../../hooks/useNewMorphSubmission";
import UniversalSpeciesPicker from "../UniversalSpeciesPicker";
import TinyTitansIcon from "../TinyTitansIcon";

type Props = {
  onClose: () => void;
  initialSpeciesId?: string;
};

export default function NewMorphSubmissionDialog({ onClose, initialSpeciesId = "" }: Props) {
  const {
    speciesId, setSpeciesId, name, setName, region, setRegion, category, setCategory,
    description, setDescription, knownGenetics, setKnownGenetics, source, setSource,
    sourceUrl, setSourceUrl, busy, sent, error, selectedSpecies, submit,
  } = useNewMorphSubmission(initialSpeciesId);

  return (
    <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="morph-detail" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="morph-detail__close" type="button" onClick={onClose} aria-label="Close"><TinyTitansIcon name="close" size={14} /></button>

        {sent ? (
          <>
            <div className="morph-detail__eyebrow"><TinyTitansIcon name="genetics" size={14} /> VARIATION CARD PROPOSED</div>
            <h2>Thanks — {name} is now in review.</h2>
            <p className="morph-detail__description">
              Your proposal is tagged to {selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName}. It will not become an official morph, gene or breeding-calculator entry automatically. Creator review decides whether it is a documented variation, locality, line-bred trait, alias, combination, genuine genetic identity, or something that should remain unverified.
            </p>
            <button type="button" onClick={onClose}>Done</button>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <div className="morph-detail__eyebrow"><TinyTitansIcon name="genetics" size={14} /> COMMUNITY VARIATION PROPOSAL</div>
            <h2>Suggest a morph or variation card</h2>
            <p className="morph-detail__description">
              Wild Type / Unclassified is the safe default for every species. Use this form only when you have a named or observable variation worth documenting. Submission does not make a genetic claim.
            </p>

            <UniversalSpeciesPicker
              value={speciesId}
              onChange={(species) => setSpeciesId(species?.id ?? "")}
              label="Species"
              allowUnknown={false}
            />

            <label>
              Morph / variation name
              <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Name used by breeder, community or reference" />
            </label>

            <label>
              Where did you encounter this terminology?
              <select value={region} onChange={(event) => setRegion(event.target.value as typeof region)}>
                <option value="uk">UK</option>
                <option value="usa">USA</option>
                <option value="europe">Europe</option>
                <option value="australia">Australia</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              What does it appear to be?
              <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
                <option value="unknown">Not sure / needs review</option>
                <option value="colour-variation">Colour variation</option>
                <option value="pattern-variation">Pattern variation</option>
                <option value="locality">Locality / geographic form</option>
                <option value="line-bred">Line-bred / selectively bred</option>
                <option value="polygenic">Polygenic</option>
                <option value="single-gene">Possible single gene</option>
                <option value="super-form">Possible super / homozygous form</option>
                <option value="combination">Possible combination</option>
                <option value="regional-name">Regional name / alias</option>
              </select>
            </label>

            <p className="morph-detail__source-note">
              This category is your observation only. Tiny Titans does not treat “possible gene”, colour, pattern or locality labels as proven genetics until separately reviewed.
            </p>

            <label>
              What do you know about it?
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} required placeholder="Appearance, where you saw it, breeder terminology, lineage context, locality, etc." />
            </label>

            <label>
              Known genetics (optional)
              <textarea value={knownGenetics} onChange={(event) => setKnownGenetics(event.target.value)} rows={3} placeholder="Parents, inheritance claims, test breeding, breeder information… Leave blank if unknown." />
            </label>

            <label>Breeder / source (optional)<input value={source} onChange={(event) => setSource(event.target.value)} /></label>
            <label>Source URL (optional)<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label>

            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit variation card for review"}</button>
          </form>
        )}
      </article>
    </div>
  );
}
