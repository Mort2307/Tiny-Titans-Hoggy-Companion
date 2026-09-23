import { useState } from "react";
import type { ApprovedMorphImage } from "../../types/morphSubmission";
import type { EditorImage } from "../../types/creatorMorphLibraryEditor";

export function CreditDialog({
  image,
  onClose,
  onSave,
  busy,
}: {
  image: EditorImage;
  onClose: () => void;
  onSave: (creditType: ApprovedMorphImage["creditType"], name: string, social: string) => Promise<void>;
  busy: boolean;
}) {
  const [type, setType] = useState<ApprovedMorphImage["creditType"]>(image.creditType);
  const [name, setName] = useState(image.creditName ?? "");
  const [social, setSocial] = useState(image.creditSocial ?? "");

  return (
    <div className="creator-morph-editor-backdrop">
      <section className="creator-morph-editor-modal creator-morph-editor-modal--small" role="dialog" aria-modal="true" aria-labelledby="credit-title">
        <div className="creator-morph-editor-modal-head">
          <div>
            <p className="creator-morph-editor-kicker">ATTRIBUTION</p>
            <h2 id="credit-title">Edit image credit</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy}>×</button>
        </div>
        <div className="creator-morph-editor-credit-options">
          {(["name", "social", "anonymous"] as const).map((value) => (
            <button key={value} type="button" className={type === value ? "is-selected" : ""} onClick={() => setType(value)}>
              {value === "name" ? "Name" : value === "social" ? "Social handle" : "Anonymous"}
            </button>
          ))}
        </div>
        {type === "name" && <label>Contributor name<input value={name} onChange={(e) => setName(e.target.value)} /></label>}
        {type === "social" && <label>Social handle<input value={social} onChange={(e) => setSocial(e.target.value)} placeholder="@handle" /></label>}
        <div className="creator-morph-editor-actions">
          <button type="button" className="creator-morph-editor-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="creator-morph-editor-button creator-morph-editor-button--primary" onClick={() => void onSave(type, name, social)} disabled={busy || (type === "name" && !name.trim()) || (type === "social" && !social.trim())}>
            {busy ? "Saving…" : "Save credit"}
          </button>
        </div>
      </section>
    </div>
  );
}
