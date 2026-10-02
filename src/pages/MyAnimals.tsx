import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import UniversalSpeciesPicker from "../components/UniversalSpeciesPicker";
import { createUserAnimal, deleteUserAnimal } from "../services/universalAnimalService";
import { deleteUserSnake } from "../services/snakeService";
import { getUnifiedAnimalDirectory, universalAnimalToDirectory, type UnifiedAnimalDirectoryRecord } from "../services/animalDirectoryService";
import { useAuth } from "../context/useAuth";
import type { UniversalAnimalRecord } from "../types/UniversalAnimal";
import type { UniversalSpeciesRecord } from "../data/species/universalSpeciesTypes";
import "../styles/universal-animals.css";
import { KEEPER_COMPANION_TERMINOLOGY } from "../config/keeperTerminology";
import { getTinyTitansErrorMessage } from "../utils/firebaseError";
import TinyTitansIcon from "../components/TinyTitansIcon";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansEmptyState from "../components/TinyTitansEmptyState";
import TinyTitansFeedback from "../components/TinyTitansFeedback";

function AnimalCollectionAvatar({ animal }: { animal: UnifiedAnimalDirectoryRecord }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = animal.photoUrl?.trim();

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  return (
    <div className={`universal-animal-avatar${photoUrl && !imageFailed ? " has-photo" : ""}`} aria-hidden="true">
      <TinyTitansIcon name={animal.source === "legacy-snake" ? "reptile" : "animals"} size={28} />
      {photoUrl && !imageFailed && (
        <img src={photoUrl} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
      )}
    </div>
  );
}

