import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getFamilyForUser } from "../services/familyService";
import { type FamilyApproval } from "../services/familyPermissionsService";
import { decideFamilyApprovalSecure, getFamilyApprovalsSecure } from "../services/familyReviewService";
import { db } from "../firebase/config";
import "../styles/family-manager.css";

function formatDate(value: unknown): string {
  if (!value) return "Unknown date";
  try {
    const date = typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function"
      ? value.toDate()
      : new Date(String(value));
    return Number.isNaN(date.getTime())
      ? "Unknown date"
      : new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    return "Unknown date";
  }
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function looksLikeUid(value: unknown): boolean {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,}$/.test(value.trim());
}

function safeRequesterName(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text && !looksLikeUid(text) ? text : "Family member";
}

const HIDDEN_FIELDS = new Set(["id", "snakeId", "lastModifiedBy", "createdAt", "updatedAt"]);

function friendlyValue(value: unknown, key?: string): string {
  if (value == null) return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return key?.toLowerCase() === "weight" ? `${value} g` : String(value);
  }
  if (typeof value === "string") {
    if (key?.toLowerCase() === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDay(value);
    return value;
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return formatDate(value);
  }
  if (Array.isArray(value)) return value.map((item) => friendlyValue(item)).join(", ");
  return String(value);
}

function FriendlyValuePanel({ value, emptyMessage }: { value: unknown; emptyMessage: string }) {
  if (value == null) {
    return <div className="family-review-empty-value"><strong>{emptyMessage}</strong><span>No existing saved value.</span></div>;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => !HIDDEN_FIELDS.has(key));
    if (!entries.length) {
      return <div className="family-review-empty-value"><strong>No displayable details</strong><span>The change contains no keeper-facing fields.</span></div>;
    }
    return (
      <div className="family-review-values">
        {entries.map(([key, entryValue]) => (
          <div className="family-review-field" key={key}>
            <span className="family-review-field-label">{titleCase(key)}</span>
            <strong className="family-review-field-value">{friendlyValue(entryValue, key)}</strong>
          </div>
        ))}
      </div>
    );
  }

  return <div className="family-review-single-value">{friendlyValue(value)}</div>;
}

async function getFamilyMemberNames(approvals: FamilyApproval[]): Promise<Record<string, string>> {
  const ids = [...new Set(approvals.map((item) => item.requesterUid).filter(Boolean))];
  const pairs = await Promise.all(ids.map(async (uid) => {
    const fallback = safeRequesterName(approvals.find((item) => item.requesterUid === uid)?.requesterName);
    try {
      const snapshot = await getDoc(doc(db, "users", uid));
      const displayName = snapshot.data()?.displayName;
      return [uid, safeRequesterName(displayName) === "Family member" ? fallback : safeRequesterName(displayName)] as const;
    } catch {
      return [uid, fallback] as const;
    }
  }));
  return Object.fromEntries(pairs);
}

