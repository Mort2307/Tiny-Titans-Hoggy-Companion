import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { submitForFeatured } from "../services/communityFeaturedService";
import type { CommunityBoardKey, CommunityContentType } from "../types/communityEcosystem";
import "../styles/CommunityHub.css";

type SubmissionType = Exclude<CommunityContentType, "marketplace" | "event" | "challenge">;

const submissionTypes: Array<{ value: SubmissionType; icon: string; title: string; description: string }> = [
  { value: "showcase", icon: "🐍", title: "Snake Showcase", description: "Show off one of your Titans, a special morph, a transformation or a keeper story." },
  { value: "project", icon: "🧬", title: "Project / Partnership", description: "Share a breeding, genetics, vivarium or collaboration project." },
  { value: "knowledge", icon: "🧠", title: "Knowledge Contribution", description: "Submit a useful guide, experience, setup or community contribution." },
  { value: "discussion", icon: "💬", title: "Community Contribution", description: "Put forward a particularly useful discussion or community story." },
];

const boards: Array<{ value: CommunityBoardKey; label: string }> = [
  { value: "keeper", label: "Keeper Corner" },
  { value: "husbandry", label: "Husbandry" },
  { value: "behaviour", label: "Behaviour" },
  { value: "genetics", label: "Genetics" },
  { value: "breeding", label: "Breeding Projects" },
  { value: "vivarium", label: "Vivarium Lab" },
  { value: "community", label: "Community" },
];

export default function CommunityFeaturedSubmit() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [type, setType] = useState<SubmissionType>("showcase");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [species, setSpecies] = useState("Western Hognose");
  const [morph, setMorph] = useState("");
  const [board, setBoard] = useState<CommunityBoardKey>("community");
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selected = submissionTypes.find((item) => item.value === type)!;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) { setMessage("You need to be signed in to submit for Featured."); return; }
    if (!consent) { setMessage("Please give permission for Tiny Titans to display your submission if it is selected."); return; }
    setBusy(true); setMessage("");
    try {
      await submitForFeatured({ type, title, summary, body, authorId: user.uid, authorDisplayName: profile?.displayName || user.displayName || "Tiny Titans Keeper", imageUrl, species, morph, board, reason });
      setMessage("Submitted for Featured review. Your submission will stay private until it has been moderated.");
      setTitle(""); setSummary(""); setBody(""); setImageUrl(""); setMorph(""); setReason(""); setConsent(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit for Featured review.");
    } finally { setBusy(false); }
  };

  return <section className="community-page">
    <button type="button" className="community-back-button" onClick={() => navigate("/community/featured")}>← Featured Titans</button>
    <header className="community-hero"><div className="community-hero-icon">✨</div><div><p className="community-eyebrow">COMMUNITY · FEATURED</p><h1>Submit for Featured</h1><p>Give the community something worth putting in the spotlight. Every submission is reviewed before it becomes public.</p></div></header>

    <section className="community-form-card">
      <div className="community-subheading"><div><span className="community-eyebrow">STEP 1</span><h2>What are you sharing?</h2><p>Tiny Titans uses this to place your submission in the right part of the community.</p></div></div>
      <div className="community-content-grid">
        {submissionTypes.map((item) => <button key={item.value} type="button" className={`community-content-card community-select-card${type === item.value ? " is-selected" : ""}`} onClick={() => setType(item.value)}><span className="community-content-placeholder">{item.icon}</span><div className="community-content-body"><span className="community-content-type">{type === item.value ? "SELECTED" : "SELECT"}</span><h3>{item.title}</h3><p>{item.description}</p></div></button>)}
      </div>
    </section>

    <form className="community-form-card" onSubmit={submit}>
      <div className="community-subheading"><div><span className="community-eyebrow">STEP 2 · {selected.title.toUpperCase()}</span><h2>Tell us about it</h2><p>Keep it accurate, useful and community-friendly.</p></div></div>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={type === "showcase" ? "e.g. Haze — Lavender keeper showcase" : "Give your submission a clear title"} required /></label>
      <label>Short summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={300} rows={3} placeholder="A quick introduction shown on the Featured card." required /></label>
      <label>Full story / contribution<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={7} placeholder="Tell the community what makes this worth sharing." required /></label>
      {type !== "discussion" && <div className="community-form-grid"><label>Species<input value={species} onChange={(event) => setSpecies(event.target.value)} /></label><label>Morph / genetics<input value={morph} onChange={(event) => setMorph(event.target.value)} placeholder="Optional — only state what you know" /></label></div>}
      <label>Image URL <span className="community-field-hint">optional</span><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" /></label>
      <label>Community board<select value={board} onChange={(event) => setBoard(event.target.value as CommunityBoardKey)}>{boards.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Why should this be Featured?<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={600} rows={4} placeholder="What makes this interesting, useful, unusual or inspiring?" required /></label>
      <label className="community-checkbox"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I give Tiny Titans permission to display this submission publicly if it is approved for Featured. I understand it will be reviewed first.</label>
      {message && <p className="community-form-success" role="status">{message}</p>}
      <div className="community-form-actions"><button type="button" className="community-secondary-button" onClick={() => navigate("/community/featured")}>Cancel</button><button type="submit" disabled={busy || !user}>{busy ? "Submitting…" : "✨ Submit for Featured Review"}</button></div>
    </form>

    <section className="community-form-card"><span className="community-eyebrow">🏪 MARKETPLACE</span><h2>Have a listing worth spotlighting?</h2><p>Marketplace listings have their own Featured opt-in and moderation flow. You can submit a listing from the Marketplace when you create or edit it.</p><button type="button" onClick={() => navigate("/community/marketplace")}>Open Marketplace →</button></section>
  </section>;
}
