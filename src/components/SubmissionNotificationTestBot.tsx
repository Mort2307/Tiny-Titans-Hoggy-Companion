import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageBackButton from "./PageBackButton";
import { useAuth } from "../context/useAuth";
import {
  finishSubmissionNotificationTest,
  getSubmissionNotificationTestRun,
  markSubmissionNotificationTestAccepted,
  markSubmissionNotificationTestOpened,
  sendNextSubmissionNotificationTest,
  startSubmissionNotificationTest,
  type SubmissionNotificationTestRun,
} from "../services/submissionNotificationTestService";
import "./SubmissionNotificationTestBot.css";

function formatStatus(status: string) {
  if (status === "accepted") return "✅ Accepted";
  if (status === "opened") return "👁️ Opened / read";
  if (status === "sent") return "📨 Sent";
  if (status === "failed") return "❌ Failed";
  return "⏳ Waiting";
}

export default function SubmissionNotificationTestBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [run, setRun] = useState<SubmissionNotificationTestRun | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const runId = searchParams.get("submissionNotificationRun") || "";
  const itemId = searchParams.get("submissionNotificationItem") || "";
  const currentItem = useMemo(() => run?.items.find((item) => item.id === itemId) || null, [run, itemId]);
  const acceptedCount = run?.summary?.accepted ?? run?.items.filter((item) => item.acceptedAt).length ?? 0;
  const sentCount = run?.summary?.sent ?? run?.items.filter((item) => (item.sentCount ?? 0) > 0).length ?? 0;
  const openedCount = run?.summary?.opened ?? run?.items.filter((item) => item.openedAt).length ?? 0;
  const lastItemAccepted = Boolean(run && run.items.length && run.items[run.items.length - 1].acceptedAt);

  useEffect(() => {
    if (!user || !runId) return;
    let cancelled = false;

    const loadRun = async () => {
      try {
        // When opened from a notification, mark that exact item as opened/read first.
        // This deliberately replaces the old parallel getRun + markOpened requests,
        // which could race and overwrite the fresh "opened" state with stale "sent" data.
        const next = itemId
          ? await markSubmissionNotificationTestOpened(runId, itemId)
          : await getSubmissionNotificationTestRun(runId);

        if (cancelled) return;
        setRun(next);
        setDelayMinutes(next.delayMinutes);
        if (itemId) setMessage("Notification opened and read by the tester. Now press ACCEPT NOTIFICATION.");
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load the notification test run.");
      }
    };

    void loadRun();
    return () => { cancelled = true; };
  }, [user, runId, itemId]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  async function start() {
    setBusy(true); setError(""); setMessage(""); setRun(null); setCountdown(0);
    try {
      const created = await startSubmissionNotificationTest(Math.max(0, Math.min(10, delayMinutes)));
      const next = await sendNextSubmissionNotificationTest(created.id);
      setRun((current) => current ? current : { ...created, items: created.items.map((item) => item.id === next.item.id ? next.item : item) });
      setMessage("Test run started. Waiting for the first Tiny Titans notification.");
      navigate(`/creator/tester?submissionNotifications=1&submissionNotificationRun=${encodeURIComponent(created.id)}&submissionNotificationItem=${encodeURIComponent(next.item.id)}`, { replace: true });
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start the submission notification test.");
    } finally { setBusy(false); }
  }

  async function acceptCurrent() {
    if (!run || !currentItem || currentItem.acceptedAt || busy) return;
    setBusy(true); setError("");
    try {
      const next = await markSubmissionNotificationTestAccepted(run.id, currentItem.id);
      setRun(next);
      setMessage("Accepted. The bot has recorded this notification as successfully received.");
      const index = next.items.findIndex((item) => item.id === currentItem.id);
      if (index >= 0 && index < next.items.length - 1) setCountdown(next.delayMinutes * 60);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to record notification acceptance.");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!run || run.status !== "running" || countdown !== 0 || busy) return;
    const nextPending = run.items.find((item) => item.status === "pending");
    if (!nextPending) return;
    const previousUnaccepted = run.items.some((item) => item.order < nextPending.order && !item.acceptedAt && item.status !== "failed");
    if (previousUnaccepted) return;
    const unanswered = run.items.some((item) => (item.status === "sent" || item.status === "opened") && !item.acceptedAt);
    if (unanswered) return;

    let cancelled = false;
    setBusy(true);
    void sendNextSubmissionNotificationTest(run.id).then((response) => {
      if (cancelled) return;
      setRun((current) => current ? { ...current, items: current.items.map((item) => item.id === response.item.id ? response.item : item) } : current);
      navigate(`/creator/tester?submissionNotifications=1&submissionNotificationRun=${encodeURIComponent(run.id)}&submissionNotificationItem=${encodeURIComponent(response.item.id)}`, { replace: true });
      setMessage(`Next notification sent: ${response.item.label}. Click it when it arrives.`);
      setBusy(false);
    }).catch((sendError) => {
      if (!cancelled) {
        setError(sendError instanceof Error ? sendError.message : "Unable to send the next submission notification.");
        setBusy(false);
      }
    });
    return () => { cancelled = true; };
  }, [run, countdown, busy, navigate]);

  async function finish() {
    if (!run || !lastItemAccepted || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await finishSubmissionNotificationTest(run.id);
      setRun(result);
      setMessage(result.summary?.broken ? "Sweep complete — one or more notification stages failed." : "Sweep complete — every notification passed sent → opened/read → accepted.");
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Unable to finish the notification test run.");
    } finally { setBusy(false); }
  }

  return <main className="page-container submission-notification-test"><PageBackButton fallbackPath="/creator/tester" label="Back to Tester Centre" /><header className="snt-hero"><div><span>PRIVATE QA · NOTIFICATION PIPELINE</span><h1>📨 Submission Notification BOT</h1><p>One controlled sweep across every user submission notification. The bot records what it sent, what you actually opened/read, and what you explicitly accepted.</p></div></header>
    <section className="snt-panel"><div className="snt-panel-title"><div><span>TEST CONTROL</span><h2>Run the full submission sweep</h2></div><span className="snt-safety">🔒 No real user submissions created</span></div><p>Choose 0–10 minutes between notifications. The bot sends one test at a time and waits for you to open and accept it before continuing.</p><div className="snt-controls"><label>Delay between notifications<select value={delayMinutes} onChange={(event) => setDelayMinutes(Number(event.target.value))} disabled={Boolean(run && run.status === "running")}>{Array.from({ length: 11 }, (_, value) => <option key={value} value={value}>{value === 0 ? "Immediately" : `${value} minute${value === 1 ? "" : "s"}`}</option>)}</select></label><button className="snt-primary" type="button" onClick={() => void start()} disabled={busy || Boolean(run && run.status === "running")}>▶ Start Full Sweep</button></div></section>
    {run && <><section className="snt-stats"><div><strong>{run.itemCount}</strong><span>Planned</span></div><div><strong>{sentCount}</strong><span>Sent</span></div><div><strong>{openedCount}</strong><span>Opened / read</span></div><div><strong>{acceptedCount}</strong><span>Accepted</span></div></section>
      {run.status === "running" && <section className="snt-panel snt-live"><div className="snt-panel-title"><div><span>LIVE RUN</span><h2>{currentItem ? currentItem.label : "Waiting for the next notification"}</h2></div><span className="snt-safety">{currentItem ? formatStatus(currentItem.status) : "Waiting"}</span></div><p>{currentItem?.description || "The bot has sent a notification and is waiting for the click/read action."}</p>{currentItem?.acceptedAt ? <div className="snt-success-box">✅ This notification has been accepted successfully.</div> : currentItem?.openedAt ? <button type="button" className="snt-accept" onClick={() => void acceptCurrent()} disabled={busy}>✅ ACCEPT NOTIFICATION</button> : <div className="snt-waiting">📱 Wait for the notification, then click it. The bot will mark it opened/read automatically.</div>}{countdown > 0 && <div className="snt-countdown">Next notification in <strong>{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</strong></div>}</section>}
      <section className="snt-panel"><div className="snt-panel-title"><div><span>SUBMISSION COVERAGE</span><h2>Every submission notification</h2></div></div><div className="snt-list">{run.items.map((item) => <article key={item.id} className={`snt-item ${item.status}`}><div><strong>{item.label}</strong><span>{item.description}</span></div><div><b>{formatStatus(item.status)}</b>{item.failureMessage && <small>{item.failureMessage}</small>}</div></article>)}</div></section>
      {run.status === "running" && lastItemAccepted && <button className="snt-last" type="button" onClick={() => void finish()} disabled={busy}>🏁 LAST ONE — FINISH & TALLY</button>}
      {run.status === "complete" && run.summary && <section className={`snt-result ${run.summary.broken ? "has-failures" : "all-pass"}`}><span>FINAL RESULT</span><h2>{run.summary.broken ? "⚠️ Notification pipeline needs attention" : "✅ Notification pipeline passed"}</h2><div className="snt-result-grid"><div><strong>{run.summary.expected}</strong><span>Expected</span></div><div><strong>{run.summary.sent}</strong><span>FCM accepted</span></div><div><strong>{run.summary.opened}</strong><span>Opened/read</span></div><div><strong>{run.summary.accepted}</strong><span>Accepted</span></div><div><strong>{run.summary.passed}</strong><span>Passed</span></div><div><strong>{run.summary.broken}</strong><span>Broken</span></div></div><p>A pass requires the bot to send the notification, you to open/read it, and you to press ACCEPT NOTIFICATION.</p></section>}
    </>}
    {message && <div className="snt-message">{message}</div>}{error && <div className="snt-error">⚠️ {error}</div>}
  </main>;
}
