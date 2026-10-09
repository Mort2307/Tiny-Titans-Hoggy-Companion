import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import TinyTitansIcon from "./TinyTitansIcon";
import TinyTitansEmptyState from "./TinyTitansEmptyState";
import {
  getAllUserMorphSubmissions,
  reviewUserMorphSubmission,
} from "../services/creatorUserMorphSubmissionService";
import type { UserMorphSubmission, UserMorphSubmissionStatus } from "../types/morphSubmission";
import "../styles/CreatorTools.css";

function when(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString("en-GB");
}

export default function CreatorVariationCardReview() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<UserMorphSubmission[]>([]);
  const [selected, setSelected] = useState<UserMorphSubmission | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visible = useMemo(
    () => filter === "pending"
      ? items.filter((item) => item.status === "pending" || item.status === "under-review")
      : items,
    [filter, items],
  );

  async function load() {
    if (profile?.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      setItems(await getAllUserMorphSubmissions());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load variation-card proposals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (profile?.role === "admin") void load(); }, [profile?.role]);

  async function decide(status: UserMorphSubmissionStatus) {
    if (!selected || !user) return;
    const promptText =
      status === "approved"
        ? "Approval / evidence note. This publishes a public variation card but does NOT promote it into the genetics calculator:"
        : status === "merged"
          ? "Which existing record does this duplicate or alias?"
          : status === "under-review"
            ? "Optional research note:"
            : "Rejection note:";
    const note = window.prompt(promptText, selected.reviewerNotes ?? "") ?? "";
    if ((status === "rejected" || status === "merged") && !note.trim()) return;

    setWorking(true);
    setError("");
    setNotice("");
    try {
      await reviewUserMorphSubmission({
        userId: selected.userId,
        submissionId: selected.id,
        status,
        reviewerNotes: note,
        matchedCanonicalMorphId: selected.matchedCanonicalMorphId,
        reviewerUid: user.uid,
      });
      setNotice(
        status === "approved"
          ? selected.submittedName + " published as a community-reviewed variation card. Genetics remain unresolved."
          : selected.submittedName + " updated to " + status + ".",
      );
      setSelected(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to review this variation-card proposal.");
    } finally {
      setWorking(false);
    }
  }

  if (profile?.role !== "admin") return null;

  return (
    <section className="creator-admin-section" aria-label="Variation card review">
      <div className="creator-section-heading">
        <div>
          <span className="creator-admin-kicker">COMMUNITY VARIATION CARDS</span>
          <h2><TinyTitansIcon name="morph" size={20} /> Morph & variation proposals</h2>
          <p>Approve documentation without inventing genetics. Approved cards stay outside the breeding calculator until inheritance is separately verified and promoted.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || working}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      {error && <div className="creator-error">{error}</div>}
      {notice && <div className="creator-success">{notice}</div>}

      <div className="morph-library__filters">
        <button type="button" className={filter === "pending" ? "is-active" : ""} onClick={() => setFilter("pending")}>Pending</button>
        <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>All</button>
      </div>

      {loading ? <div className="creator-loading">Loading variation-card proposals…</div> : visible.length === 0 ? (
        <TinyTitansEmptyState compact icon="morph" title="No variation-card proposals in this view" description="Keeper suggestions will appear here for evidence-led review." />
      ) : (
        <div className="creator-list">
          {visible.map((item) => (
            <button key={item.userId + ":" + item.id} type="button" className="creator-user-row" onClick={() => setSelected(item)}>
              <span className="creator-user-avatar"><TinyTitansIcon name="morph" size={18} /></span>
              <span className="creator-user-main">
                <strong>{item.submittedName}</strong>
                <small>{item.speciesName || item.speciesId}</small>
                <small>{item.category.replaceAll("-", " ")}</small>
              </span>
              <span className="creator-user-meta">
                <strong>{item.status}</strong>
                <small>{when(item.createdAt)}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="creator-user-modal-backdrop" role="presentation" onClick={() => !working && setSelected(null)}>
          <section className="creator-user-modal creator-submission-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="creator-section-heading">
              <div>
                <span className="creator-admin-kicker">VARIATION REVIEW</span>
                <h2>{selected.submittedName}</h2>
                <p>{selected.speciesName || selected.speciesId} · {selected.category.replaceAll("-", " ")}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} disabled={working}><TinyTitansIcon name="close" size={13} /></button>
            </div>

            <div className="creator-user-detail-grid">
              <div><strong>Description</strong><span>{selected.description}</span></div>
              <div><strong>User-reported genetics</strong><span>{selected.knownGenetics || "None supplied"}</span></div>
              <div><strong>Source / breeder</strong><span>{selected.sourceOrBreeder || "Not supplied"}</span></div>
              <div><strong>Source URL</strong><span>{selected.sourceUrl || "Not supplied"}</span></div>
              <div><strong>Region</strong><span>{selected.region}</span></div>
              <div><strong>Current status</strong><span>{selected.status}</span></div>
            </div>

            <div className="creator-list-item">
              <strong>Safety boundary</strong>
              <span>Approval publishes a descriptive community variation card only. It does not create a gene, het state, inheritance rule, super form or calculator locus.</span>
            </div>

            {(selected.status === "pending" || selected.status === "under-review") && (
              <div className="creator-submission-actions">
                <button type="button" onClick={() => void decide("rejected")} disabled={working}>Reject</button>
                <button type="button" onClick={() => void decide("merged")} disabled={working}>Merge / duplicate</button>
                <button type="button" onClick={() => void decide("under-review")} disabled={working}>Keep researching</button>
                <button type="button" onClick={() => void decide("approved")} disabled={working}><TinyTitansIcon name="check" size={13} /> Approve variation card</button>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
