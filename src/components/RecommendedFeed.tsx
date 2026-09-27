import { Link } from "react-router-dom";
import { masterMorphs } from "../data/masterMorphDatabase";
import TinyTitansIcon from "./TinyTitansIcon";
import "./RecommendedFeed.css";

const preferredMorphIds = ["arctic", "conda", "super-arctic", "super-conda", "super-arctic-conda", "arctic-super-conda"];

function getRecommendations() {
  const preferred = preferredMorphIds
    .map((id) => masterMorphs.find((entry) => entry.geneId === id))
    .filter(Boolean);
  const fallback = masterMorphs.filter((entry) => entry.kind === "Combination");
  const seen = new Set<string>();
  return [...preferred, ...fallback].filter((entry): entry is typeof masterMorphs[number] => {
    if (!entry || seen.has(entry.geneId)) return false;
    seen.add(entry.geneId);
    return true;
  }).slice(0, 4);
}

export default function RecommendedFeed() {
  const recommendations = getRecommendations();
  if (!recommendations.length) return null;

  return (
    <section className="recommended-feed" aria-labelledby="recommended-feed-title">
      <div className="recommended-feed__heading">
        <div>
          <p className="tt-home-kicker"><TinyTitansIcon name="morph" size={16} /> RECOMMENDED FOR YOU</p>
          <h2 id="recommended-feed-title">Worth exploring next</h2>
          <p>Start with canonical identities and recognised combinations rather than chasing near-matches.</p>
        </div>
        <Link to="/morph-library">Open full library <TinyTitansIcon name="forward" size={14} /></Link>
      </div>
      <div className="recommended-feed__grid">
        {recommendations.map((morph) => (
          <Link key={morph.geneId} className="recommended-feed__card" to={`/morph-library/${encodeURIComponent(morph.geneId)}`}>
            <span className="recommended-feed__icon"><TinyTitansIcon name={morph.kind === "Combination" ? "genetics" : "morph"} size={24} /></span>
            <span className="recommended-feed__copy">
              <strong>{morph.name}</strong>
              <small>{morph.kind} · {morph.inheritance}</small>
              <span>{morph.description ?? "Open the canonical Morph Library entry for the full record."}</span>
            </span>
            <span className="recommended-feed__arrow" aria-hidden="true"><TinyTitansIcon name="forward" size={16} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
