import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { enableNotifications, getNotificationPermissionState, getNotificationTestTargets, sendNotificationTestBatch, type NotificationTestBatchResult, type NotificationTestKind, type NotificationTestTarget } from "../services/notificationService";
import "./NotificationTestPanel.css";

const TESTS: Array<{ kind: NotificationTestKind; icon: string; label: string; description: string }> = [
  { kind: "feed", icon: "🍽️", label: "Feed", description: "Feeding reminder route." },
  { kind: "weight", icon: "⚖️", label: "Weight", description: "Scheduled weigh-in route." },
  { kind: "shed", icon: "🐍", label: "Shed", description: "Shedding reminder route." },
  { kind: "health", icon: "🩺", label: "Health", description: "Health / medication route." },
  { kind: "general", icon: "🔔", label: "General", description: "General notification route." },
];

const MAX_COUNT_PER_ROUTE = 20;

export default function NotificationTestPanel() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<NotificationTestTarget[]>([]);
  const [selectedTargetUids, setSelectedTargetUids] = useState<string[]>(user ? [user.uid] : []);
  const [selectedKinds, setSelectedKinds] = useState<NotificationTestKind[]>(["feed"]);
  const [count, setCount] = useState(1);
  const [search, setSearch] = useState("");
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<NotificationTestBatchResult | null>(null);

  useEffect(() => {
    if (!user) return;
    setSelectedTargetUids((current) => current.length ? current : [user.uid]);
    let active = true;
    setLoadingTargets(true);
    void getNotificationTestTargets()
      .then((items) => { if (active) setTargets(items); })
      .catch((error) => { console.warn("Tiny Titans notification test targets could not be loaded", error); if (active) setTargets([]); })
      .finally(() => { if (active) setLoadingTargets(false); });
    return () => { active = false; };
  }, [user]);

  const selectedTargetCount = selectedTargetUids.length;
  const eventCount = selectedKinds.length * count * selectedTargetCount;
  const permission = getNotificationPermissionState();
  const currentTarget: NotificationTestTarget | null = user ? {
    uid: user.uid,
    email: user.email || "",
    displayName: "This account",
    notificationSettingsEnabled: true,
    deviceReady: false,
    tokenCount: 0,
    lastTokenUpdatedAt: null,
  } : null;
  const directory = useMemo(() => {
    const combined = currentTarget && !targets.some((target) => target.uid === currentTarget.uid) ? [currentTarget, ...targets] : targets;
    const term = search.trim().toLowerCase();
    return combined.filter((target) => !term || `${target.displayName} ${target.email}`.toLowerCase().includes(term));
  }, [currentTarget, targets, search]);

  function toggleKind(kind: NotificationTestKind) {
    setSelectedKinds((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]);
  }

  function selectAllKinds() {
    setSelectedKinds(TESTS.map((item) => item.kind));
  }

  function toggleTarget(uid: string) {
    setSelectedTargetUids((current) => current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]);
  }

  async function ensureSelfDeviceRegistered() {
    if (!user || !selectedTargetUids.includes(user.uid)) return;
    if (getNotificationPermissionState() !== "granted") {
      const permissionResult = await enableNotifications(user.uid);
      if (permissionResult !== "granted") throw new Error("Tiny Titans notifications are not enabled for this browser.");
      return;
    }
    const registered = await enableNotifications(user.uid);
    if (!registered) throw new Error("Tiny Titans could not register this browser for push notifications. Reload the app and use Repair connection in Notifications settings.");
  }

  async function runBatch() {
    if (!user || busy || selectedKinds.length === 0 || selectedTargetUids.length === 0) return;
    setBusy(true);
    setMessage("");
    setLastResult(null);
    try {
      await ensureSelfDeviceRegistered();
      const result = await sendNotificationTestBatch({ kinds: selectedKinds, count, targetUserIds: selectedTargetUids });
      setLastResult(result);
      if (result.status === "sent") {
        setMessage(`✅ Test complete — Firebase accepted ${result.sentCount} device delivery${result.sentCount === 1 ? "" : "ies"} across ${result.routeCount} route${result.routeCount === 1 ? "" : "s"}, ${result.targetCount} target${result.targetCount === 1 ? "" : "s"}, repeated ${result.repetitionCount} time${result.repetitionCount === 1 ? "" : "s"}.`);
      } else if (result.status === "partial") {
        setMessage(`⚠️ Partial result — ${result.sentCount} delivery${result.sentCount === 1 ? "" : "ies"} accepted; ${result.noDeliveryCount} had no registered device and ${result.failedCount} failed.`);
      } else {
        setMessage(`⚠️ No notification was delivered. ${result.noDeliveryCount} test event${result.noDeliveryCount === 1 ? "" : "s"} had no registered device; ${result.failedCount} failed.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to run the notification test.");
    } finally {
      setBusy(false);
    }
  }

  const selectedDirectoryUsers = directory.filter((target) => selectedTargetUids.includes(target.uid));

  return <section className="tt-notification-test">
    <div className="tt-notification-test-header">
      <div><p className="tt-notification-test-eyebrow">Delivery diagnostics</p><h3>🧪 Notification Test Centre</h3><p>Exercise the real FCM delivery pipeline without touching the live reminder scheduler.</p></div>
      <span className="tt-notification-test-badge">OWNER TEST MODE</span>
    </div>

    <div className="tt-test-card">
      <div className="tt-test-card-heading"><div><span>1 · NOTIFICATION ROUTES</span><h4>Choose exactly what you want to hit</h4></div><button type="button" onClick={selectAllKinds} disabled={busy}>Full system</button></div>
      <div className="tt-route-grid">{TESTS.map((test) => <label key={test.kind} className={`tt-route-option ${selectedKinds.includes(test.kind) ? "is-selected" : ""}`}><input type="checkbox" checked={selectedKinds.includes(test.kind)} onChange={() => toggleKind(test.kind)} disabled={busy}/><span className="tt-route-icon">{test.icon}</span><span><strong>{test.label}</strong><small>{test.description}</small></span></label>)}</div>
      <p className="tt-test-help">Full system selects every registered notification route. You can also select one route to isolate a bug.</p>
    </div>

    <div className="tt-test-card">
      <div className="tt-test-card-heading"><div><span>2 · REPETITION</span><h4>How many times per selected route?</h4></div><span className="tt-event-count">{eventCount || 0} total events</span></div>
      <div className="tt-repeat-row"><input type="range" min={1} max={MAX_COUNT_PER_ROUTE} step={1} value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={busy}/><output>{count}</output><label>notification{count === 1 ? "" : "s"} per route / target</label></div>
      <small className="tt-test-help">The server enforces a maximum of {MAX_COUNT_PER_ROUTE} repeats per route and a maximum of 100 total test events in one run.</small>
    </div>

    <div className="tt-test-card">
      <div className="tt-test-card-heading"><div><span>3 · TARGET USERS</span><h4>Choose who receives the test</h4></div><span>{selectedTargetCount} selected</span></div>
      <input className="tt-target-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" disabled={busy}/>
      <div className="tt-target-list">{loadingTargets ? <div className="tt-target-empty">Loading authorised test targets…</div> : directory.length ? directory.map((target) => { const selected = selectedTargetUids.includes(target.uid); return <label key={target.uid} className={`tt-target-row ${selected ? "is-selected" : ""}`}><input type="checkbox" checked={selected} onChange={() => toggleTarget(target.uid)} disabled={busy}/><span className="tt-target-main"><strong>{target.uid === user?.uid ? "This account" : target.displayName}</strong><small>{target.email}</small></span><span className={`tt-device-state ${target.deviceReady ? "ready" : "not-ready"}`}>{target.deviceReady ? `📱 Ready · ${target.tokenCount}` : "⚠️ No device"}</span></label>; }) : <div className="tt-target-empty">No matching users.</div>}</div>
      {selectedDirectoryUsers.length > 0 && <div className="tt-selected-summary"><strong>Selected:</strong> {selectedDirectoryUsers.map((target) => target.uid === user?.uid ? "this account" : target.displayName).join(", ")}</div>}
      <p className="tt-test-help">Targeting is server-side and test-only. A normal user does not gain access to this panel or its callable functions merely because they are selected here.</p>
    </div>

    <div className="tt-test-card tt-test-action">
      <div><span>4 · DELIVERY</span><h4>Send the test now</h4><p>{permission === "granted" ? "Your own device will be refreshed before a self-test; other selected users are checked for a registered FCM device." : "A self-test will request browser notification permission and register this device first."}</p></div>
      <button type="button" onClick={() => void runBatch()} disabled={busy || !selectedKinds.length || !selectedTargetUids.length}>{busy ? "Sending test notifications…" : `🚀 Send ${eventCount || 0} test event${eventCount === 1 ? "" : "s"}`}</button>
    </div>

    {message && <div className={`tt-notification-test-result ${message.startsWith("✅") ? "success" : "warning"}`} role={message.startsWith("✅") ? "status" : "alert"}>{message}</div>}
    {lastResult && <div className="tt-notification-test-meta"><span>Status <strong>{lastResult.status}</strong></span><span>Events <strong>{lastResult.attemptedEvents}/{lastResult.requestedEvents}</strong></span><span>Accepted <strong>{lastResult.sentCount}</strong></span><span>No device <strong>{lastResult.noDeliveryCount}</strong></span><span>Failed <strong>{lastResult.failedCount}</strong></span><span>Invalid <strong>{lastResult.invalidTokenCount}</strong></span></div>}
    {lastResult?.results?.length ? <details className="tt-test-details"><summary>Show individual notification results</summary><div>{lastResult.results.map((result) => <article key={result.eventKey}><strong>{result.kind}</strong><span>{result.targetName}</span><small>repeat {result.repetition} · {result.status} · accepted {result.sentCount}</small></article>)}</div></details> : null}
  </section>;
}
