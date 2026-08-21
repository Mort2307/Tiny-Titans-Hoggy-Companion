import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCommunityContent, getFeaturedCandidates } from "../services/communityEcosystemService";
import type { CommunityContent, FeaturedCandidate } from "../types/communityEcosystem";
import "../styles/CommunityHub.css";

type SectionKey = "featured" | "showcase" | "projects" | "mentorship" | "knowledge" | "boards";

type SectionConfig = {
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  type?: "showcase" | "project" | "knowledge";
};

const CONFIG: Record<SectionKey, SectionConfig> = {
  featured: { title: "Featured Titans", eyebrow: "FEATURED", description: "Community submissions selected from keepers who have explicitly opted their showcase, project or listing into Featured.", icon: "⭐" },
  showcase: { title: "Snake Showcase", eyebrow: "SHOWCASE", description: "A dedicated gallery for keepers to show their snakes, setups, progress and memorable moments with explicit sharing permission.", icon: "🐍", type: "showcase" },
  projects: { title: "Project Partnerships", eyebrow: "COLLABORATION", description: "Find compatible keepers, breeding projects and shared goals without exposing private keeper records.", icon: "🧬", type: "project" },
  mentorship: { title: "Mentorship", eyebrow: "KEEPER SUPPORT", description: "Connect experience with curiosity. Ask practical questions, offer experience and build useful keeper-to-keeper relationships.", icon: "🤝" },
  knowledge: { title: "Knowledge Exchange", eyebrow: "COMMUNITY KNOWLEDGE", description: "Community-written knowledge, practical lessons and real keeper experience — clearly separated from official Tiny Titans guidance.", icon: "🧠", type: "knowledge" },
  boards: { title: "Community Boards", eyebrow: "DISCUSSION", description: "Choose a board and open the conversation. Tiny Titans keeps official announcements separate from community discussion.", icon: "💬" },
};

function Card({ item, featured = false }: { item: CommunityContent | FeaturedCandidate; featured?: boolean }) {
  const navigate = useNavigate();
  const open = () => navigate(item.type === "marketplace" ? "/community/marketplace" : `/community/content/${item.id}`);
  return <article className="community-content-card" role="button" tabIndex={0} onClick={open} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") open(); }}>
    {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="community-content-placeholder">{item.type === "showcase" ? "🐍" : item.type === "project" ? "🧬" : item.type === "marketplace" ? "🏪" : "🧠"}</div>}
    <div className="community-content-body"><span className="community-content-type">{featured ? "⭐ FEATURED" : item.type.toUpperCase()}</span><h3>{item.title}</h3><p>{item.summary || item.body || "Community contribution"}</p>{"featureReason" in item && <small>{item.featureReason}</small>}{item.authorDisplayName && <small>Shared by {item.authorDisplayName}</small>}<strong>Open →</strong></div>
  </article>;
}

export default function CommunitySection({ section }: { section: SectionKey }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<(CommunityContent | FeaturedCandidate)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = CONFIG[section];
  const selectedBoard = searchParams.get("board");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const request = section === "featured" ? getFeaturedCandidates() : config.type ? getCommunityContent({ type: config.type, limitCount: 40 }) : getCommunityContent({ limitCount: 40 });
    void request.then((result) => { if (active) setItems(result); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load this community section."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section, config.type]);

  const boardLabel = useMemo(() => selectedBoard ? selectedBoard.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "All boards", [selectedBoard]);
  const boardItems = section === "boards" && selectedBoard ? items.filter((item) => item.board === selectedBoard) : items;

  return <section className="community-page">
    <header className="community-hero"><button type="button" className="community-back-button" onClick={() => navigate("/community")}>← Community Hub</button><div className="community-hero-icon">{config.icon}</div><div><p className="community-eyebrow">TINY TITANS · {config.eyebrow}</p><h1>{config.title}</h1><p>{config.description}</p></div></header>

    {section === "boards" && <section className="community-form-card"><h2>{boardLabel}</h2><p>Open a board to see its discussions, or browse the whole community feed.</p><div className="community-featured-actions"><button type="button" onClick={() => navigate("/community/boards")}>Browse boards →</button>{selectedBoard && <button type="button" onClick={() => navigate("/community/boards")}>All boards</button>}</div></section>}

    {section === "mentorship" && <section className="community-ecosystem-grid"><button type="button" onClick={() => navigate("/community/boards?board=community")}><span>💬</span><div><strong>Ask the community</strong><small>Post a practical keeper question and invite useful experience.</small></div></button><button type="button" onClick={() => navigate("/conversations")}><span>🤝</span><div><strong>Keeper conversations</strong><small>Use private conversations when a public board isn't appropriate.</small></div></button><button type="button" onClick={() => navigate("/community/knowledge")}><span>🧠</span><div><strong>Learn from experience</strong><small>Browse community knowledge while keeping official guidance clearly labelled.</small></div></button></section>}

    {section !== "mentorship" && <section className="community-content-section"><div className="community-subheading"><div><span className="community-eyebrow">{section === "featured" ? "OPT-IN FEATURED CONTENT" : "COMMUNITY CONTENT"}</span><h2>{section === "boards" ? "Recent community activity" : `Latest ${config.title}`}</h2><p>{section === "featured" ? "Only content with explicit Featured permission can appear here." : "Open a card to view the full contribution and continue the conversation."}</p></div>{section === "showcase" && <button type="button" onClick={() => navigate("/community/boards?board=showcase")}>Discuss showcases →</button>}{section === "projects" && <button type="button" onClick={() => navigate("/community/boards?board=breeding")}>Open breeding board →</button>}{section === "knowledge" && <button type="button" onClick={() => navigate("/community/boards?board=community")}>Discuss knowledge →</button>}</div>{loading && <div className="community-empty"><span>{config.icon}</span><h3>Loading {config.title}…</h3><p>Checking approved community contributions.</p></div>}{!loading && error && <div className="community-empty community-error"><span>⚠️</span><h3>Couldn't load this section</h3><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>}{!loading && !error && boardItems.length === 0 && <div className="community-empty"><span>{config.icon}</span><h3>No contributions yet</h3><p>This space is ready for the community. Be one of the first keepers to contribute.</p><button type="button" onClick={() => navigate("/community/boards")}>Explore Community Boards →</button></div>}{!loading && !error && boardItems.length > 0 && <div className="community-content-grid">{boardItems.map((item) => <Card key={item.id} item={item} featured={section === "featured"} />)}</div>}</section>}

    {(section === "showcase" || section === "projects" || section === "knowledge") && <section className="community-feedback-card"><div><span className="community-feedback-icon">➕</span><div><h2>Want to contribute?</h2><p>Start in the relevant Community Board. Tiny Titans will keep your submission moderated and only expose it publicly according to your sharing choices.</p></div></div><button type="button" onClick={() => navigate(section === "projects" ? "/community/boards?board=breeding" : section === "showcase" ? "/community/boards?board=showcase" : "/community/boards?board=community")}>Open the right board →</button></section>}
  </section>;
}
