import { useRef, useState } from "react";
import { submitCommunityVariationImageV2, type MorphCreditMode } from "../../services/morphSubmissionServiceV2";
import type { ApprovedCommunityVariationCard } from "../../services/communityVariationCardService";
import TinyTitansIcon from "../TinyTitansIcon";

type Props = {
  card: ApprovedCommunityVariationCard;
  speciesId: string;
  speciesName: string;
  onClose: () => void;
};

export default function CommunityVariationImageSubmissionDialog({ card, speciesId, speciesName, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [observedTraits, setObservedTraits] = useState("");
  const [proofDetails, setProofDetails] = useState("");
  const [proofReference, setProofReference] = useState("");
  const [photoRequirementsConfirmed, setPhotoRequirementsConfirmed] = useState(false);
  const [factualAccuracyConfirmed, setFactualAccuracyConfirmed] = useState(false);
  const [creditMode, setCreditMode] = useState<MorphCreditMode>("anonymous");
  const [creditName, setCreditName] = useState("");
  const [creditSocial, setCreditSocial] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!image) { setError("Please choose a photograph or video."); return; }
    setBusy(true);
    try {
      await submitCommunityVariationImageV2({
        variationCardId: card.id,
        speciesId,
        description,
        observedTraits,
        proofDetails,
        proofReference,
        image,
        factualAccuracyConfirmed,
        photoRequirementsConfirmed,
        creditMode,
        creditName,
        creditSocial,
      });
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit this variation-card media.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="morph-detail-backdrop" role="presentation" onMouseDown={() => !busy && onClose()}>
      <article className="morph-detail" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="morph-detail__close" type="button" onClick={onClose} disabled={busy} aria-label="Close"><TinyTitansIcon name="close" size={14} /></button>

        {sent ? (
          <>
            <div className="morph-detail__eyebrow"><TinyTitansIcon name="camera" size={14} /> MEDIA SUBMITTED</div>
            <h2>Thanks — your {card.name} media is in review.</h2>
            <p className="morph-detail__description">If approved, it will become a community reference image for this variation card. The image does not change the card's unresolved genetics status.</p>
            <button type="button" onClick={onClose}>Done</button>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <div className="morph-detail__eyebrow"><TinyTitansIcon name="camera" size={14} /> COMMUNITY VARIATION MEDIA</div>
            <h2>Contribute media for {card.name}</h2>
            <p className="morph-detail__description"><strong>{speciesName}</strong> · reviewed community variation card. Media supports identification and education; it does not prove inheritance.</p>

            <label>
              What are we looking at?
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} required placeholder="Describe the animal and why this image represents the reviewed variation card." />
            </label>

            <label>
              Observed traits
              <textarea value={observedTraits} onChange={(event) => setObservedTraits(event.target.value)} rows={3} placeholder="Colour, pattern, locality traits, line-bred characteristics, etc." />
            </label>

            <label>
              Evidence / keeper context
              <textarea value={proofDetails} onChange={(event) => setProofDetails(event.target.value)} rows={3} required placeholder="Breeder identity, lineage note, locality context, known history, or other supporting context." />
            </label>

            <label>
              Optional reference
              <input value={proofReference} onChange={(event) => setProofReference(event.target.value)} placeholder="Breeder record or reference URL" />
            </label>

            <section className="morph-detail__section">
              <h3>Photo or video</h3>
              <input
                ref={fileRef}
                className="morph-submit-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
                onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                required
              />
              <button type="button" className="morph-submit-photo-button" onClick={() => fileRef.current?.click()}><TinyTitansIcon name="camera" size={14} /> {image ? "Change media" : "Add media"}</button>
              {image && <p className="morph-detail__source-note">Selected: <strong>{image.name}</strong></p>}
            </section>

            <label className="morph-submit-check">
              <input type="checkbox" checked={photoRequirementsConfirmed} onChange={(event) => setPhotoRequirementsConfirmed(event.target.checked)} />
              <span>I confirm this is clear, relevant media and I have permission to contribute it.</span>
            </label>

            <label className="morph-submit-check">
              <input type="checkbox" checked={factualAccuracyConfirmed} onChange={(event) => setFactualAccuracyConfirmed(event.target.checked)} />
              <span>I confirm this media genuinely represents this reviewed variation card and understand that it does not prove a genetic mechanism.</span>
            </label>

            <section className="morph-detail__section">
              <h3>Credit</h3>
              <select value={creditMode} onChange={(event) => setCreditMode(event.target.value as MorphCreditMode)}>
                <option value="anonymous">Anonymous</option>
                <option value="name">Show my name</option>
                <option value="social">Show my social handle</option>
              </select>
              {creditMode === "name" && <input value={creditName} onChange={(event) => setCreditName(event.target.value)} placeholder="Display name" />}
              {creditMode === "social" && <input value={creditSocial} onChange={(event) => setCreditSocial(event.target.value)} placeholder="@handle or profile link" />}
            </section>

            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit media for review"}</button>
          </form>
        )}
      </article>
    </div>
  );
}
