import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "../TinyTitansIcon";
import type { HomeAnimal } from "../../hooks/useHomeDashboard";
import type { SnakeIntelligence } from "../../services/snakeIntelligenceService";
import type { TitanDecision } from "../../services/titanDecisionStateService";

type Props = { selectedSnake?: HomeAnimal; selectedSnakeRecords: number; selectedIndex: number; snakeCount: number; intelligenceAccess: boolean; attentionDecision: TitanDecision | null; selectedIntelligence?: SnakeIntelligence; coverage: number; onMove: (direction: -1 | 1) => void; };

function HomeAnimalAvatar({ animal }: { animal?: HomeAnimal }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = animal?.photoUrl?.trim();

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const fallbackIcon = animal?.recordSource === "legacy-snake" ? "reptile" : "animals";

  return (
    <div className={`tt-home-current-avatar${photoUrl && !imageFailed ? " has-photo" : ""}`}>
      <TinyTitansIcon name={fallbackIcon} size={34} aria-hidden="true" />
      {photoUrl && !imageFailed && (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}

function HomeCurrentAnimalSection({ selectedSnake, selectedSnakeRecords, selectedIndex, snakeCount, intelligenceAccess, attentionDecision, selectedIntelligence, coverage, onMove }: Props) {
  return <section className="tt-home-section tt-home-current"><div className="tt-home-heading"><div><p className="tt-home-kicker"><TinyTitansIcon name={selectedSnake?.recordSource === "legacy-snake" ? "reptile" : "animals"} size={17} /> CURRENT ANIMAL</p><h2>{selectedSnake?.name}</h2></div><div className="tt-home-heading-actions"><button type="button" className="tt-home-select-button" onClick={() => onMove(-1)} aria-label="Previous animal"><TinyTitansIcon name="back" size={16} /></button><span>{selectedIndex + 1}/{snakeCount}</span><button type="button" className="tt-home-select-button" onClick={() => onMove(1)} aria-label="Next animal"><TinyTitansIcon name="forward" size={16} /></button><Link to="/animals">View all <TinyTitansIcon name="forward" size={14} /></Link></div></div>
    <div className="tt-home-current-card"><div className="tt-home-current-identity"><HomeAnimalAvatar animal={selectedSnake} /><div><span>{selectedSnakeRecords} recorded {selectedSnakeRecords === 1 ? "event" : "events"}</span><strong>{selectedSnake?.name}</strong><small>{selectedSnake?.recordSource === "universal" ? `${selectedSnake?.animalGroup || "Animal"} record · species ${selectedSnake?.species || "awaiting identification"}` : "Individual keeper record"}</small></div></div>
      <div className="tt-home-current-status"><span className={attentionDecision?.animalId === selectedSnake?.id ? "is-attention" : "is-good"}>{intelligenceAccess ? attentionDecision && attentionDecision.animalId === selectedSnake?.id ? <><TinyTitansIcon name="warning" size={14} /> Needs a look</> : selectedIntelligence?.priority?.tone === "attention" ? <><TinyTitansIcon name="info" size={14} /> Worth checking</> : selectedSnake?.recordSource === "universal" ? <><TinyTitansIcon name="animals" size={14} /> Universal animal</> : <><TinyTitansIcon name="check" size={14} /> Tracking normally</> : <><TinyTitansIcon name="timeline" size={14} /> Keeper records</>}</span>{intelligenceAccess && <small>{coverage}% average data coverage</small>}</div>
      <p>{intelligenceAccess ? attentionDecision && attentionDecision.animalId === selectedSnake?.id ? attentionDecision.reason : selectedIntelligence?.summary ?? (selectedSnake?.recordSource === "universal" ? "This animal is in the universal collection. Detailed tracker intelligence will build as supported records are added." : "TinyTitans is building this animal's individual baseline.") : selectedSnake?.recordSource === "universal" ? "This animal is in the universal collection. Detailed tracker records can be added through supported animal workflows." : `${selectedSnake?.name} has ${selectedSnake?.weightRecords ?? 0} weight, ${selectedSnake?.feedingRecords ?? 0} feeding, ${selectedSnake?.shedRecords ?? 0} shed and ${selectedSnake?.healthRecords ?? 0} health records.`}</p>
      <div className="tt-home-current-actions">{selectedSnake?.recordSource === "universal" ? <Link to={`/animals/${selectedSnake.id}`}><TinyTitansIcon name="animals" size={18} /> Animal Record</Link> : <><Link to={`/snakes/${selectedSnake?.id}/master-record`}><TinyTitansIcon name="timeline" size={18} /> Master Record</Link><Link to={`/husbandry/${selectedSnake?.id}`}><TinyTitansIcon name="husbandry" size={18} /> Husbandry</Link><Link to={`/snakes/${selectedSnake?.id}/weights`}><TinyTitansIcon name="weight" size={18} /> Weight</Link><Link to={`/snakes/${selectedSnake?.id}/feeding`}><TinyTitansIcon name="feeding" size={18} /> Feeding</Link></>}</div></div>
  </section>;
}
export default HomeCurrentAnimalSection;