import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");
const getRecognition = httpsCallable<void, { isTitan: boolean; needsChoice: boolean; visibility: "named" | "anonymous" | null; displayName: string; suggestedName?: string; socialUrl?: string; tierLabel?: string }>(functions, "getTitanWallRecognition");
const setRecognition = httpsCallable<{ visibility: "named" | "anonymous"; displayName?: string; socialUrl?: string }, { saved: boolean; displayName: string; visibility: "named" | "anonymous" }>(functions, "setTitanWallRecognition");

export default function TitanRecognitionChoice({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTitan, setIsTitan] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);
  const [visibility, setVisibility] = useState<"named" | "anonymous">("named");
  const [displayName, setDisplayName] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getRecognition()
      .then(({ data }) => {
        if (!active) return;
        setIsTitan(Boolean(data.isTitan));
        setNeedsChoice(Boolean(data.needsChoice));
        setVisibility(data.visibility === "anonymous" ? "anonymous" : "named");
        setDisplayName(data.displayName || data.suggestedName || "");
        setSocialUrl(data.socialUrl || "");
      })
      .catch((error) => console.error("Titan recognition lookup failed", error))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function save() {
    setSaving(true); setMessage("");
    try {
      await setRecognition({ visibility, displayName: visibility === "named" ? displayName.trim() : "", socialUrl: socialUrl.trim() });
      setNeedsChoice(false);
      setMessage(visibility === "named" ? "You're on the Wall as your chosen name. 🏆" : "You'll be shown as Anonymous Titan. 🕶️");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't save your Wall recognition choice yet.");
    } finally { setSaving(false); }
  }

  if (loading || !isTitan || (!alwaysShow && !needsChoice && !message)) return null;

  return <div className="creator-founder-callout" style={{ marginTop: 16 }}>
    <strong>🏆 {needsChoice ? "Choose your Wall of Titans recognition" : "Wall of Titans recognition"}</strong>
    <span>{needsChoice ? "Your support is confirmed. Choose how you'd like to be recognised. You can change this later." : "Change how your support is shown on the Wall at any time."}</span>
    <div className="creator-actions" style={{ flexWrap: "wrap", marginTop: 12 }}>
      <button type="button" className={visibility === "named" ? "creator-primary" : ""} onClick={() => setVisibility("named")} disabled={saving}>👤 Show my name</button>
      <button type="button" className={visibility === "anonymous" ? "creator-primary" : ""} onClick={() => setVisibility("anonymous")} disabled={saving}>🕶️ Stay anonymous</button>
    </div>
    {visibility === "named" && <label style={{ display: "block", marginTop: 12 }}>Name shown on the Wall<input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your display name" disabled={saving} /></label>}
    <label style={{ display: "block", marginTop: 12 }}>Social profile <span>(optional)</span><input type="url" value={socialUrl} onChange={(event) => setSocialUrl(event.target.value)} placeholder="https://..." disabled={saving} /></label>
    {message && <div className="creator-success" role="status" style={{ marginTop: 12 }}><strong>{message}</strong></div>}
    <div className="creator-actions" style={{ marginTop: 12 }}><button type="button" className="creator-primary" onClick={save} disabled={saving || (visibility === "named" && !displayName.trim())}>{saving ? "Saving…" : "Save Wall recognition"}</button></div>
  </div>;
}
