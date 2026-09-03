import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageBackButton from "./PageBackButton";
import { useAuth } from "../context/useAuth";
import { enableNotifications } from "../services/notificationService";
import {
  finishSubmissionNotificationTest,
  getSubmissionNotificationTestRun,
  getSubmissionNotificationTestTargets,
  markSubmissionNotificationTestAccepted,
  markSubmissionNotificationTestOpened,
  sendNextSubmissionNotificationTest,
  startSubmissionNotificationTest,
  type SubmissionNotificationTestKind,
  type SubmissionNotificationTestRun,
} from "../services/submissionNotificationTestService";
import type { NotificationTestTarget } from "../services/notificationService";
import "./SubmissionNotificationTestBot.css";

const TESTS: Array<{ kind: SubmissionNotificationTestKind; icon: string; label: string; description: string }> = [
  { kind: "bug", icon: "🐛", label: "Bug report", description: "Creator bug/error notification." },
  { kind: "feedback", icon: "💬", label: "Feedback", description: "General feedback notification." },
  { kind: "morph-image", icon: "🧬", label: "Morph image submission", description: "Morph image/evidence review notification." },
  { kind: "morph-terminology", icon: "🌎", label: "Morph terminology", description: "User terminology contribution notification." },
  { kind: "behaviour", icon: "🐍", label: "Behaviour observation", description: "Behaviour Observatory review notification." },
  { kind: "mentor", icon: "🛡️", label: "Mentor application", description: "Mentor application notification." },
  { kind: "founder", icon: "🏆", label: "Founder application", description: "Founder application notification." },
  { kind: "community", icon: "🌍", label: "Community contribution", description: "Community contribution notification." },
  { kind: "feature", icon: "💡", label: "Feature request", description: "Feature request notification." },
];

function formatStatus(status: string) {
  if (status === "accepted") return "✅ Accepted";
  if (status === "opened") return "👁️ Opened / read";
  if (status === "sent") return "📨 Sent";
  if (status === "failed") return "❌ Failed";
  return "⏳ Waiting";
}

function sleep(ms: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, ms)); }