export default function FamilyReview() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<FamilyApproval[]>([]);
  const [requesterNames, setRequesterNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState("");
  const [isHead, setIsHead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const family = await getFamilyForUser(user.uid);
      const owner = Boolean(family && family.ownerUid === user.uid);
      setIsHead(owner);
      const next = owner ? await getFamilyApprovalsSecure() : [];
      setApprovals(next);
      setRequesterNames(await getFamilyMemberNames(next));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load Family Review.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  async function decide(approvalId: string, status: "approved" | "rejected") {
    setBusy(approvalId);
    setError("");
    setMessage("");
    try {
      await decideFamilyApprovalSecure(approvalId, status);
      setApprovals((current) => current.map((item) => item.id === approvalId ? { ...item, status } : item));
      setSelected("");
      setMessage(status === "approved" ? "Change approved and applied to the real family record." : "Change rejected. The real family record was left unchanged.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to decide this family change.");
    } finally {
      setBusy("");
    }
  }

  const pending = useMemo(() => approvals.filter((item) => item.status === "pending"), [approvals]);
  const selectedApproval = approvals.find((item) => item.id === selected);
  const selectedRequesterName = selectedApproval ? requesterNames[selectedApproval.requesterUid] || safeRequesterName(selectedApproval.requesterName) : "Family member";

  if (!user) return null;
  if (loading) return <main className="page-container family-manager-page"><BackHomeButton/><section className="family-manager-card"><p className="family-manager-kicker">FAMILY REVIEW</p><h1>Loading review queue...</h1></section></main>;
  if (!isHead) return <main className="page-container family-manager-page"><BackHomeButton/><section className="family-manager-card"><p className="family-manager-kicker">FAMILY REVIEW</p><h1>Family Head access required</h1><p>Only the Family Head can approve or reject shared-record changes.</p><Link className="family-manager-button family-manager-button--primary" to="/account/family">Back to My Family</Link></section></main>;

  return (
    <main className="page-container family-manager-page">
      <BackHomeButton/>
      <header className="family-manager-hero">
        <div>
          <p className="family-manager-kicker">FAMILY REVIEW</p>
          <h1>Review proposed real-record changes</h1>
          <p>Moderate family members can work normally, but their edits stop here until you decide what should enter the real keeper record.</p>
        </div>
        <div className="family-manager-hero-actions"><Link className="family-manager-button" to="/account/family/manage">Family Manager</Link><Link className="family-manager-button" to="/account/family/manage?view=history">History</Link></div>
      </header>
      {message && <div className="family-manager-message" role="status">{message}</div>}
      {error && <div className="family-manager-error" role="alert">{error}</div>}
      <section className="family-review-summary">
        <div><strong>{pending.length}</strong><span>Awaiting decision</span></div>
        <div><strong>{approvals.filter((item) => item.status === "approved").length}</strong><span>Approved</span></div>
        <div><strong>{approvals.filter((item) => item.status === "rejected").length}</strong><span>Rejected</span></div>
      </section>
      <section className="family-review-layout">
        <div className="family-manager-card">
          <div className="family-manager-section-head"><div><p className="family-manager-kicker">QUEUE</p><h2>Family change requests</h2></div><span>{approvals.length} total</span></div>
          {approvals.length === 0 ? <div className="family-manager-empty"><div>✅</div><h3>Nothing needs your attention</h3><p>When a Moderate family member proposes a real record edit, it will appear here.</p></div> : (
            <div className="family-review-list">
              {approvals.map((item) => (
                <button type="button" key={item.id} className={`family-review-item ${selected === item.id ? "is-active" : ""}`} onClick={() => setSelected(item.id)}>
                  <span className={`family-review-status family-review-status--${item.status}`}>{item.status}</span>
                  <span><strong>{item.title}</strong><small>{requesterNames[item.requesterUid] || safeRequesterName(item.requesterName)} · {formatDate(item.createdAt)}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="family-manager-card family-review-detail">
          {!selectedApproval ? <div className="family-manager-empty"><div>🔍</div><h3>Select a request</h3><p>Review the requester, affected area, proposed operation and values before deciding.</p></div> : (
            <>
              <div className="family-manager-section-head">
                <div><p className="family-manager-kicker">REQUEST</p><h2>{selectedApproval.title}</h2><span className="family-manager-muted">Submitted by <strong>{selectedRequesterName}</strong> · {formatDate(selectedApproval.createdAt)}</span></div>
                <span className={`family-review-status family-review-status--${selectedApproval.status}`}>{selectedApproval.status}</span>
              </div>
              <p className="family-review-description">{selectedApproval.description}</p>
              <div className="family-review-meta">
                <span><b>Area</b>{titleCase(selectedApproval.area)}</span>
                <span><b>Action</b>{titleCase(selectedApproval.action)}</span>
                <span><b>Change</b>{titleCase(String(selectedApproval.payload?.operation || "update"))}</span>
              </div>
              <div className="family-review-change-note">{String(selectedApproval.payload?.operation || "update") === "create" ? "This is a new entry. Approving it will add the proposed record to the shared tracker." : "Review the existing and proposed values below before applying this change."}</div>
              <div className="family-review-diff">
                <div>
                  <div className="family-review-panel-heading"><span className="family-review-panel-icon">📋</span><div><p className="family-manager-kicker">CURRENT</p><h3>Saved family record</h3></div></div>
                  <FriendlyValuePanel value={selectedApproval.payload?.before ?? null} emptyMessage="No existing record — this is a new entry." />
                </div>
                <div>
                  <div className="family-review-panel-heading"><span className="family-review-panel-icon">✏️</span><div><p className="family-manager-kicker">PROPOSED</p><h3>What will be saved</h3></div></div>
                  <FriendlyValuePanel value={selectedApproval.payload?.data ?? null} emptyMessage="No proposed details supplied." />
                </div>
              </div>
              {selectedApproval.status === "pending" && <div className="family-review-decision"><strong>Make the final decision</strong><p>Approve applies the proposed change to the real family record. Reject leaves that record untouched.</p><div><button type="button" className="family-manager-button family-manager-button--primary" disabled={busy === selectedApproval.id} onClick={() => void decide(selectedApproval.id, "approved")}>{busy === selectedApproval.id ? "Working..." : "Approve & Apply"}</button><button type="button" className="family-manager-button family-manager-button--danger" disabled={busy === selectedApproval.id} onClick={() => void decide(selectedApproval.id, "rejected")}>Reject</button></div></div>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
