import { useMemo, useState } from "react";
import { defaultWorkspacePermissions, type WorkspacePermission } from "../../services/mentorshipWorkspace";

const permissionLabels: Record<WorkspacePermission, string> = {
  view_profile: "Profile basics", view_weight: "Weight history", view_feeding: "Feeding history", view_sheds: "Shed history",
  view_genetics: "Morph / genetics", view_enclosure: "Enclosure setup", view_photos: "Photos", view_health: "Health records",
};

type Props = { goal: string; workspaceId?: string; mentorId?: string };

export default function MentorshipWorkspacePreview({ goal }: Props) {
  const [permissions, setPermissions] = useState(defaultWorkspacePermissions);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const toggle = (permission: WorkspacePermission) => setPermissions((current) => ({ ...current, [permission]: !current[permission] }));
  const enabledCount = useMemo(() => Object.values(permissions).filter(Boolean).length, [permissions]);
  const send = () => { const value = message.trim(); if (!value) return; setMessages((current) => [...current, value]); setMessage(""); };

  return <section className="kmb-workspace"><div className="kmb-network-heading"><div><span className="kmb-label">STEP 5 · PRIVATE SPACE</span><h2>Mentorship workspace</h2><p>A focused space for the mentor and keeper. The community does not get access to private conversations.</p></div><span className="kmb-network-status">🔒 Private</span></div><div className="kmb-workspace-grid"><div className="kmb-chat"><div className="kmb-chat-head"><div><strong>Keeper ↔ Mentor</strong><small>Goal: {goal}</small></div><span>🟢 Active</span></div><div className="kmb-chat-body"><div className="kmb-system-message">Mentorship started. Shared records remain private and permission-controlled.</div>{messages.map((item, index) => <div className="kmb-message" key={`${item}-${index}`}>{item}</div>)}</div><div className="kmb-composer"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a question, share an observation or discuss your next milestone…" /><button type="button" className="kmb-primary-button" onClick={send}>Send</button></div></div><aside className="kmb-permissions"><div><strong>Shared with mentor</strong><small>{enabledCount} permission{enabledCount === 1 ? "" : "s"} enabled</small></div>{(Object.keys(permissionLabels) as WorkspacePermission[]).map((permission) => <label className={`kmb-permission ${permissions[permission] ? "enabled" : ""}`} key={permission}><input type="checkbox" checked={permissions[permission]} onChange={() => toggle(permission)} /><span>{permissionLabels[permission]}</span></label>)}<button type="button" className="kmb-revoke" onClick={() => setPermissions(defaultWorkspacePermissions)}>Revoke optional access</button><p>Permissions are independent. Turning one off should not remove the others.</p></aside></div><div className="kmb-workspace-footer"><span>🧠 Milestones</span><span>💬 Private messages</span><span>🔐 Permission audit</span><span>🏁 Completion</span></div></section>;
}
