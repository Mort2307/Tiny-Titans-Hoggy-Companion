import { useState } from "react";
import TinyTitansIcon from "../TinyTitansIcon";
import type { EditorImage } from "../../types/creatorMorphLibraryEditor";
import { cropMorphImage } from "../../lib/creatorMorphLibraryEditor";

export function CropDialog({
  image,
  onClose,
  onSave,
  busy,
}: {
  image: EditorImage;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
  busy: boolean;
}) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [error, setError] = useState("");

  const right = Math.max(left + 1, Math.min(100, left + width));
  const bottom = Math.max(top + 1, Math.min(100, top + height));
  const cropArea = { left, top, width: right - left, height: bottom - top };

  async function handleSave() {
    setError("");
    try {
      await onSave(
        await cropMorphImage(
          image.imageUrl,
          cropArea.left,
          cropArea.top,
          cropArea.width,
          cropArea.height,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The image crop could not be prepared.",
      );
    }
  }

  return (
    <div className="creator-morph-editor-backdrop">
      <section
        className="creator-morph-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        <div className="creator-morph-editor-modal-head">
          <div>
            <p className="creator-morph-editor-kicker">IMAGE EDITOR</p>
            <h2 id="crop-title">Crop {image.morphName}</h2>
            <p>
              Adjust the crop, then save it as a new image version. The previous
              version is retained so you can undo it.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog"><TinyTitansIcon name="close" size={17} /></button>
        </div>
        <div className="creator-crop-stage">
          <img src={image.imageUrl} alt="Crop preview" />
          <div
            className="creator-crop-window"
            style={{
              left: `${cropArea.left}%`,
              top: `${cropArea.top}%`,
              width: `${cropArea.width}%`,
              height: `${cropArea.height}%`,
            }}
          >
            <span>KEEP</span>
          </div>
        </div>
        <div className="creator-crop-grid">
          <label>
            Left
            <input
              type="range"
              min="0"
              max="99"
              value={left}
              onChange={(e) => {
                const next = Number(e.target.value);
                setLeft(next);
                setWidth((current) => Math.min(current, 100 - next));
              }}
            />
            <output>{left}%</output>
          </label>
          <label>
            Top
            <input
              type="range"
              min="0"
              max="99"
              value={top}
              onChange={(e) => {
                const next = Number(e.target.value);
                setTop(next);
                setHeight((current) => Math.min(current, 100 - next));
              }}
            />
            <output>{top}%</output>
          </label>
          <label>
            Width
            <input
              type="range"
              min="1"
              max={100 - left}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
            <output>{width}%</output>
          </label>
          <label>
            Height
            <input
              type="range"
              min="1"
              max={100 - top}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
            <output>{height}%</output>
          </label>
        </div>
        {error && <p className="creator-error" role="alert">{error}</p>}
        <div className="creator-morph-editor-actions">
          <button type="button" className="creator-morph-editor-button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="creator-morph-editor-button creator-morph-editor-button--primary" disabled={busy} onClick={() => void handleSave()}>
            {busy ? "Cropping…" : "Crop & save version"}
          </button>
        </div>
      </section>
    </div>
  );
}
