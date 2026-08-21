import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCommunityContent } from "../services/communityEcosystemService";
import { COMMUNITY_BOARDS, type CommunityBoardKey, type CommunityContent } from "../types/communityEcosystem";
import "../styles/CommunityHub.css";

export default function CommunityBoards() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selected = (params.get("board") || "all") as CommunityBoardKey | "all";
  const [items, setItems] = useState<CommunityContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getCommunityContent({ limitCount: 48 }).then((result) => { if (active) setItems(result); }).catch(() => { if (active) setItems([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = selected === "all" ? items : items.filter((item) => item.board === selected);
  const open = (item: CommunityContent) => navigate(item.type === "marketplace" ? "/community/marketplace" : `/community/content/${item.id}`);

  return <section className="community-page">
    <button type="button" className="community-back-button" onClick={() => navigate("/community")}>← Community Hub</button>
    <header className="community-hero"><div className="community-hero-icon">💬</div><div><p className="community-eyebrow">COMMUNITY · EXPLORE</p><h1>Community Boards</h1><p>Choose a space for the conversation, or browse everything together. Tiny Titans keeps official notices separate from keeper discussion.</p></div></header>
    <section className="community-boards"><div className="community-board-grid"><button type="button" className={`community-board-card ${selected === "all" ? "active" : ""}`} onClick={() => navigate("/community/boards")}><span>🌎</span><div><strong>All activity</strong><small>Browse every community board.</small></div></button>{COMMUNITY_BOARDS.map((board) => <button key={board.key} type="button" className={`community-board-card ${selected === board.key ? "active" : ""}`} onClick={() => navigate(`/community/boards?board=${board.key}`)}><span>{board.icon}</span><div><strong>{board.title}</strong><small>{board.description}</small></div></button>)}</div></section>
    <section className="community-content-section"><div className="community-subheading"><div><span className="community-eyebrow">{selected === "all" ? "ALL BOARDS" : COMMUNITY_BOARDS.find((board) => board.key === selected)?.title?.toUpperCase()}</span><h2>{loading ? "Loading conversations…" : `${visible.length} community ${visible.length === 1 ? "contribution" : "contributions"}`}</h2></div></div>{!loading && visible.length === 0 && <div className="community-empty"><span>💬</span><h3>No approved contributions here yet</h3><p>Be the first keeper to start something useful.</p></div>}{!loading && visible.length > 0 && <div className="community-content-grid">{visible.map((item) => <article className="community-content-card" key={item.id} role="button" tabIndex={0} onClick={() => open(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") open(item); }}>{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="community-content-placeholder">💬</div>}<div className="community-content-body"><span className="community-content-type">{item.board || "community"} · {item.type}</span><h3>{item.title}</h3><p>{item.summary || item.body || "Community contribution"}</p><small>{item.authorDisplayName ? `Shared by ${item.authorDisplayName}` : "Tiny Titans community"}</small></div></article>)}</div>}</section>
  </section>;
}
