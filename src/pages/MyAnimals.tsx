import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import UniversalSpeciesPicker from "../components/UniversalSpeciesPicker";
import { getUserAnimals, createUserAnimal } from "../services/universalAnimalService";
import { getUserSnakeDirectory } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import type { UniversalAnimalRecord } from "../types/UniversalAnimal";
import type { UniversalSpeciesRecord } from "../data/species/universalSpeciesTypes";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import "../styles/universal-animals.css";
import { KEEPER_COMPANION_TERMINOLOGY } from "../config/keeperTerminology";

type DirectoryAnimal = UniversalAnimalRecord & { legacySnake?: boolean };

export default function MyAnimals() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const speciesFilter = searchParams.get("species") || "";
  const [animals, setAnimals] = useState<DirectoryAnimal[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<UniversalSpeciesRecord | null>(null);
  const [name, setName] = useState("");
  const [sex, setSex] = useState<UniversalAnimalRecord["sex"]>("unknown");
  const [status, setStatus] = useState<UniversalAnimalRecord["status"]>("active");
  const [morphOrColour, setMorphOrColour] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const visibleAnimals = speciesFilter
    ? animals.filter((animal) => animal.speciesId === speciesFilter || animal.speciesCommonName?.toLowerCase() === speciesFilter.toLowerCase())
    : animals;

  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([getUserAnimals(user.uid), getUserSnakeDirectory(user.uid)])
      .then(([universalAnimals, snakes]) => {
        if (!active) return;
        const legacy: DirectoryAnimal[] = snakes.map((snake) => ({
          id: snake.id,
          ownerUid: user.uid,
          name: snake.name,
          speciesId: snake.universalSpeciesId || findUniversalSpecies(snake.species)?.id,
          speciesCommonName: snake.species,
          animalGroup: "reptile",
          sex: snake.sex.toLowerCase() as DirectoryAnimal["sex"],
          status: snake.status === "Sold" ? "sold" : snake.status === "Deceased" ? "deceased" : snake.status === "Archived" ? "archived" : "active",
          morphOrColour: snake.morphs?.join(", ") || snake.customMorph || undefined,
          notes: snake.notes,
          tags: [],
          createdAt: "",
          updatedAt: "",
          legacySnake: true,
        }));
        setAnimals([...universalAnimals, ...legacy].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Unable to load your animal collection."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function addAnimal() {
    if (!user || !name.trim()) return;
    setBusy(true);
    setMessage("");
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
      setAnimals((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setMorphOrColour("");
      setNotes("");
      setSelectedSpecies(null);
      setMessage("Animal added to My Animals.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add this animal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-container universal-animals-page">
      <header className="universal-animals-hero">
        <div>
          <p className="eyebrow">YOUR COLLECTION</p>
          <h1>My Animals</h1>
          <p>{KEEPER_COMPANION_TERMINOLOGY.collectionDescription} Existing snake records are preserved here alongside universal animal records.</p>
        </div>
        <div className="universal-animals-metrics">
          <strong>{animals.filter((animal) => !["deceased", "archived"].includes(animal.status)).length}</strong>
          <span>active animals</span>
          <strong>{new Set(animals.map((animal) => animal.speciesId).filter(Boolean)).size}</strong>
          <span>species represented</span>
        </div>
      </header>

      <section className="universal-animals-panel">
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
        <button className="universal-primary-action" type="button" disabled={!name.trim() || busy} onClick={() => void addAnimal()}>{busy ? "Saving…" : "Add animal"}</button>
        {message && <p role="status">{message}</p>}
      </section>

      <section className="universal-animals-panel">
        <p className="eyebrow">INDIVIDUALS</p>
        <h2>Your animal collection</h2>
        {loading ? <p>Loading your animal collection…</p> : visibleAnimals.length === 0 ? <p>No individual animal records yet.</p> : <div className="universal-animal-list">{visibleAnimals.map((animal) => <article key={(animal.legacySnake ? "snake:" : "animal:") + animal.id} className="universal-animal-row"><div><strong>{animal.name}</strong><span>{animal.speciesCommonName || "Awaiting species identification"}</span><small>{animal.animalGroup || "Animal"} · {animal.status}</small></div><Link to={animal.legacySnake ? "/snakes/" + animal.id : "/animals/" + animal.id}>Open individual →</Link></article>)}</div>}
      </section>
    </main>
  );
}
