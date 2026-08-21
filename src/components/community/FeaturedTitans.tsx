import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFeaturedCandidates } from "../../services/communityEcosystemService";
import type { FeaturedCandidate } from "../../types/communityEcosystem";

type Props = { onOpen?: (item: FeaturedCandidate) => void };

export default function FeaturedTitans({ onOpen }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeaturedCandidate[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getFeaturedCandidates().then((result) => { if (active) setItems(result); }).catch(() => { if (active) setItems([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 72 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const current = useMemo(() => items[index % Math.max(items.length, 1)], [index, items]);

  if (loading) return <section className="community-featured community-featured-loading"><span>⭐</span><div><strong>Finding the next Featured Titan…</strong><p>Checking community submissions that have opted in to be featured.</p></div></section>;
  if (!current) return <section className="community-featured community-featured-empty" role="button" tabIndex={0} onClick={() => navigate("/community/featured")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/community/featured"); }}><span>⭐</span><div><strong>Featured Titans is ready</strong><p>When keepers opt a showcase, project or listing into Featured, it can appear here.</p><button type="button" onClick={(event) => { event.stopPropagation(); navigate("/community/featured"); }}>Explore Featured Titans →</button></div></section>;

  const openCurrent = () => onOpen?.(current);
  return <section className="community-featured" aria-label="Featured Titans" role="button" tabIndex={0} onClick={openCurrent} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openCurrent(); }}>
    <div className="community-featured-media">{current.imageUrl ? <img src={current.imageUrl} alt={current.title} loading="eager" /> : <span>🐍</span>}</div>
    <div className="community-featured-content"><div className="community-featured-label">⭐ FEATURED TITAN</div><div className="community-featured-type">{current.type.toUpperCase()} · {current.morph || current.species || "COMMUNITY"}</div><h2>{current.title}</h2><p>{current.summary || current.body || "A community contribution selected because its creator chose to share it."}</p>{current.authorDisplayName && <small>Shared by <strong>{current.authorDisplayName}</strong></small>}<div className="community-featured-actions"><button type="button" onClick={(event) => { event.stopPropagation(); openCurrent(); }}>View submission →</button>{items.length > 1 && <span>{index + 1} / {items.length}</span>}</div></div>
  </section>;
}
