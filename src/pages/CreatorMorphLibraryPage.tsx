import BackHomeButton from "../components/BackHomeButton";
import CreatorMorphLibraryEditor from "../components/CreatorMorphLibraryEditor";
import "../styles/CreatorMorphLibraryEditor.css";

export default function CreatorMorphLibraryPage() {
  return (
    <main className="page-container">
      <BackHomeButton fallback="/creator" />
      <section className="creator-landing-section">
        <div className="creator-landing-section-heading">
          <div>
            <p className="eyebrow">PRIVATE CREATOR TOOL · MORPH LIBRARY</p>
            <h1>🧬 Morph Library Editor</h1>
            <p>Repair approved Morph Library imagery without touching the canonical genetics database. Search a morph, crop an image, move it, edit its credit, or swap it with the exact approved image currently assigned to another morph.</p>
          </div>
        </div>
        <CreatorMorphLibraryEditor />
      </section>
    </main>
  );
}
