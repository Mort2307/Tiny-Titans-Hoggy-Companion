import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCreatorContentOverrides, saveCreatorContentOverrides, type CreatorContentOverrides, type KnowledgeCard, type KnowledgeLevelContent } from "../services/creatorContentService";
import "../styles/CreatorTools.css";

const LEVELS = ["explorer", "learner", "student", "adult"] as const;
type Level = typeof LEVELS[number];
const emptyLevel = (level: Level): KnowledgeLevelContent => ({ intro: `Learning content for ${level}.`, cards: [], caution: "Tiny Titans education is not veterinary diagnosis." });

export default function CreatorContentControl() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState<CreatorContentOverrides>({});
  const [level, setLevel] = useState<Level>("adult");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { void getCreatorContentOverrides().then(setContent).catch((e) => setError(e instanceof Error ? e.message : "Managed content could not be loaded.")).finally(() => setLoading(false)); }, []);

  const current = content.knowledgeBase?.[level] ?? emptyLevel(level);
  const updateLevel = (next: KnowledgeLevelContent) => setContent({ ...content, knowledgeBase: { ...content.knowledgeBase, [level]: next } });
  const updateCard = (index: number, patch: Partial<KnowledgeCard>) => updateLevel({ ...current, cards: current.cards.map((card, i) => i === index ? { ...card, ...patch } : card) });
  const addCard = () => updateLevel({ ...current, cards: [...current.cards, { icon: "📚", title: "New topic", body: "Add the educational explanation here.", route: "/snakes" }] });
  const removeCard = (index: number) => updateLevel({ ...current, cards: current.cards.filter((_, i) => i !== index) });

  async function save() {
    if (!user) return;
    setSaving(true); setError(""); setMessage("");
    try { await saveCreatorContentOverrides(content, user.uid); setMessage("Managed app content saved."); }
    catch (e) { setError(e instanceof Error ? e.message : "Managed content could not be saved."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="creator-admin-page"><div className="creator-loading">Loading Creator content controls…</div></main>;
  return <main className="creator-admin-page">
    <header className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>📝 Content Control</h1><p>Edit Creator-managed Knowledge Base content without changing application source files.</p></div><div className="creator-header-actions"><button type="button" onClick={() => navigate("/creator/app-control")}>← App Control</button><button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save changes"}</button></div></header>
    {message && <div className="creator-success" role="status">{message}</div>}{error && <div className="creator-error" role="alert">{error}</div>}
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">KNOWLEDGE BASE</span><h2>Learning-level content</h2><p>These overrides are deliberately scoped to the selected learning level.</p></div></div><div className="creator-global-grid">{LEVELS.map((item) => <button type="button" key={item} className={`creator-global-card creator-global-card-button ${level === item ? "creator-selected" : ""}`} onClick={() => setLevel(item)}><span>📚</span><label>{item}</label><small>{content.knowledgeBase?.[item]?.cards.length ?? 0} managed cards</small></button>)}</div></section>
    <section className="creator-admin-section"><label className="creator-search"><span>Introduction</span><textarea value={current.intro} onChange={(e) => updateLevel({ ...current, intro: e.target.value })} /></label><label className="creator-search"><span>Safety notice</span><textarea value={current.caution} onChange={(e) => updateLevel({ ...current, caution: e.target.value })} /></label></section>
    <section className="creator-admin-section"><div className="creator-section-heading"><div><h2>Knowledge cards</h2><p>Each card contains only the content and destination for that learning topic.</p></div><button type="button" onClick={addCard}>+ Add card</button></div><div className="creator-list">{current.cards.map((card, index) => <article className="creator-list-card" key={`${level}-${index}`}><div className="creator-list-top"><h3>{card.icon} Card {index + 1}</h3><button type="button" onClick={() => removeCard(index)}>Remove</button></div><label className="creator-search"><span>Icon</span><input value={card.icon} onChange={(e) => updateCard(index, { icon: e.target.value })} /></label><label className="creator-search"><span>Title</span><input value={card.title} onChange={(e) => updateCard(index, { title: e.target.value })} /></label><label className="creator-search"><span>Body</span><textarea value={card.body} onChange={(e) => updateCard(index, { body: e.target.value })} /></label><label className="creator-search"><span>Destination route</span><input value={card.route} onChange={(e) => updateCard(index, { route: e.target.value })} /></label></article>)}</div></section>
  </main>;
}
