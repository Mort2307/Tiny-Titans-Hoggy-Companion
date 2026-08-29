import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { sendNotificationTest, type NotificationTestKind, type NotificationTestResult } from "../services/notificationService";

const TESTS: Array<{ kind: NotificationTestKind; icon: string; label: string; description: string }> = [
  { kind: "feed", icon: "🍽️", label: "Feed reminder", description: "Test the feeding reminder delivery path." },
  { kind: "weight", icon: "⚖️", label: "Weight reminder", description: "Test the scheduled weigh-in delivery path." },
  { kind: "shed", icon: "🐍", label: "Shed reminder", description: "Test the shedding notification channel." },
  { kind: "health", icon: "🩺", label: "Health reminder", description: "Test health / medication reminder delivery." },
];

export default function NotificationTestPanel() {
  const { user } = useAuth();
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<NotificationTestResult | null>(null);

  async function run(kind: NotificationTestKind) {
    if (!user || busy) return;
    setBusy(kind);
    setMessage("");
    setLastResult(null);
    const value = target.trim();
    try {
      const result = await sendNotificationTest({
        kind,
        ...(value ? (value.includes("@") ? { targetEmail: value } : { targetUserId: value }) : {}),
      });
      setLastResult(result);
      if (result.status === "sent") {
        setMessage(`✅ ${result.title} sent to ${result.targetUid === user.uid ? "this account" : result.targetUid}. Firebase accepted ${result.sentCount} device delivery${result.sentCount === 1 ? "" : "ies"}.`);
      } else {
        setMessage("⚠️ The test reached the notification service, but that account has no registered notification device. Enable notifications on the target device first.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send the notification test.");
    } finally {
      setBusy(null);
    }
  }

  async function runFullTest() {
    if (!user || busy) return;
    setBusy("full");
    setMessage("");
    setLastResult(null);
    const value = target.trim();
    try {
      const results: NotificationTestResult[] = [];
      for (const test of TESTS) {
        results.push(await sendNotificationTest({
          kind: test.kind,
          ...(value ? (value.includes("@") ? { targetEmail: value } : { targetUserId: value }) : {}),
        }));
      }
      const sent = results.reduce((total, result) => total + result.sentCount, 0);
      const deliveredTypes = results.filter((result) => result.sentCount > 0).length;
      setLastResult(results[results.length - 1]);
      setMessage(sent > 0 ? `✅ Full notification test complete. ${sent} device delivery${sent === 1 ? "" : "ies"} accepted across ${deliveredTypes}/4 reminder types.` : "⚠️ Full test completed, but no notification devices were registered for the target.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete the full notification test.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="tt-notification-test">
    <div className="tt-notification-test-header">
      <div>
        <p className="tt-notification-test-eyebrow">Delivery diagnostics</p>
        <h3>🧪 Notification Test Centre</h3>
        <p>Send a real FCM notification through the same delivery pipeline used by live Tiny Titans reminders.</p>
      </div>
      <span className="tt-notification-test-badge">LIVE DELIVERY</span>
    </div>

    <div className="tt-notification-target">
      <label htmlFor="notification-test-target">Target account <span>(leave blank for this account)</span></label>
      <input id="notification-test-target" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="User email or Firebase UID" disabled={Boolean(busy)} autoComplete="off" />
      <small>Sending to another account is restricted server-side to authorised Creator / Creator Tester / Admin accounts.</small>
    </div>

    <div className="tt-notification-test-grid">
      {TESTS.map((test) => <button key={test.kind} type="button" className="tt-notification-test-button" onClick={() => void run(test.kind)} disabled={Boolean(busy)}>
        <strong>{busy === test.kind ? "Sending…" : `${test.icon} ${test.label}`}</strong>
        <span>{test.description}</span>
      </button>)}
    </div>

    <button type="button" className="tt-notification-full-test" onClick={() => void runFullTest()} disabled={Boolean(busy)}>{busy === "full" ? "Running full delivery test…" : "🧪 Run Full Notification Test"}</button>

    {message && <div className={`tt-notification-test-result ${message.startsWith("✅") ? "success" : "warning"}`} role={message.startsWith("✅") ? "status" : "alert"}>{message}</div>}
    {lastResult && <div className="tt-notification-test-meta"><span>Status <strong>{lastResult.status}</strong></span><span>Type <strong>{lastResult.kind}</strong></span><span>Accepted <strong>{lastResult.sentCount}</strong></span><span>Invalid <strong>{lastResult.invalidTokenCount}</strong></span></div>}
  </section>;
}
