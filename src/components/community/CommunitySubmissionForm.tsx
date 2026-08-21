import { useState } from "react";
import type { CommunityBoardKey, CommunityContentType, CommunityPermission } from "../../types/communityEcosystem";
import { COMMUNITY_BOARDS } from "../../types/communityEcosystem";
import { createCommunityContent } from "../../services/communitySubmissionService";

type Props = {
  authorId: string;
  authorDisplayName?: string;
  initialType?: CommunityContentType;
  onCreated?: (id: string) => void;
};

const TYPE_OPTIONS: Array<{ value: CommunityContentType; label: string; description: string }> = [
  { value: "showcase", label: "Snake Showcase", description: "Show off a snake, collection or enclosure." },
  { value: "discussion", label: "Discussion", description: "Start a keeper conversation." },
  { value: "project", label: "Project", description: "Find collaborators for a breeding or keeper project." },
  { value: "knowledge", label: "Knowledge", description: "Share a useful keeper guide or experience." },
  { value: "marketplace", label: "Marketplace", description: "Prepare a structured listing for the community marketplace." },
];

export default function CommunitySubmissionForm({ authorId, authorDisplayName, initialType = "showcase", onCreated }: Props) {
  const [type, setType] = useState<CommunityContentType>(initialType);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [board, setBoard] = useState<CommunityBoardKey>("community");
  const [species, setSpecies] = useState("Western Hognose");
  const [morph, setMorph] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [permissions, setPermissions] = useState<CommunityPermission[]>(["showcase"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const togglePermission = (permission: CommunityPermission) => {
    setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const id = await createCommunityContent({ type, title, summary, body, authorId, authorDisplayName, imageUrl: imageUrl || null, board, species: species || null, morph: morph || null, permissions });
      setSuccess("Submitted. Your contribution is now waiting for community moderation.");
      setTitle(""); setSummary(""); setBody(""); setMorph(""); setImageUrl("");
      onCreated?.(id);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Tiny Titans could not submit this contribution.");
    } finally { setSaving(false); }
  };

  return <form className="community-submission-form" onSubmit={submit}>
    <header><span className="community-eyebrow">CREATE</span><h2>Share with the community</h2><p>You control what is shared and which extra uses Tiny Titans may give your submission.</p></header>
    <label>What are you sharing?<select value={type} onChange={(event) => setType(event.target.value as CommunityContentType)}>{TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <p className="community-form-hint">{TYPE_OPTIONS.find((option) => option.value === type)?.description}</p>
    <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required placeholder="Give your contribution a clear title" /></label>
    <label>Summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={280} rows={2} placeholder="A short explanation shown on community cards" /></label>
    <label>Details<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={10_000} rows={6} placeholder="Tell the community more..." /></label>
    <div className="community-form-grid"><label>Board<select value={board} onChange={(event) => setBoard(event.target.value as CommunityBoardKey)}>{COMMUNITY_BOARDS.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label><label>Species<input value={species} onChange={(event) => setSpecies(event.target.value)} /></label><label>Morph<input value={morph} onChange={(event) => setMorph(event.target.value)} placeholder="Optional" /></label><label>Image URL<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Optional" /></label></div>
    <fieldset><legend>Sharing permissions</legend><p>These are explicit permissions, not automatic rights.</p><label><input type="checkbox" checked={permissions.includes("showcase")} onChange={() => togglePermission("showcase")} /> Allow Snake Showcase</label><label><input type="checkbox" checked={permissions.includes("featured")} onChange={() => togglePermission("featured")} /> Allow Featured Titans</label><label><input type="checkbox" checked={permissions.includes("project")} onChange={() => togglePermission("project")} /> Allow Project use</label><label><input type="checkbox" checked={permissions.includes("marketplace")} onChange={() => togglePermission("marketplace")} /> Allow Marketplace use</label></fieldset>
    {error && <p role="alert" className="community-form-error">{error}</p>}{success && <p role="status" className="community-form-success">{success}</p>}
    <button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit to Community →"}</button>
  </form>;
}
