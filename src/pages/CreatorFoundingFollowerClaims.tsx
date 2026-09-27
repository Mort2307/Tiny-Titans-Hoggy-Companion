import { useCallback, useEffect, useMemo, useState } from "react";
import { getFoundingFollowerScreenshotUrl, loadFoundingFollowerClaims, formatClaimDate, reviewFoundingFollowerClaim, type FoundingFollowerClaim } from "../services/foundingFollowerRewardService";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansFeedback from "../components/TinyTitansFeedback";
import TinyTitansEmptyState from "../components/TinyTitansEmptyState";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
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
  const [approveTarget, setApproveTarget] = useState<FoundingFollowerClaim | null>(null);

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visibleClaims = useMemo(() => claims.filter((claim) => filter === "all" || claim.status === filter), [claims, filter]);

  async function review(claim: FoundingFollowerClaim, action: "approve" | "reject") {
    let notes = "";
    if (action === "reject") {
      notes = window.prompt("Optional note for the user (for example: please send a screenshot with the Follow/Following state visible).", claim.reviewerNotes || "") || "";
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
      if (action === "approve") setApproveTarget(null);
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
          <h1><TinyTitansIcon name="wall" size={28} /> Founding Follower Claims</h1>
          <p>Review Facebook and Instagram follow screenshots and activate the 30-day Titan Pro reward on approval.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : <><TinyTitansIcon name="rotate" size={16} /> Refresh</>}</button>
      </header>

      <section className="tt-creator-founders-summary">
        <button type="button" className={filter === "pending" ? "is-active" : ""} onClick={() => setFilter("pending")}><strong>{summary.pending}</strong><span>PENDING</span></button>
        <button type="button" className={filter === "approved" ? "is-active" : ""} onClick={() => setFilter("approved")}><strong>{summary.approved}</strong><span>APPROVED</span></button>
        <button type="button" className={filter === "rejected" ? "is-active" : ""} onClick={() => setFilter("rejected")}><strong>{summary.rejected}</strong><span>REJECTED</span></button>
        <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}><strong>{summary.pending + summary.approved + summary.rejected + summary.processing}</strong><span>ALL</span></button>
      </section>

      {error && <TinyTitansFeedback kind="error" className="tt-creator-founders-error">{error}</TinyTitansFeedback>}
      {notice && <TinyTitansFeedback kind="success" className="tt-creator-founders-notice">{notice}</TinyTitansFeedback>}

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
              {claim.trialExpiresAt != null && <p>Trial expiry: {formatClaimDate(claim.trialExpiresAt)}</p>}
            </div>
            <div className="tt-creator-founder-actions">
              {claim.status === "pending" && <>
                <button type="button" className="is-primary" onClick={() => setApproveTarget(claim)} disabled={busyUid === claim.id}>{busyUid === claim.id ? "Working…" : <><TinyTitansIcon name="check" size={15} /> Approve & grant Pro</>}</button>
                <button type="button" onClick={() => void review(claim, "reject")} disabled={busyUid === claim.id}>Reject</button>
              </>}
              {claim.status === "processing" && <span>Processing…</span>}
              {claim.status === "approved" && <span><TinyTitansIcon name="plans" size={15} /> Pro active</span>}
            </div>
          </article>
        ))}
        {!loading && visibleClaims.length === 0 && <TinyTitansEmptyState compact icon="wall" title="No claims in this view" description="Change the filter or wait for another Founding Follower submission." />}
      </section>
      <ConfirmActionDialog
        open={Boolean(approveTarget)}
        title="Approve Founding Follower reward?"
        description={approveTarget ? `Approve ${approveTarget.targetName || approveTarget.id} and activate 30 days of Titan Pro.` : "Approve this claim and activate the reward."}
        confirmLabel="Approve & grant Pro"
        destructive={false}
        busy={Boolean(busyUid)}
        onCancel={() => { if (!busyUid) setApproveTarget(null); }}
        onConfirm={() => { if (approveTarget) void review(approveTarget, "approve"); }}
      />
    </main>
  );
}
