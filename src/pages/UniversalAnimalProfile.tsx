import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getUserAnimal } from "../services/universalAnimalService";
import { getUserSnake } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import { UNIVERSAL_SPECIES_BY_ID } from "../data/species/universalSpeciesRegistry";
import type { UniversalAnimalRecord } from "../types/UniversalAnimal";
import "../styles/universal-animals.css";

export default function UniversalAnimalProfile() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [animal, setAnimal] = useState<UniversalAnimalRecord | null>(null);
  const [legacySnake, setLegacySnake] = useState<Awaited<ReturnType<typeof getUserSnake>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    void getUserAnimal(user.uid, id)
      .then((result) => { if (!active) return; return result ? setAnimal(result) : getUserSnake(user.uid, id).then((snake) => { if (active) setLegacySnake(snake); }); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, id]);

  if (loading) return <main className="page-container universal-animals-page"><section className="universal-animals-panel"><p>Loading individual animal…</p></section></main>;
  if (!animal && !legacySnake) return <main className="page-container universal-animals-page"><section className="universal-animals-panel"><h1>Animal not found</h1><Link to="/animals">Back to My Animals</Link></section></main>;

  const speciesId = animal?.speciesId || legacySnake?.universalSpeciesId;
  const species = speciesId ? UNIVERSAL_SPECIES_BY_ID[speciesId] : undefined;
  const name = animal?.name || legacySnake?.name || "Animal";
  const common = animal?.speciesCommonName || legacySnake?.species || "Species awaiting identification";
  const scientific = animal?.scientificName || species?.acceptedScientificName;

  return <main className="page-container universal-animals-page">
    <Link to="/animals">← My Animals</Link>
    <section className="universal-animals-hero">
      <div><p className="eyebrow">INDIVIDUAL ANIMAL</p><h1>{name}</h1><p>{common}{scientific ? " · " + scientific : ""}</p></div>
      <div className="universal-animals-metrics"><strong>{animal?.status || (legacySnake?.status === "Deceased" ? "deceased" : "active")}</strong><span>status</span></div>
    </section>
    {species && <section className="universal-animals-panel"><p className="eyebrow">CANONICAL SPECIES</p><h2>{species.commonNames[0]}</h2><p className="universal-scientific">{species.acceptedScientificName}</p><div className="universal-animal-links"><Link to={"/species/" + species.id}>Care & health reference →</Link><Link to={"/marketplace?species=" + encodeURIComponent(species.id)}>Marketplace listings →</Link></div></section>}
    <section className="universal-animals-panel"><p className="eyebrow">INDIVIDUAL RECORD</p><div className="universal-individual-grid"><div><span>Group</span><strong>{animal?.animalGroup || "reptile"}</strong></div><div><span>Sex</span><strong>{animal?.sex || legacySnake?.sex || "Unknown"}</strong></div><div><span>Morph / colour</span><strong>{animal?.morphOrColour || legacySnake?.morphs?.join(", ") || legacySnake?.customMorph || "—"}</strong></div></div>{animal?.notes || legacySnake?.notes ? <p>{animal?.notes || legacySnake?.notes}</p> : null}</section>
  </main>;
}
