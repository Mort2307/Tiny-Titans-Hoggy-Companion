import BackHomeButton from "../components/BackHomeButton";
import CreatorMorphLibraryEditor from "../components/CreatorMorphLibraryEditor";

export default function CreatorMorphLibrary() {
  return (
    <main className="page-container">
      <BackHomeButton fallback="/creator" />
      <CreatorMorphLibraryEditor />
    </main>
  );
}
