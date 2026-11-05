import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getUserAnimal, updateUserAnimal } from "../services/universalAnimalService";
import { deletePreviousUniversalAnimalPhoto, deleteUploadedUniversalAnimalPhoto, uploadUniversalAnimalPhoto } from "../services/universalAnimalPhotoService";
import { getUserSnake } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import { findUniversalSpecies, UNIVERSAL_SPECIES_BY_ID } from "../data/species/universalSpeciesRegistry";
import type { UniversalAnimalRecord } from "../types/UniversalAnimal";
import { getTinyTitansErrorMessage } from "../utils/firebaseError";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansFeedback from "../components/TinyTitansFeedback";
import BirdCareJournal from "../components/BirdCareJournal";
import "../styles/universal-animals.css";

type EditFields = Pick<UniversalAnimalRecord, "name" | "sex" | "status"> & {
  morphOrColour: string;
  notes: string;
  identifier: string;
  breederOrSource: string;
  origin: string;
  acquisitionDate: string;
  hatchOrBirthDate: string;
};

function toEditFields(record: UniversalAnimalRecord): EditFields {
  return {
    name: record.name,
    sex: record.sex,
    status: record.status,
    morphOrColour: record.morphOrColour || "",
    notes: record.notes || "",
    identifier: record.identifier || "",
    breederOrSource: record.breederOrSource || "",
    origin: record.origin || "",
    acquisitionDate: record.acquisitionDate || "",
    hatchOrBirthDate: record.hatchOrBirthDate || "",
  };
}