export default function MyAnimals() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const speciesFilter = searchParams.get("species") || "";
  const [animals, setAnimals] = useState<UnifiedAnimalDirectoryRecord[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<UniversalSpeciesRecord | null>(null);
  const [name, setName] = useState("");
  const [sex, setSex] = useState<UniversalAnimalRecord["sex"]>("unknown");
  const [status, setStatus] = useState<UniversalAnimalRecord["status"]>("active");
  const [morphOrColour, setMorphOrColour] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingAnimalId, setDeletingAnimalId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UnifiedAnimalDirectoryRecord | null>(null);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const visibleAnimals = speciesFilter
    ? animals.filter((animal) => animal.speciesId === speciesFilter || animal.speciesCommonName?.toLowerCase() === speciesFilter.toLowerCase())
    : animals;

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getUnifiedAnimalDirectory(user.uid)
      .then((records) => {
        if (!active) return;
        setAnimals(records);
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Unable to load your animal collection."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function deleteAnimal(animal: UnifiedAnimalDirectoryRecord) {
    if (!user || deletingAnimalId) return;

    setDeletingAnimalId(animal.id);
    setMessage("");
    setMessageKind("success");

    try {
      if (animal.source === "legacy-snake") {
        await deleteUserSnake(user.uid, animal.id);
      } else {
        await deleteUserAnimal(user.uid, animal.id);
      }

      setAnimals((current) => current.filter((item) => item.id !== animal.id || item.source !== animal.source));
      setMessage(`${animal.name} was deleted from My Animals.`);
      setMessageKind("success");
      setPendingDelete(null);
    } catch (error) {
      setMessage(getTinyTitansErrorMessage(error, `Tiny Titans could not delete ${animal.name}. Please try again.`));
      setMessageKind("error");
    } finally {
      setDeletingAnimalId(null);
    }
  }

  async function addAnimal() {
    if (!user || !name.trim()) return;
    setBusy(true);
    setMessage("");
    setMessageKind("success");
    try {
      const created = await createUserAnimal(user.uid, {
        name: name.trim(),
        speciesId: selectedSpecies?.id,
        speciesCommonName: selectedSpecies?.commonNames[0],
        scientificName: selectedSpecies?.acceptedScientificName,
        animalGroup: selectedSpecies?.className,
        sex,
        status,
        morphOrColour: morphOrColour.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: [],
      });
      setAnimals((current) => [...current, universalAnimalToDirectory(created)].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setMorphOrColour("");
      setNotes("");
      setSelectedSpecies(null);
      setMessage("Animal added to My Animals.");
      setMessageKind("success");
    } catch (error) {
      setMessage(getTinyTitansErrorMessage(error, "Tiny Titans could not add this animal. Please check the form and try again."));
      setMessageKind("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-container universal-animals-page">
      <header className="universal-animals-hero">
        <div className="universal-animals-hero-copy">
          <p className="eyebrow">YOUR COLLECTION</p>
          <h1>My Animals</h1>
          <p>{KEEPER_COMPANION_TERMINOLOGY.collectionDescription} Existing snake records are preserved here alongside universal animal records.</p>
          <div className="universal-animals-hero-actions">
            <a className="universal-primary-action universal-add-shortcut" href="#add-animal"><TinyTitansIcon name="add" size={18} /> Add animal</a>
          </div>
        </div>
        <div className="universal-animals-metrics">
          <strong>{animals.filter((animal) => !["deceased", "archived"].includes(animal.status)).length}</strong>
          <span>active animals</span>
          <strong>{new Set(animals.map((animal) => animal.speciesId).filter(Boolean)).size}</strong>
          <span>species represented</span>
        </div>
      </header>

      <section id="add-animal" className="universal-animals-panel universal-animals-add-panel">
        <p className="eyebrow">ADD INDIVIDUAL</p>
        <h2>Add an individual animal</h2>
        <div className="universal-animal-form">
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <UniversalSpeciesPicker value={selectedSpecies?.id || ""} onChange={setSelectedSpecies} placeholder={KEEPER_COMPANION_TERMINOLOGY.speciesSearchPlaceholder} />
          <label>Sex<select value={sex} onChange={(event) => setSex(event.target.value as UniversalAnimalRecord["sex"])}><option value="unknown">Unknown</option><option value="male">Male</option><option value="female">Female</option><option value="not-applicable">Not applicable</option></select></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as UniversalAnimalRecord["status"])}>{["active","quarantine","rehoming","sold","deceased","archived"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Morph / colour<input value={morphOrColour} onChange={(event) => setMorphOrColour(event.target.value)} /></label>
          <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <button className="universal-primary-action" type="button" disabled={!name.trim() || busy} onClick={() => void addAnimal()}><TinyTitansIcon name={busy ? "save" : "add"} size={18} />{busy ? "Saving…" : "Add animal"}</button>
        {message && <TinyTitansFeedback kind={messageKind} role={messageKind === "error" ? "alert" : "status"}>{message}</TinyTitansFeedback>}
      </section>

      <section className="universal-animals-panel universal-animals-collection-panel">
        <p className="eyebrow">INDIVIDUALS</p>
        <h2>Your animal collection</h2>
        {loading ? <p role="status">Loading your animal collection…</p> : visibleAnimals.length === 0 ? <TinyTitansEmptyState icon="animals" title={speciesFilter ? "No animals match this species filter" : "No animal records yet"} description={speciesFilter ? "Your collection may contain other animals. Clear the species filter to see the full collection." : "Add your first animal to start building care, health and keeper records."} action={speciesFilter ? { label: "Show all animals", icon: "animals", to: "/animals" } : { label: "Add your first animal", icon: "add", href: "#add-animal" }} /> : <div className="universal-animal-list">{visibleAnimals.map((animal) => {
          const rowKey = animal.source + ":" + animal.id;
          const isDeleting = deletingAnimalId === animal.id;
          return (
            <article key={rowKey} className="universal-animal-row">
              <div className="universal-animal-identity">
                <AnimalCollectionAvatar animal={animal} />
                <div className="universal-animal-copy">
                  <strong>{animal.name}</strong>
                  <span>{animal.speciesCommonName || "Awaiting species identification"}</span>
                  <small>{animal.animalGroup || "Animal"} · {animal.status}</small>
                </div>
              </div>
              <div className="universal-animal-actions">
                <Link to={animal.source === "legacy-snake" ? "/snakes/" + animal.id : "/animals/" + animal.id}>Open individual <TinyTitansIcon name="forward" size={15} /></Link>
                <button
                  className="universal-animal-delete"
                  type="button"
                  onClick={() => setPendingDelete(animal)}
                  disabled={Boolean(deletingAnimalId)}
                  aria-label={`Delete ${animal.name}`}
                >
                  <TinyTitansIcon name="delete" size={18} />
                  <span>{isDeleting ? "Deleting…" : "Delete"}</span>
                </button>
              </div>
            </article>
          );
        })}</div>}
      </section>
      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete animal?"}
        description={pendingDelete?.source === "legacy-snake"
          ? "This permanently removes the snake record and its tracker history."
          : "This permanently removes this animal record from My Animals."}
        confirmLabel={pendingDelete ? `Delete ${pendingDelete.name}` : "Delete animal"}
        busy={Boolean(deletingAnimalId)}
        destructive
        onConfirm={() => { if (pendingDelete) void deleteAnimal(pendingDelete); }}
        onCancel={() => { if (!deletingAnimalId) setPendingDelete(null); }}
      />
    </main>
  );
}
