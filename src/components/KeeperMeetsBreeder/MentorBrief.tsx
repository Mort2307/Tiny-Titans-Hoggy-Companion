import { useMemo, useState } from "react";
import type { MentorBrief as MentorBriefData } from "../../services/mentorshipBrief";
import { appendWorkspaceMessage } from "../../services/mentorshipRepository";
import { canSendMessage, type MentorshipWorkspace } from "../../services/mentorshipWorkspace";
import { useAuth } from "../../context/useAuth";

type Props = { brief: MentorBriefData; workspace: MentorshipWorkspace; onShared: () => void };

export default function MentorBrief({ brief, workspace, onShared }: Props) {
  const { user } = useAuth();
  const [shareLearning, setShareLearning] = useState(true);
  const [shareGaps, setShareGaps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const text = useMemo(() => {
    const lines = [`MENTOR BRIEF · ${brief.goal}`, "", brief.summary, "", "SHARED EVIDENCE", ...brief.evidence.filter((line) => !line.startsWith("Weight records not") && !line.startsWith("Feeding records not") && !line.startsWith("Shed records not") && !line.startsWith("Genetics records not") && !line.startsWith("Enclosure information not"))];
    if (shareLearning) lines.push("", "LEARNING", ...brief.learning);
    if (shareGaps) lines.push("", "DISCUSSION POINTS", ...brief.suggestedDiscussion.map((item) => `• ${item}`));
    return lines.join("\n");
  }, [brief, shareGaps, shareLearning]);
  const share = async () => {
    if (!user || !canSendMessage(workspace, user.uid)) return;
    setSaving(true); setError("");
    try { await appendWorkspaceMessage(workspace.id, { id: crypto.randomUUID(), senderId: user.uid, body: text, createdAt: new Date().toISOString() }); onShared(); }
    catch (e) { setError(e instanceof Error ? e.message : "The mentor brief could not be shared."); }
    finally { setSaving(false); }
  };
  return <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">MENTOR BRIEF · REVIEW BEFORE SHARING</span><h2>Prepare for your mentor</h2><p>TTHC creates a concise, explainable summary from your existing data. Nothing is shared until you approve it.</p></div></div><div className="kmb-sharing"><div className="kmb-record-grid"><label className={`kmb-record ${shareLearning ? "selected" : ""}`}><input type="checkbox" checked={shareLearning} onChange={() => setShareLearning((value) => !value)} /><span>Share learning progress</span></label><label className={`kmb-record ${shareGaps ? "selected" : ""}`}><input type="checkbox" checked={shareGaps} onChange={() => setShareGaps((value) => !value)} /><span>Share identified discussion points</span></label></div><div className="kmb-how"><h3>{brief.summary}</h3><p><strong>Suggested discussion:</strong> {brief.suggestedDiscussion.join(" · ") || "Human mentor review"}</p><button type="button" className="kmb-primary-button" disabled={saving || workspace.status !== "active"} onClick={() => void share()}>{saving ? "Sharing…" : "Review approved · share with mentor"}</button>{error && <p className="kmb-network-error">⚠️ {error}</p>}</div></div></section>;
}