export default function UniversalAnimalProfile() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [animal, setAnimal] = useState<UniversalAnimalRecord | null>(null);
  const [legacySnake, setLegacySnake] = useState<Awaited<ReturnType<typeof getUserSnake>>>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!user || !id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError("");
    setAnimal(null);
    setLegacySnake(null);
    setEditing(false);
    setDraft(null);
    setNotice("");
    void (async () => {
      try {
        const individual = await getUserAnimal(user.uid, id);
        if (!active) return;
        if (individual) {
          setAnimal(individual);
          setDraft(toEditFields(individual));
        } else {
          const snake = await getUserSnake(user.uid, id);
          if (active) setLegacySnake(snake);
        }
      } catch (error) {
        if (active) setLoadError(getTinyTitansErrorMessage(error, "We couldn't load this animal. Please try again."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, id, retryCount]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [animal?.photoUrl]);

  async function changeAnimalPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !user || !animal || photoUploading) return;

    setPhotoUploading(true);
    setPhotoError("");
    setNotice("");
    const ownerUid = animal.ownerUid || user.uid;
    const previousPhotoUrl = animal.photoUrl;
    let uploaded: Awaited<ReturnType<typeof uploadUniversalAnimalPhoto>> | undefined;
    let savedToRecord = false;
    try {
      uploaded = await uploadUniversalAnimalPhoto(ownerUid, user.uid, animal.id, file);
      const updated = await updateUserAnimal(user.uid, animal.id, { photoUrl: uploaded.photoUrl });
      savedToRecord = true;
      setAnimal(updated);
      setPhotoFailed(false);
      if (previousPhotoUrl) {
        await deletePreviousUniversalAnimalPhoto(ownerUid, animal.id, previousPhotoUrl)
          .catch((error) => console.warn("Tiny Titans: replaced animal photo could not be cleaned up", error));
      }
      setNotice(updated.name + "'s photo is saved and will appear in My Animals and the Titan Compass.");
    } catch (error) {
      if (uploaded && !savedToRecord) {
        await deleteUploadedUniversalAnimalPhoto(ownerUid, animal.id, uploaded.storagePath)
          .catch((cleanupError) => console.warn("Tiny Titans: failed photo-save cleanup could not complete", cleanupError));
      }
      setPhotoError(getTinyTitansErrorMessage(error, "We couldn't upload this animal photo. Please try again."));
    } finally {
      setPhotoUploading(false);
    }
  }

  function patch<K extends keyof EditFields>(field: K, value: EditFields[K]) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setSaveError("");
    setNotice("");
  }

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !animal || !draft || saving) return;
    if (!draft.name.trim()) {
      setSaveError("Please enter an animal name before saving.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      const updated = await updateUserAnimal(user.uid, animal.id, {
        name: draft.name.trim(),
        sex: draft.sex,
        status: draft.status,
        morphOrColour: draft.morphOrColour.trim(),
        notes: draft.notes.trim(),
        identifier: draft.identifier.trim(),
        breederOrSource: draft.breederOrSource.trim(),
        origin: draft.origin.trim(),
        acquisitionDate: draft.acquisitionDate,
        hatchOrBirthDate: draft.hatchOrBirthDate,
      });
      setAnimal(updated);
      setDraft(toEditFields(updated));
      setEditing(false);
      setNotice("Animal details saved.");
    } catch (error) {
      setSaveError(getTinyTitansErrorMessage(error, "We couldn't save the animal details. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <main className="page-container universal-animals-page"><section className="universal-animals-panel"><h1>Sign in to view your animals</h1><Link to="/login">Sign in</Link></section></main>;
  if (loading) return <main className="page-container universal-animals-page"><section className="universal-animals-panel"><p role="status">Loading individual animal…</p></section></main>;
  if (loadError) return <main className="page-container universal-animals-page"><section className="universal-animals-panel"><h1>Couldn't load animal</h1><TinyTitansFeedback kind="error" role="alert">{loadError}</TinyTitansFeedback><div className="universal-animal-links"><button type="button" className="universal-primary-action" onClick={() => setRetryCount((count) => count + 1)}>Try again</button><Link to="/animals">Back to My Animals</Link></div></section></main>;
  if (!animal && !legacySnake) return <main className="page-container universal-animals-page"><section className="universal-animals-panel"><h1>Animal not found</h1><p>The record may have been removed, or the link may be incorrect.</p><Link to="/animals">Back to My Animals</Link></section></main>;

  const speciesId = animal?.speciesId || legacySnake?.universalSpeciesId || (legacySnake ? findUniversalSpecies(legacySnake.species)?.id : undefined);
  const species = speciesId ? UNIVERSAL_SPECIES_BY_ID[speciesId] : undefined;
  const name = animal?.name || legacySnake?.name || "Animal";
  const common = animal?.speciesCommonName || legacySnake?.species || "Species awaiting identification";
  const scientific = animal?.scientificName || species?.acceptedScientificName;
  const status = animal?.status || (legacySnake?.status === "Deceased" ? "deceased" : "active");

  return <main className="page-container universal-animals-page">
    <Link to="/animals"><TinyTitansIcon name="back" size={15} /> My Animals</Link>
    <section className="universal-animals-hero">
      <div><p className="eyebrow">ANIMAL RECORD</p><h1>{name}</h1><p>{common}{scientific ? " · " + scientific : ""}</p></div>
      <div className="universal-animals-metrics"><strong>{status}</strong><span>status</span></div>
    </section>
    {notice && <TinyTitansFeedback kind="success" role="status">{notice}</TinyTitansFeedback>}
    {animal && <section className="universal-animals-panel universal-animal-photo-panel">
      <div className="universal-animal-photo-avatar">
        {animal.photoUrl && !photoFailed ? <img src={animal.photoUrl} alt={name + " profile"} onError={() => setPhotoFailed(true)} /> : <TinyTitansIcon name="animals" size={54} />}
      </div>
      <div className="universal-animal-photo-copy">
        <p className="eyebrow">INDIVIDUAL PHOTO</p>
        <h2>{animal.photoUrl && !photoFailed ? "Your animal photo" : "Add an animal photo"}</h2>
        <p>This picture appears in My Animals, the Home workspace and the centre of your Titan Compass.</p>
        <label className="universal-animal-photo-upload">
          <span>{photoUploading ? "Uploading photo…" : animal.photoUrl ? "Replace photo" : "Choose a photo"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void changeAnimalPhoto(event)} disabled={photoUploading} />
        </label>
        <small>JPEG, PNG or WebP · maximum 5 MB · stored in your account's protected photo area</small>
        {photoError && <TinyTitansFeedback kind="error" role="alert">{photoError}</TinyTitansFeedback>}
      </div>
    </section>}
    <section className="universal-animals-panel">
      <div className="universal-animal-section-head">
        <div><p className="eyebrow">INDIVIDUAL RECORD</p><h2>About {name}</h2></div>
        {animal && !editing && <button className="universal-primary-action" type="button" onClick={() => { setDraft(toEditFields(animal)); setSaveError(""); setEditing(true); }}>Edit details</button>}
      </div>
      {editing && animal && draft ? (
        <form onSubmit={(event) => void saveChanges(event)}>
          <div className="universal-animal-form">
            <label>Name<input required maxLength={120} value={draft.name} onChange={(event) => patch("name", event.target.value)} disabled={saving} /></label>
            <label>Sex<select value={draft.sex} onChange={(event) => patch("sex", event.target.value as EditFields["sex"])} disabled={saving}><option value="unknown">Unknown</option><option value="male">Male</option><option value="female">Female</option><option value="not-applicable">Not applicable</option></select></label>
            <label>Status<select value={draft.status} onChange={(event) => patch("status", event.target.value as EditFields["status"])} disabled={saving}>{["active", "quarantine", "rehoming", "sold", "deceased", "archived"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Morph / colour<input maxLength={180} value={draft.morphOrColour} onChange={(event) => patch("morphOrColour", event.target.value)} disabled={saving} /></label>
            <label>Ring / individual identifier<input maxLength={120} value={draft.identifier} onChange={(event) => patch("identifier", event.target.value)} disabled={saving} /></label>
            <label>Source / breeder<input maxLength={180} value={draft.breederOrSource} onChange={(event) => patch("breederOrSource", event.target.value)} disabled={saving} /></label>
            <label>Origin<input maxLength={180} value={draft.origin} onChange={(event) => patch("origin", event.target.value)} disabled={saving} /></label>
            <label>Hatch / birth date<input type="date" value={draft.hatchOrBirthDate} onChange={(event) => patch("hatchOrBirthDate", event.target.value)} disabled={saving} /></label>
            <label>Acquisition date<input type="date" value={draft.acquisitionDate} onChange={(event) => patch("acquisitionDate", event.target.value)} disabled={saving} /></label>
            <label className="universal-animal-notes">Notes<textarea rows={4} maxLength={5000} value={draft.notes} onChange={(event) => patch("notes", event.target.value)} disabled={saving} /></label>
          </div>
          {saveError && <TinyTitansFeedback kind="error" role="alert">{saveError}</TinyTitansFeedback>}
          <div className="universal-animal-links">
            <button className="universal-primary-action" type="submit" disabled={saving || !draft.name.trim()}>{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" className="universal-secondary-action" disabled={saving} onClick={() => { setEditing(false); setSaveError(""); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="universal-individual-grid">
            <div><span>Group</span><strong>{animal?.animalGroup || "Animal"}</strong></div>
            <div><span>Sex</span><strong>{animal?.sex || legacySnake?.sex || "Unknown"}</strong></div>
            <div><span>Morph / colour</span><strong>{animal?.morphOrColour || legacySnake?.morphs?.join(", ") || legacySnake?.customMorph || "—"}</strong></div>
            {animal?.identifier && <div><span>Individual identifier</span><strong>{animal.identifier}</strong></div>}
            {animal?.hatchOrBirthDate && <div><span>Hatch / birth</span><strong>{animal.hatchOrBirthDate}</strong></div>}
            {animal?.acquisitionDate && <div><span>Acquired</span><strong>{animal.acquisitionDate}</strong></div>}
            {animal?.breederOrSource && <div><span>Source</span><strong>{animal.breederOrSource}</strong></div>}
          </div>
          {(animal?.notes || legacySnake?.notes) && <p>{animal?.notes || legacySnake?.notes}</p>}
          {legacySnake && <div className="universal-animal-links"><Link to={"/snakes/" + legacySnake.id}>Open snake tracker and history <TinyTitansIcon name="forward" size={15} /></Link></div>}
        </>
      )}
    </section>
    {species && <details className="universal-animals-panel universal-animals-reference"><summary><TinyTitansIcon name="knowledge" size={18} /> Species research and resources <small>{species.commonNames[0]}</small></summary><p className="universal-scientific">{species.acceptedScientificName}</p><div className="universal-animal-links"><Link to={"/species/" + species.id}>Care & health reference <TinyTitansIcon name="forward" size={15} /></Link><Link to={"/marketplace?species=" + encodeURIComponent(species.id)}>Marketplace listings <TinyTitansIcon name="forward" size={15} /></Link><Link to={"/morph-library?species=" + encodeURIComponent(species.id)}>Morph & mutation library <TinyTitansIcon name="forward" size={15} /></Link></div></details>}
    {animal && (animal.animalGroup === "bird" || species?.className === "bird") && <BirdCareJournal uid={user.uid} animalId={animal.id} />}
    {animal && animal.animalGroup !== "bird" && species?.className !== "bird" && <section className="universal-animals-panel">
      <p className="eyebrow">KEEPER HISTORY</p>
      <h2>Care records</h2>
      <p>Detailed weight, feeding, shedding and health trackers are not yet connected to universal animal records. No zero-record counts are shown until tracking is supported. Your animal details above are saved normally.</p>
    </section>}
  </main>;
}
