import { useMemo, useState } from "react";
import TinyTitansIcon from "../TinyTitansIcon";
import type { MasterMorphDefinition } from "../../data/masterMorphDatabase";
import type { EditorImage } from "../../types/creatorMorphLibraryEditor";
import { normaliseMorphSearch, searchableMorphText } from "../../lib/creatorMorphLibraryEditor";
import { TargetMorphPicker } from "./TargetMorphPicker";

export function SwapDialog({
  image,
  allImages,
  onClose,
  onSwap,
  busy,
}: {
  image: EditorImage;
  allImages: EditorImage[];
  onClose: () => void;
  onSwap: (replacement: EditorImage) => Promise<void>;
  busy: boolean;
}) {
  const [targetMorph, setTargetMorph] = useState<MasterMorphDefinition | null>(null);
  const [imageSearch, setImageSearch] = useState("");

  const candidates = useMemo(() => {
    const needle = normaliseMorphSearch(imageSearch);
    return allImages.filter(
      (candidate) =>
        candidate.id !== image.id &&
        targetMorph?.geneId === candidate.morphId &&
        (!needle ||
          [candidate.morphName, candidate.creditName, candidate.creditSocial, candidate.id]
            .map(searchableMorphText)
            .some((value) => value.includes(needle))),
    );
  }, [allImages, image.id, imageSearch, targetMorph]);

  return (
    <div className="creator-morph-editor-backdrop">
      <section className="creator-morph-editor-modal" role="dialog" aria-modal="true" aria-labelledby="swap-title">
        <div className="creator-morph-editor-modal-head">
          <div>
            <p className="creator-morph-editor-kicker">IMAGE SWAP</p>
            <h2 id="swap-title">Swap this image</h2>
            <p>Choose the destination morph, then pick the exact approved image currently assigned there. Both assignments will swap.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog"><TinyTitansIcon name="close" size={17} /></button>
        </div>
        <div className="creator-morph-editor-swap-current">
          <img src={image.imageUrl} alt={image.morphName} />
          <div>
            <strong>Current: {image.morphName}</strong>
            <span>{image.id}</span>
          </div>
        </div>
        <h3>1. Which morph should this image belong to?</h3>
        <TargetMorphPicker currentMorphId={image.morphId} onSelect={(entry) => { setTargetMorph(entry); setImageSearch(""); }} selectedId={targetMorph?.geneId ?? ""} />
        {targetMorph && (
          <>
            <h3>2. Which approved image is currently there?</h3>
            <input value={imageSearch} onChange={(e) => setImageSearch(e.target.value)} placeholder={`Search ${targetMorph.name} images by credit or ID…`} aria-label="Search replacement image" />
            <div className="creator-morph-editor-image-grid">
              {candidates.map((candidate) => (
                <button type="button" key={candidate.id} className="creator-morph-editor-image-option" onClick={() => void onSwap(candidate)} disabled={busy}>
                  <img src={candidate.imageUrl} alt={`Candidate ${candidate.morphName}`} />
                  <span><strong>{candidate.morphName}</strong><small>{candidate.creditName || candidate.creditSocial || "Anonymous"}</small></span>
                </button>
              ))}
            </div>
            {candidates.length === 0 && <p className="creator-morph-editor-muted">No approved image is currently assigned to {targetMorph.name}. Use Move instead.</p>}
          </>
        )}
      </section>
    </div>
  );
}
