import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFeaturedCandidates } from "../services/communityEcosystemService";
import type { FeaturedCandidate } from "../types/communityEcosystem";
import "../styles/CommunityHub.css";

export default function CommunityFeatured() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeaturedCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getFeaturedCandidates().then((result) => { if (active) setItems(result); }).catch(() => { if (active) setItems([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="community-page">
    <button type="button" className="community-back-button" onClick={() => navigate("/community")}>← Community Hub</button>
    <header className="community-hero"><div className="community-hero-icon">⭐</div><div><p className="community-eyebrow">COMMUNITY · FEATURED</p><h1>Featured Titans</h1><p>Keeper-approved showcases, projects and marketplace contributions selected to give the community a spotlight.</p></div></header>
    {loading && <div className="community-empty"><span>⭐</span><h2>Finding Featured Titans…</h2><p>Checking submissions that have opted into featuring.</p></div>}
    {!loading && items.length === 0 && <div className="community-empty"><span>⭐</span><h2>Nothing featured yet</h2><p>When a keeper opts a showcase, project or listing into Featured, it will appear here.</p></div>}
    {!loading && items.length > 0 && <div className="community-content-grid">{items.map((item) => <article className="community-content-card" key={item.id} role="button" tabIndex={0} onClick={() => navigate(item.type === "marketplace" ? "/community/marketplace" : `/community/content/${item.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(item.type === "marketplace" ? "/community/marketplace" : `/community/content/${item.id}`); }}>{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="community-content-placeholder">{item.type === "project" ? "🧬" : item.type === "marketplace" ? "🏪" : "🐍"}</div>}<div className="community-content-body"><span className="community-content-type">⭐ {item.type}</span><h2>{item.title}</h2><p>{item.summary || item.body || "Community contribution"}</p><small>{item.authorDisplayName ? `Shared by ${item.authorDisplayName}` : "Tiny Titans community"}</small><p><strong>Why featured:</strong> {item.featureReason}</p></div></article>)}</div>}
  </section>;
}
