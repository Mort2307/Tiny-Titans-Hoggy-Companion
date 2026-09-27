import { useState } from "react";
import TinyTitansIcon from "../TinyTitansIcon";
import type { MasterMorphDefinition } from "../../data/masterMorphDatabase";
import type { EditorImage } from "../../types/creatorMorphLibraryEditor";
import { TargetMorphPicker } from "./TargetMorphPicker";

export function MoveDialog({
  image,
  onClose,
  onMove,
  busy,
}: {
  image: EditorImage;
  onClose: () => void;
  onMove: (target: MasterMorphDefinition) => Promise<void>;
  busy: boolean;
}) {
  const [target, setTarget] = useState<MasterMorphDefinition | null>(null);

  return (
    <div className="creator-morph-editor-backdrop">
      <section className="creator-morph-editor-modal creator-morph-editor-modal--small" role="dialog" aria-modal="true" aria-labelledby="move-title">
        <div className="creator-morph-editor-modal-head">
          <div>
            <p className="creator-morph-editor-kicker">IMAGE MOVE</p>
            <h2 id="move-title">Move {image.morphName} image</h2>
            <p>Use this when there is no image to swap. The image will simply be assigned to the target morph.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog"><TinyTitansIcon name="close" size={17} /></button>
        </div>
        <TargetMorphPicker currentMorphId={image.morphId} onSelect={setTarget} selectedId={target?.geneId ?? ""} />
        {target && (
          <div className="creator-morph-editor-actions">
            <button type="button" className="creator-morph-editor-button" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="creator-morph-editor-button creator-morph-editor-button--primary" onClick={() => void onMove(target)} disabled={busy}>
              {busy ? "Moving…" : `Move to ${target.name}`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
