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

    <section className="community-form-card">
      <div className="community-subheading"><div><span className="community-eyebrow">🌟 WANT TO BE FEATURED?</span><h2>Show the community something awesome</h2><p>Submit your snake, project or useful contribution. Tiny Titans reviews every submission before anything becomes publicly featured.</p></div><button type="button" onClick={() => navigate("/community/featured/submit")}>✨ Submit for Featured</button></div>
      <div className="community-content-grid">
        <article className="community-content-card"><div className="community-content-placeholder">🐍</div><div className="community-content-body"><span className="community-content-type">SNAKE SHOWCASE</span><h3>Show off one of your Titans</h3><p>Share a special snake, morph, keeper story or transformation.</p></div></article>
        <article className="community-content-card"><div className="community-content-placeholder">🧬</div><div className="community-content-body"><span className="community-content-type">PROJECT</span><h3>Put a project in the spotlight</h3><p>Breeding, genetics, vivarium or collaboration projects are welcome.</p></div></article>
        <article className="community-content-card"><div className="community-content-placeholder">🧠</div><div className="community-content-body"><span className="community-content-type">CONTRIBUTION</span><h3>Share something useful</h3><p>Guides, keeper experience and valuable community discussions can be nominated too.</p></div></article>
      </div>
    </section>

    {loading && <div className="community-empty"><span>⭐</span><h2>Finding Featured Titans…</h2><p>Checking submissions that have opted into featuring.</p></div>}
    {!loading && items.length === 0 && <div className="community-empty"><span>⭐</span><h2>Nothing featured yet</h2><p>Be the first keeper to submit something. Approved submissions will appear here automatically according to the Featured selection system.</p><button type="button" onClick={() => navigate("/community/featured/submit")}>✨ Submit the first Featured Titan</button></div>}
    {!loading && items.length > 0 && <section><div className="community-subheading"><div><span className="community-eyebrow">CURRENT SPOTLIGHTS</span><h2>Featured by the community</h2></div></div><div className="community-content-grid">{items.map((item) => <article className="community-content-card" key={item.id} role="button" tabIndex={0} onClick={() => navigate(item.type === "marketplace" ? "/community/marketplace" : `/community/content/${item.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(item.type === "marketplace" ? "/community/marketplace" : `/community/content/${item.id}`); }}>{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="community-content-placeholder">{item.type === "project" ? "🧬" : item.type === "marketplace" ? "🏪" : "🐍"}</div>}<div className="community-content-body"><span className="community-content-type">⭐ {item.type}</span><h2>{item.title}</h2><p>{item.summary || item.body || "Community contribution"}</p><small>{item.authorDisplayName ? `Shared by ${item.authorDisplayName}` : "Tiny Titans community"}</small><p><strong>Why featured:</strong> {item.featureReason}</p></div></article>)}</div></section>}

    <section className="community-form-card"><span className="community-eyebrow">🏪 MARKETPLACE</span><h2>Have a listing worth spotlighting?</h2><p>Marketplace listings have their own Featured opt-in and moderation flow. Create your listing in the Marketplace and choose Featured when you submit it.</p><button type="button" onClick={() => navigate("/community/marketplace")}>Open Marketplace →</button></section>
  </section>;
}
