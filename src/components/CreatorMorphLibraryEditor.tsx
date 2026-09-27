import { Link } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
import TinyTitansFeedback from "./TinyTitansFeedback";
import TinyTitansEmptyState from "./TinyTitansEmptyState";
import { useAuth } from "../context/useAuth";
import { useCreatorMorphLibraryEditor } from "../hooks/useCreatorMorphLibraryEditor";
import { CropDialog } from "../components/creator-morph-editor/CropDialog";
import { SwapDialog } from "../components/creator-morph-editor/SwapDialog";
import { MoveDialog } from "../components/creator-morph-editor/MoveDialog";
import { CreditDialog } from "../components/creator-morph-editor/CreditDialog";
import "../styles/CreatorMorphLibraryEditor.css";

export default function CreatorMorphLibraryEditor() {
  const { profile } = useAuth();
  const {
    queryText,
    setQueryText,
    selectedMorphId,
    morphOptions,
    selectedMorph,
    images,
    allImages,
    loading,
    working,
    notice,
    error,
    cropImage,
    setCropImage,
    swapImage,
    setSwapImage,
    moveImage,
    setMoveImage,
    creditImage,
    setCreditImage,
    loadMorph,
    replaceImage,
    undoImageEdit,
    swapImages,
    moveImageTo,
    saveCredit,
    removeImage,
  } = useCreatorMorphLibraryEditor();

  if (profile?.role !== "admin") return null;

  return (
    <main className="page-container creator-morph-editor-page">
      <div className="creator-morph-editor-header">
        <div>
          <Link to="/creator" className="creator-morph-editor-back"><TinyTitansIcon name="back" size={15} /> Creator Hub</Link>
          <p className="creator-morph-editor-kicker">CREATOR CENTRE · MORPH LIBRARY</p>
          <h1><TinyTitansIcon name="morph" size={26} /> Morph Library Editor</h1>
          <p>Correct approved reference imagery without editing the bundled genetics database directly.</p>
        </div>
      </div>

      {notice && <TinyTitansFeedback kind="success" className="creator-success">{notice}</TinyTitansFeedback>}
      {error && <TinyTitansFeedback kind="error" className="creator-error">{error}</TinyTitansFeedback>}

      <section className="creator-morph-editor-panel">
        <h2>Find a morph</h2>
        <input
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Type the morph name, alias or canonical ID…"
          aria-label="Search Morph Library"
        />
        <div className="creator-morph-editor-results">
          {morphOptions.map((entry) => (
            <button
              type="button"
              key={entry.geneId}
              onClick={() => void loadMorph(entry.geneId)}
              className={selectedMorphId === entry.geneId ? "is-selected" : ""}
            >
              <strong>{entry.name}</strong>
              <span>{entry.geneId} · {entry.kind} · {entry.verification}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedMorph && (
        <section className="creator-morph-editor-panel">
          <div className="creator-section-heading">
            <p className="creator-morph-editor-kicker">EDITING</p>
            <h2>{selectedMorph.name}</h2>
            <p>
              {loading
                ? "Loading approved images…"
                : `${images.length} approved image${images.length === 1 ? "" : "s"} assigned to this morph.`}
            </p>
          </div>

          {!loading && images.length === 0 ? (
            <TinyTitansEmptyState compact icon="camera" title="No approved images for this morph" description="Use the submission review flow to approve a new reference image." />
          ) : (
            <div className="creator-morph-editor-image-list">
              {images.map((image) => (
                <article key={image.id} className="creator-morph-editor-image-card">
                  <img src={image.imageUrl} alt={`${image.morphName} approved reference`} />
                  <div>
                    <strong>{image.morphName}</strong>
                    <span>{image.creditName || image.creditSocial || "Anonymous"}</span>
                    <small>{image.id}</small>
                    {image.editHistory?.length ? (
                      <small>
                        {image.editHistory.length} previous image version
                        {image.editHistory.length === 1 ? "" : "s"} retained
                      </small>
                    ) : null}
                    <div className="creator-morph-editor-image-actions">
                      <button type="button" onClick={() => setCropImage(image)} disabled={working}><TinyTitansIcon name="camera" size={15} /> Crop</button>
                      {image.editHistory?.length ? <button type="button" className="is-undo" onClick={() => void undoImageEdit(image)} disabled={working}><TinyTitansIcon name="rotate" size={15} /> Undo edit</button> : null}
                      <button type="button" onClick={() => setSwapImage(image)} disabled={working}><TinyTitansIcon name="duplicate" size={15} /> Swap</button>
                      <button type="button" onClick={() => setMoveImage(image)} disabled={working}><TinyTitansIcon name="move" size={15} /> Move</button>
                      <button type="button" onClick={() => setCreditImage(image)} disabled={working}><TinyTitansIcon name="edit" size={15} /> Credit</button>
                      <button type="button" onClick={() => void removeImage(image)} disabled={working}><TinyTitansIcon name="delete" size={15} /> Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {cropImage && (
        <CropDialog image={cropImage} onClose={() => setCropImage(null)} onSave={(blob) => replaceImage(blob, cropImage)} busy={working} />
      )}
      {swapImage && (
        <SwapDialog image={swapImage} allImages={allImages} onClose={() => setSwapImage(null)} onSwap={swapImages} busy={working} />
      )}
      {moveImage && (
        <MoveDialog image={moveImage} onClose={() => setMoveImage(null)} onMove={moveImageTo} busy={working} />
      )}
      {creditImage && (
        <CreditDialog image={creditImage} onClose={() => setCreditImage(null)} onSave={saveCredit} busy={working} />
      )}
    </main>
  );
}
