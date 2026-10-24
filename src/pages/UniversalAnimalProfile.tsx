import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getUserAnimal, updateUserAnimal } from "../services/universalAnimalService";
import { getUserSnake } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import { findUniversalSpecies, UNIVERSAL_SPECIES_BY_ID } from "../data/species/universalSpeciesRegistry";
import type { UniversalAnimalRecord } from "../types/UniversalAnimal";
import { getTinyTitansErrorMessage } from "../utils/firebaseError";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansFeedback from "../components/TinyTitansFeedback";
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
      <div><p className="eyebrow">ANIMAL RECORD</p><h1>{name}</h1><p>{common}{scientific ? " · " + scientific : ""}</p><p className="universal-animal-profile-note">This individual's details are kept separate from the species reference.</p></div>
      <div className="universal-animals-metrics"><strong>{status}</strong><span>status</span></div>
    </section>
    {notice && <TinyTitansFeedback kind="success" role="status">{notice}</TinyTitansFeedback>}
    {species && <section className="universal-animals-panel"><p className="eyebrow">SPECIES REFERENCE</p><h2>{species.commonNames[0]}</h2><p className="universal-scientific">{species.acceptedScientificName}</p><div className="universal-animal-links"><Link to={"/species/" + species.id}>Care & health reference <TinyTitansIcon name="forward" size={15} /></Link><Link to={"/marketplace?species=" + encodeURIComponent(species.id)}>Marketplace listings <TinyTitansIcon name="forward" size={15} /></Link></div></section>}
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
    {animal && <section className="universal-animals-panel">
      <p className="eyebrow">KEEPER HISTORY</p>
      <h2>Care records</h2>
      <p>Detailed weight, feeding, shedding and health trackers are not yet connected to universal animal records. No zero-record counts are shown until tracking is supported. Your animal details above are saved normally.</p>
    </section>}
  </main>;
}
