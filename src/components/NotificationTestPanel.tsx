import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { enableNotifications, getNotificationPermissionState, sendNotificationTest, type NotificationTestKind, type NotificationTestResult } from "../services/notificationService";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const TESTS: Array<{ kind: NotificationTestKind; icon: string; label: string; description: string }> = [
  { kind: "feed", icon: "🍽️", label: "Feed reminder", description: "Test the feeding reminder delivery path." },
  { kind: "weight", icon: "⚖️", label: "Weight reminder", description: "Test the scheduled weigh-in delivery path." },
  { kind: "shed", icon: "🐍", label: "Shed reminder", description: "Test the shedding notification channel." },
  { kind: "health", icon: "🩺", label: "Health reminder", description: "Test health / medication reminder delivery." },
];

type NotificationTargetUser = { uid: string; email: string; displayName: string };
type NotificationTargetResponse = { users: NotificationTargetUser[]; count: number };

export default function NotificationTestPanel() {
  const { user } = useAuth();
  const [targetUid, setTargetUid] = useState("");
  const [users, setUsers] = useState<NotificationTargetUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<NotificationTestResult | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingUsers(true);
    const functions = getFunctions(app, "europe-west2");
    const callable = httpsCallable<void, NotificationTargetResponse>(functions, "getNotificationTestUsers");
    callable()
      .then((response) => { if (active) setUsers(response.data.users || []); })
      .catch((error) => { console.warn("Tiny Titans notification test targets could not be loaded", error); if (active) setUsers([]); })
      .finally(() => { if (active) setLoadingUsers(false); });
    return () => { active = false; };
  }, [user]);

  const selectedTarget = users.find((item) => item.uid === targetUid);

  async function ensureSelfDeviceRegistered() {
    if (!user || targetUid) return;
    if (getNotificationPermissionState() !== "granted") {
      const permission = await enableNotifications(user.uid);
      if (permission !== "granted") throw new Error("Tiny Titans notifications are not enabled for this browser.");
      return;
    }
    const registered = await enableNotifications(user.uid);
    if (!registered) throw new Error("Tiny Titans could not register this browser for push notifications. Reload the app and try Enable notifications again.");
  }

  async function run(kind: NotificationTestKind) {
    if (!user || busy) return;
    setBusy(kind); setMessage(""); setLastResult(null);
    try {
      await ensureSelfDeviceRegistered();
      const result = await sendNotificationTest({ kind, ...(targetUid ? { targetUserId: targetUid } : {}) });
      setLastResult(result);
      if (result.status === "sent") setMessage(`✅ ${result.title} sent to ${selectedTarget?.email || (result.targetUid === user.uid ? "this account" : result.targetUid)}. Firebase accepted ${result.sentCount} device delivery${result.sentCount === 1 ? "" : "ies"}.`);
      else setMessage("⚠️ The test reached Firebase, but the target account has no registered notification device. Enable notifications on that device, then retry.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send the notification test.");
    } finally { setBusy(null); }
  }

  async function runFullTest() {
    if (!user || busy) return;
    setBusy("full"); setMessage(""); setLastResult(null);
    try {
      await ensureSelfDeviceRegistered();
      const results: NotificationTestResult[] = [];
      for (const test of TESTS) results.push(await sendNotificationTest({ kind: test.kind, ...(targetUid ? { targetUserId: targetUid } : {}) }));
      const sent = results.reduce((total, result) => total + result.sentCount, 0);
      const deliveredTypes = results.filter((result) => result.sentCount > 0).length;
      setLastResult(results[results.length - 1]);
      setMessage(sent > 0 ? `✅ Full notification test complete. ${sent} device delivery${sent === 1 ? "" : "ies"} accepted across ${deliveredTypes}/4 reminder types.` : "⚠️ Full test completed, but no notification devices were registered for the selected target.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to complete the full notification test."); }
    finally { setBusy(null); }
  }

  const permission = getNotificationPermissionState();

  return <section className="tt-notification-test">
    <div className="tt-notification-test-header"><div><p className="tt-notification-test-eyebrow">Delivery diagnostics</p><h3>🧪 Notification Test Centre</h3><p>Send a real FCM notification through the same delivery pipeline used by live Tiny Titans reminders.</p></div><span className="tt-notification-test-badge">LIVE DELIVERY</span></div>
    <div className="tt-notification-target"><label htmlFor="notification-test-target">Target account</label><select id="notification-test-target" value={targetUid} onChange={(event) => setTargetUid(event.target.value)} disabled={Boolean(busy) || loadingUsers} autoComplete="off"><option value="">This account — {user?.email || "signed-in user"}</option>{users.filter((item) => item.uid !== user?.uid).map((item) => <option key={item.uid} value={item.uid}>{item.displayName} — {item.email}</option>)}</select><small>{loadingUsers ? "Loading registered Tiny Titans users…" : users.length ? `${users.length} registered account${users.length === 1 ? "" : "s"} available to authorised test users.` : "Other accounts appear here for authorised Creator / Creator Tester / Admin users."}</small></div>
    <div className="tt-notification-device"><span>Browser notification permission</span><strong>{permission.toUpperCase()}</strong>{permission !== "granted" && !targetUid && <small>Sending a self-test will request permission and register this device automatically.</small>}{permission === "granted" && !targetUid && <small>Self-tests refresh this browser's FCM registration before sending.</small>}</div>
    <div className="tt-notification-test-grid">{TESTS.map((test) => <button key={test.kind} type="button" className="tt-notification-test-button" onClick={(event) => { event.preventDefault(); void run(test.kind); }} disabled={Boolean(busy)}><strong>{busy === test.kind ? "Sending…" : `${test.icon} ${test.label}`}</strong><span>{test.description}</span></button>)}</div>
    <button type="button" className="tt-notification-full-test" onClick={(event) => { event.preventDefault(); void runFullTest(); }} disabled={Boolean(busy)}>{busy === "full" ? "Running full delivery test…" : "🧪 Run Full Notification Test"}</button>
    {message && <div className={`tt-notification-test-result ${message.startsWith("✅") ? "success" : "warning"}`} role={message.startsWith("✅") ? "status" : "alert"}>{message}</div>}
    {lastResult && <div className="tt-notification-test-meta"><span>Status <strong>{lastResult.status}</strong></span><span>Type <strong>{lastResult.kind}</strong></span><span>Accepted <strong>{lastResult.sentCount}</strong></span><span>Invalid <strong>{lastResult.invalidTokenCount}</strong></span></div>}
  </section>;
}
