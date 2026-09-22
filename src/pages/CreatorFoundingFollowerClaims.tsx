import { useEffect, useMemo, useState } from "react";
import { getFoundingFollowerScreenshotUrl, loadFoundingFollowerClaims, formatClaimDate, reviewFoundingFollowerClaim, type FoundingFollowerClaim } from "../services/foundingFollowerRewardService";
import "../styles/creatorFoundingFollowerClaims.css";

type Filter = "pending" | "all" | "approved" | "rejected";

export default function CreatorFoundingFollowerClaims() {
  const [claims, setClaims] = useState<FoundingFollowerClaim[]>([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0, processing: 0 });
  const [filter, setFilter] = useState<Filter>("pending");
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await loadFoundingFollowerClaims();
      setClaims(response.claims || []);
      setSummary(response.summary || { pending: 0, approved: 0, rejected: 0, processing: 0 });
      const urls = await Promise.all((response.claims || []).map(async (claim) => {
        try { return [claim.id, await getFoundingFollowerScreenshotUrl(claim.screenshotPath)] as const; } catch { return [claim.id, ""] as const; }
      }));
      setScreenshots(Object.fromEntries(urls));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Founding Follower claims could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const visibleClaims = useMemo(() => claims.filter((claim) => filter === "all" || claim.status === filter), [claims, filter]);

  async function review(claim: FoundingFollowerClaim, action: "approve" | "reject") {
    let notes = "";
    if (action === "reject") {
      notes = window.prompt("Optional note for the user (for example: please send a screenshot with the Follow/Following state visible).", claim.reviewerNotes || "") || "";
    } else if (!window.confirm(`Approve ${claim.id} and activate 30 days of Titan Pro?`)) {
      return;
    }
    setBusyUid(claim.id);
    setError("");
    setNotice("");
    try {
      const result = await reviewFoundingFollowerClaim(claim.id, action, notes);
      if (action === "approve") {
        setNotice(`Approved ${claim.id}. Titan Pro is now active until ${result.expiresAt ? new Date(result.expiresAt).toLocaleDateString("en-GB") : "the stored trial expiry"}.`);
      } else {
        setNotice(`Rejected ${claim.id}.`);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The claim could not be reviewed.");
    } finally {
      setBusyUid("");
    }
  }

  return (
    <main className="tt-creator-founders-page">
      <header className="tt-creator-founders-header">
        <div>
          <span className="tt-creator-founders-eyebrow">CREATOR CENTRE · COMMUNITY REWARD</span>
          <h1>🦖 Founding Follower Claims</h1>
          <p>Review Facebook and Instagram follow screenshots and activate the 30-day Titan Pro reward on approval.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
      </header>

      <section className="tt-creator-founders-summary">
        <button type="button" className={filter === "pending" ? "is-active" : ""} onClick={() => setFilter("pending")}><strong>{summary.pending}</strong><span>PENDING</span></button>
        <button type="button" className={filter === "approved" ? "is-active" : ""} onClick={() => setFilter("approved")}><strong>{summary.approved}</strong><span>APPROVED</span></button>
        <button type="button" className={filter === "rejected" ? "is-active" : ""} onClick={() => setFilter("rejected")}><strong>{summary.rejected}</strong><span>REJECTED</span></button>
        <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}><strong>{summary.pending + summary.approved + summary.rejected + summary.processing}</strong><span>ALL</span></button>
      </section>

      {error && <p className="tt-creator-founders-error" role="alert">{error}</p>}
      {notice && <p className="tt-creator-founders-notice" role="status">{notice}</p>}

      <section className="tt-creator-founders-list">
        {visibleClaims.map((claim) => (
          <article key={claim.id} className={`tt-creator-founder-claim tt-creator-founder-claim-${claim.status}`}>
            <div className="tt-creator-founder-shot">
              {screenshots[claim.id] ? <a href={screenshots[claim.id]} target="_blank" rel="noreferrer"><img src={screenshots[claim.id]} alt={`${claim.platform} follow verification screenshot`} /></a> : <div>Screenshot unavailable</div>}
            </div>
            <div className="tt-creator-founder-main">
              <span className="tt-creator-founders-kicker">{claim.platform.toUpperCase()} · {claim.status.toUpperCase()}</span>
              <h2>{claim.targetName || claim.id}</h2>
              <p>{claim.targetEmail || claim.id} · Submitted {formatClaimDate(claim.submittedAt)}</p>
              {claim.status === "rejected" && claim.rejectionReason && <p className="tt-creator-founder-note">Reason: {claim.rejectionReason}</p>}
              {claim.trialExpiresAt && <p>Trial expiry: {formatClaimDate(claim.trialExpiresAt)}</p>}
            </div>
            <div className="tt-creator-founder-actions">
              {claim.status === "pending" && <>
                <button type="button" className="is-primary" onClick={() => void review(claim, "approve")} disabled={busyUid === claim.id}>{busyUid === claim.id ? "Working…" : "✓ Approve & grant Pro"}</button>
                <button type="button" onClick={() => void review(claim, "reject")} disabled={busyUid === claim.id}>Reject</button>
              </>}
              {claim.status === "processing" && <span>Processing…</span>}
              {claim.status === "approved" && <span>🎁 Pro active</span>}
            </div>
          </article>
        ))}
        {!loading && visibleClaims.length === 0 && <div className="tt-creator-founders-empty">No claims in this view.</div>}
      </section>
    </main>
  );
}
