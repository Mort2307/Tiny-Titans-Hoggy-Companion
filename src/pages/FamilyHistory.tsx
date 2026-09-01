import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getFamilyForUser, type FamilyAccount } from "../services/familyService";
import { getFamilyHistory, type FamilyHistoryEvent } from "../services/familyPermissionsService";
import "../styles/family-manager.css";

function formatDate(value: unknown): string {
  if (!value) return "Unknown date";
  try {
    const date = typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function" ? value.toDate() : new Date(String(value));
    return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  } catch { return "Unknown date"; }
}

function icon(type: string): string {
  if (type === "approval_submitted") return "📝";
  if (type === "approval_approved") return "✅";
  if (type === "approval_rejected") return "⛔";
  if (type === "permission_mode_changed") return "🛡️";
  return "📚";
}

export default function FamilyHistory() {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [events, setEvents] = useState<FamilyHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "approvals" | "permissions">("all");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getFamilyForUser(user.uid), getFamilyHistory(user.uid)])
      .then(([loadedFamily, loadedEvents]) => { setFamily(loadedFamily); setEvents(loadedEvents); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load family history."))
      .finally(() => setLoading(false));
  }, [user]);

  const visible = useMemo(() => events.filter((event) => filter === "all" || (filter === "approvals" && event.eventType.startsWith("approval_")) || (filter === "permissions" && event.eventType === "permission_mode_changed")), [events, filter]);

  if (!user) return null;
  if (loading) return <main className="page-container family-manager-page"><BackHomeButton /><section className="family-manager-card"><p className="family-manager-kicker">FAMILY HISTORY</p><h1>Loading family history...</h1></section></main>;
  if (!family) return <main className="page-container family-manager-page"><BackHomeButton /><section className="family-manager-card"><p className="family-manager-kicker">FAMILY HISTORY</p><h1>No family connected</h1><Link className="family-manager-button family-manager-button--primary" to="/account/family">My Family</Link></section></main>;

  return <main className="page-container family-manager-page"><BackHomeButton /><header className="family-manager-hero"><div><p className="family-manager-kicker">FAMILY HISTORY</p><h1>A permanent record of family activity</h1><p>Permission changes and Family Review decisions are kept here so everyone can understand what happened and when.</p></div><div className="family-manager-hero-actions"><Link className="family-manager-button" to="/account/family">My Family</Link><Link className="family-manager-button" to="/account/family/manage">Family Manager</Link></div></header>{error && <div className="family-manager-error" role="alert">{error}</div>}<section className="family-history-filters"><button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => setFilter("all")}>All activity</button><button className={filter === "approvals" ? "is-active" : ""} type="button" onClick={() => setFilter("approvals")}>Reviews</button><button className={filter === "permissions" ? "is-active" : ""} type="button" onClick={() => setFilter("permissions")}>Permissions</button></section><section className="family-manager-card"><div className="family-manager-section-head"><div><p className="family-manager-kicker">AUDIT TRAIL</p><h2>{visible.length} event{visible.length === 1 ? "" : "s"}</h2></div><span>Family ID {family.id.slice(0, 8)}</span></div>{visible.length === 0 ? <div className="family-manager-empty"><div>📭</div><h3>No history here yet</h3><p>Family review and permission activity will appear here automatically.</p></div> : <div className="family-history-list">{visible.map((event) => <article className="family-history-event" key={event.id}><span className="family-history-icon">{icon(event.eventType)}</span><div><strong>{event.summary}</strong><p>{event.eventType === "approval_approved" ? "The proposed family change was accepted and applied." : event.eventType === "approval_rejected" ? "The proposed family change was rejected and the real record was left unchanged." : event.eventType === "approval_submitted" ? "A family member submitted a real-record change for review." : event.eventType === "permission_mode_changed" ? "The Family Head changed a member's access mode." : "Family activity recorded."}</p><small>{formatDate(event.createdAt)} · Actor {event.actorUid.slice(0, 8)}{event.targetUid ? ` · Target ${event.targetUid.slice(0, 8)}` : ""}</small></div></article>)}</div>}</section></main>;
}