export default function SubmissionNotificationTestBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [targets, setTargets] = useState<NotificationTestTarget[]>([]);
  const [targetUid, setTargetUid] = useState(user?.uid || "");
  const [selectedKinds, setSelectedKinds] = useState<SubmissionNotificationTestKind[]>(TESTS.map((item) => item.kind));
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [run, setRun] = useState<SubmissionNotificationTestRun | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const runId = searchParams.get("submissionNotificationRun") || "";
  const itemId = searchParams.get("submissionNotificationItem") || "";
  const currentItem = useMemo(() => run?.items.find((item) => item.id === itemId) || null, [run, itemId]);
  const acceptedCount = run?.summary?.accepted ?? run?.items.filter((item) => item.acceptedAt).length ?? 0;
  const sentCount = run?.summary?.sent ?? run?.items.filter((item) => (item.sentCount ?? 0) > 0).length ?? 0;
  const openedCount = run?.summary?.opened ?? run?.items.filter((item) => item.openedAt).length ?? 0;
  const lastItemAccepted = Boolean(run && run.items.length && run.items[run.items.length - 1].acceptedAt);
  const selectedTarget = targets.find((target) => target.uid === targetUid);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingTargets(true);
    void getSubmissionNotificationTestTargets().then((items) => {
      if (!active) return;
      setTargets(items);
      setTargetUid((currentTargetUid) => currentTargetUid || items.find((item) => item.uid === user.uid)?.uid || items[0]?.uid || user.uid);
    }).catch((loadError) => {
      console.warn("Tiny Titans submission tester targets could not be loaded", loadError);
      if (active) setTargets([]);
    }).finally(() => { if (active) setLoadingTargets(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !runId) return;
    let cancelled = false;
    const loadRun = async () => {
      try {
        const next = itemId ? await markSubmissionNotificationTestOpened(runId, itemId) : await getSubmissionNotificationTestRun(runId);
        if (cancelled) return;
        setRun(next);
        setDelayMinutes(next.delayMinutes);
        setTargetUid(next.targetUid);
        setSelectedKinds(next.selectedKinds);
        if (itemId) setMessage("Notification opened/read recorded. Press ACCEPT NOTIFICATION to continue the run.");
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

  function toggleKind(kind: SubmissionNotificationTestKind) {
    setSelectedKinds((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]);
  }

  function selectAllKinds() { setSelectedKinds(TESTS.map((item) => item.kind)); }

  async function ensureSelfDevice() {
    if (!user || targetUid !== user.uid) return;
    const result = await enableNotifications(user.uid);
    if (result !== "granted") throw new Error("Notifications are not enabled on this device.");
  }

  async function start() {
    if (!targetUid || !selectedKinds.length) return;
    setBusy(true); setError(""); setMessage(""); setRun(null); setCountdown(0);
    try {
      await ensureSelfDevice();
      const created = await startSubmissionNotificationTest({ delayMinutes: Math.max(0, Math.min(10, delayMinutes)), targetUserId: targetUid, selectedKinds });
      const next = await sendNextSubmissionNotificationTest(created.id);
      const nextRun = { ...created, items: created.items.map((item) => item.id === next.item.id ? next.item : item) };
      setRun(nextRun);
      setMessage(`${nextRun.itemCount} selected notification test${nextRun.itemCount === 1 ? "" : "s"} queued for ${nextRun.targetName}.`);
      navigate(`/creator/tester?submissionNotifications=1&submissionNotificationRun=${encodeURIComponent(created.id)}&submissionNotificationItem=${encodeURIComponent(next.item.id)}`, { replace: true });
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start the submission notification test.");
    } finally { setBusy(false); }
  }

  async function sendNext(runState: SubmissionNotificationTestRun) {
    const pending = runState.items.find((item) => item.status === "pending");
    if (!pending) return false;
    const response = await sendNextSubmissionNotificationTest(runState.id);
    setRun((current) => current ? { ...current, items: current.items.map((item) => item.id === response.item.id ? response.item : item) } : current);
    navigate(`/creator/tester?submissionNotifications=1&submissionNotificationRun=${encodeURIComponent(runState.id)}&submissionNotificationItem=${encodeURIComponent(response.item.id)}`, { replace: true });
    setMessage(`Next notification sent: ${response.item.label} → ${runState.targetName}.`);
    return true;
  }

  async function acceptCurrent() {
    if (!run || !currentItem || currentItem.acceptedAt || busy) return;
    setBusy(true); setError("");
    try {
      const acceptedRun = await markSubmissionNotificationTestAccepted(run.id, currentItem.id);
      setRun(acceptedRun);
      const pending = acceptedRun.items.find((item) => item.status === "pending");
      if (!pending) { setMessage("✅ Final notification accepted. Review the tally below, then finish the run."); return; }
      const delaySeconds = acceptedRun.delayMinutes * 60;
      if (delaySeconds > 0) {
        setCountdown(delaySeconds);
        setMessage(`✅ Accepted. Next notification will be sent in ${acceptedRun.delayMinutes} minute${acceptedRun.delayMinutes === 1 ? "" : "s"}.`);
        setBusy(false);
        await sleep(delaySeconds * 1000);
        setBusy(true);
      }
      await sendNext(acceptedRun);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to record notification acceptance.");
    } finally { setBusy(false); }
  }

  async function markOpenedManually() {
    if (!run || !currentItem || currentItem.openedAt || busy) return;
    setBusy(true); setError("");
    try { setRun(await markSubmissionNotificationTestOpened(run.id, currentItem.id)); setMessage("👁️ Marked opened/read. This is provided for remote target testing where the recipient confirms receipt to the owner."); }
    catch (openError) { setError(openError instanceof Error ? openError.message : "Unable to record notification as opened."); }
    finally { setBusy(false); }
  }

  async function finish() {
    if (!run || !lastItemAccepted || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await finishSubmissionNotificationTest(run.id);
      setRun(result);
      setMessage(result.summary?.broken ? "Sweep complete — one or more notification stages failed." : "Sweep complete — every selected notification passed sent → opened/read → accepted.");
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Unable to finish the notification test run.");
    } finally { setBusy(false); }
  }

  return <main className="page-container submission-notification-test">
    <PageBackButton fallbackPath="/creator/tester" label="Back to Tester Centre" />
    <header className="snt-hero"><div><span>PRIVATE QA · NOTIFICATION PIPELINE</span><h1>📨 Submission Notification BOT</h1><p>Run the entire submission-notification sweep or isolate exactly the notification type and recipient you are testing. No real submissions are created.</p></div></header>
    {!run && <section className="snt-panel">
      <div className="snt-panel-title"><div><span>1 · NOTIFICATION COVERAGE</span><h2>Choose what to test</h2></div><button type="button" className="snt-text-button" onClick={selectAllKinds} disabled={busy}>Select full sweep</button></div>
      <div className="snt-route-grid">{TESTS.map((test) => <label key={test.kind} className={`snt-route ${selectedKinds.includes(test.kind) ? "is-selected" : ""}`}><input type="checkbox" checked={selectedKinds.includes(test.kind)} onChange={() => toggleKind(test.kind)} disabled={busy}/><span className="snt-route-icon">{test.icon}</span><span><strong>{test.label}</strong><small>{test.description}</small></span></label>)}</div>
      <p>Select one notification for a surgical test, several related notifications, or every registered submission notification for a full regression sweep.</p>
    </section>}
    {!run && <section className="snt-panel">
      <div className="snt-panel-title"><div><span>2 · TARGET RECIPIENT</span><h2>Choose who receives the test</h2></div><span className="snt-safety">🔒 Owner-controlled</span></div>
      <select className="snt-target-select" value={targetUid} onChange={(event) => setTargetUid(event.target.value)} disabled={busy || loadingTargets}>
        {loadingTargets ? <option value="">Loading authorised test targets…</option> : targets.map((target) => <option key={target.uid} value={target.uid}>{target.uid === user?.uid ? "This account" : target.displayName} — {target.email} {target.deviceReady ? "· 📱 Ready" : "· ⚠️ No device"}</option>)}
      </select>
      <p>{selectedTarget?.deviceReady ? `Ready to receive tests on ${selectedTarget.displayName}.` : "This account has no registered push device. Enable Tiny Titans notifications on that account before testing delivery."}</p>
    </section>}
    {!run && <section className="snt-panel"><div className="snt-panel-title"><div><span>3 · TEST TIMING</span><h2>Control the sequence</h2></div></div><div className="snt-controls"><label>Delay between notifications<select value={delayMinutes} onChange={(event) => setDelayMinutes(Number(event.target.value))} disabled={busy}>{Array.from({ length: 11 }, (_, value) => <option key={value} value={value}>{value === 0 ? "Immediately" : `${value} minute${value === 1 ? "" : "s"}`}</option>)}</select></label><button className="snt-primary" type="button" onClick={() => void start()} disabled={busy || !targetUid || !selectedKinds.length}>▶ Start Selected Test{selectedKinds.length === TESTS.length ? " Sweep" : ""}</button></div></section>}
    {run && <><section className="snt-stats"><div><strong>{run.itemCount}</strong><span>Selected</span></div><div><strong>{sentCount}</strong><span>Sent</span></div><div><strong>{openedCount}</strong><span>Opened / read</span></div><div><strong>{acceptedCount}</strong><span>Accepted</span></div></section>
      <section className="snt-panel snt-live"><div className="snt-panel-title"><div><span>LIVE RUN · {run.targetName}</span><h2>{currentItem ? currentItem.label : "Notification run"}</h2></div><span className="snt-safety">{currentItem ? formatStatus(currentItem.status) : "Waiting"}</span></div><p>{currentItem?.description}</p>{currentItem?.acceptedAt ? <div className="snt-success-box">✅ This notification has been accepted successfully.</div> : currentItem?.openedAt ? <button type="button" className="snt-accept" onClick={() => void acceptCurrent()} disabled={busy}>✅ ACCEPT NOTIFICATION</button> : <div className="snt-action-stack"><div className="snt-waiting">📱 Waiting for <strong>{run.targetName}</strong> to receive/open the notification.</div><button type="button" className="snt-secondary" onClick={() => void markOpenedManually()} disabled={busy}>👁️ Mark opened / read</button></div>}{countdown > 0 && <div className="snt-countdown">Next notification in <strong>{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</strong></div>}</section>
      <section className="snt-panel"><div className="snt-panel-title"><div><span>SELECTED COVERAGE</span><h2>{run.itemCount} notification test{run.itemCount === 1 ? "" : "s"}</h2></div><span className="snt-safety">{run.targetName}</span></div><div className="snt-list">{run.items.map((item) => <article key={item.id} className={`snt-item ${item.status}`}><div><strong>{item.label}</strong><span>{item.description}</span></div><div><b>{formatStatus(item.status)}</b>{item.failureMessage && <small>{item.failureMessage}</small>}</div></article>)}</div></section>
      {run.status === "running" && lastItemAccepted && <button className="snt-last" type="button" onClick={() => void finish()} disabled={busy}>🏁 LAST ONE — FINISH & TALLY</button>}
      {run.status === "complete" && run.summary && <section className={`snt-result ${run.summary.broken ? "has-failures" : "all-pass"}`}><span>FINAL RESULT</span><h2>{run.summary.broken ? "⚠️ Notification pipeline needs attention" : "✅ Notification pipeline passed"}</h2><div className="snt-result-grid"><div><strong>{run.summary.expected}</strong><span>Expected</span></div><div><strong>{run.summary.sent}</strong><span>FCM accepted</span></div><div><strong>{run.summary.opened}</strong><span>Opened/read</span></div><div><strong>{run.summary.accepted}</strong><span>Accepted</span></div><div><strong>{run.summary.passed}</strong><span>Passed</span></div><div><strong>{run.summary.broken}</strong><span>Broken</span></div></div><p>A pass requires delivery, opened/read evidence and explicit acceptance for every selected notification.</p></section>}
    </>}
    {message && <div className="snt-message">{message}</div>}{error && <div className="snt-error">⚠️ {error}</div>}
  </main>;
}
