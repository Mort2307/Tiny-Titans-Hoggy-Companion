import { useNavigate } from "react-router-dom";
import type { CommunityContent } from "../../types/communityEcosystem";
import { getCommunitySignals } from "../../services/communityIntelligence";

type Props = { item: CommunityContent };

export default function CommunityContentCard({ item }: Props) {
  const navigate = useNavigate();
  const signals = getCommunitySignals(item).slice(0, 2);
  return <article className="community-content-card" role="button" tabIndex={0} onClick={() => navigate(`/community/content/${item.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/community/content/${item.id}`); }}>
    {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" />}
    <div className="community-content-card-body"><div className="community-card-meta"><span>{item.type}</span>{item.board && <span>{item.board}</span>}</div><h3>{item.title}</h3>{item.summary && <p>{item.summary}</p>}<div className="community-card-footer"><span>❤️ {item.engagement?.likes ?? 0}</span><span>🧠 {item.engagement?.helpful ?? 0}</span><span>💬 {item.engagement?.comments ?? 0}</span>{signals.map((signal) => <span key={signal.label} title={signal.reason}>· {signal.label}</span>)}</div></div>
  </article>;
}
