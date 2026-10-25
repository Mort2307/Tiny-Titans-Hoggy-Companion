import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { hasCreatorTesterClaim } from "../services/creatorTesterAuthService";
import { useAuth } from "../context/useAuth";
import PageBackButton from "../components/PageBackButton";
import NotificationTestPanel from "../components/NotificationTestPanel";
import CreatorPaidTierTester from "../components/CreatorPaidTierTester";
import TinyTitansIcon from "../components/TinyTitansIcon";
import "./TesterCentre.css";
import "../styles/notificationTest.css";

/** Human-led acceptance checks. Results are keeper observations, not synthetic bot assertions. */
const humanChecks = [
  { id: "species", title: "Species catalogue", route: "/species", expectation: "Find the correct animal and check evidence, husbandry and images without invented claims." },
  { id: "calculator", title: "Genetics calculator", route: "/calculator", expectation: "Select two parents, inspect outcome names and probabilities, and expand any relevant carrier details." },
  { id: "breeding", title: "Breeding workspace", route: "/breeding", expectation: "Create a project, record an observation, reopen it and verify that saved details remain accurate." },
  { id: "morph", title: "Morph and variation library", route: "/morph-library", expectation: "Check documented variation names, image provenance, user submissions and uncertainty labels." },
  { id: "rooms", title: "3D animal rooms", route: "/reptile-room", expectation: "Inspect mobile navigation, enclosure placement and animal profile access." },
  { id: "reports", title: "Feedback reporting", route: "/report-bug", expectation: "Report a real issue with the screen, expected behaviour, actual result and optional media." },
];

function HumanTesterHub({ uid }: { uid: string }) {
  const storageKey = `tiny-titans-human-review:${uid}`;
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string" && humanChecks.some((check) => check.id === id)) : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(checked)); } catch { /* Local persistence is optional. */ }
  }, [checked, storageKey]);
  const [showNotificationLab, setShowNotificationLab] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const completed = checked.length;

  async function copySessionSummary() {
    const lines = [
      "TINY TITANS · HUMAN TESTER SESSION",
      `Recorded: ${new Date().toISOString()}`,
      `Manually checked: ${completed}/${humanChecks.length}`,
      "These are tester-marked review items, not independently verified automated test results.",
      ...humanChecks.map((item) => `${checked.includes(item.id) ? "[Reviewed]" : "[Not reviewed]"} ${item.title}: ${item.expectation}`),
      "Please report actual defects through Tiny Titans' in-app issue report form.",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyMessage("Review notes copied. These checkmarks are not a release sign-off.");
    } catch {
      setCopyMessage("Clipboard unavailable. Use in-app issue reporting for your observations.");
    }
  }

  return <div className="tester-shell">
    <div className="tester-header">
      <p className="eyebrow"><TinyTitansIcon name="testing" size={14} /> TINY TITANS · HUMAN QA</p>
      <h1>Tester Centre</h1>
      <p>Test Tiny Titans directly in the app, then send genuine feedback or bug reports. No simulated bot runs or synthetic pass percentages.</p>
    </div>
    <div className="tester-manual-actions">
      <Link to="/report-bug" className="tester-primary-button">Report a bug</Link>
      <Link to="/feedback" className="tester-secondary-button">Send feedback</Link>
      <Link to="/my-issue-reports" className="tester-secondary-button">My issue reports</Link>
      <Link to="/creator/tester/paid-tiers" className="tester-secondary-button">Paid-tier tester access</Link>
    </div>
    <section className="tester-manual-panel" aria-label="Manual tester checklist">
      <div className="tester-manual-title">
        <div><h2>Hands-on test checklist</h2><p>Mark a section reviewed only after checking it in the app. Your selections stay on this device for the current browser session and are not treated as automated evidence.</p></div>
        <strong>{completed} / {humanChecks.length} reviewed</strong>
      </div>
      <div className="tester-manual-list">
        {humanChecks.map((item) => <article className="tester-manual-item" key={item.id}>
          <div><h3>{item.title}</h3><p>{item.expectation}</p></div>
          <div className="tester-manual-controls">
            <Link to={item.route}>Open feature</Link>
            <label><input type="checkbox" checked={checked.includes(item.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id))} /> Reviewed</label>
          </div>
        </article>)}
      </div>
      <button className="tester-secondary-button" type="button" onClick={() => void copySessionSummary()}>Copy review notes</button>
      {copyMessage && <p role="status">{copyMessage}</p>}
    </section>
    <section className="tester-manual-panel">
      <h2>Notification testing</h2>
      <p>Use an authorised test account or your own device to verify real notification delivery.</p>
      <button className="tester-secondary-button" type="button" aria-expanded={showNotificationLab} onClick={() => setShowNotificationLab((current) => !current)}>{showNotificationLab ? "Close notification tools" : "Open notification tools"}</button>
      {showNotificationLab && <div className="tt-notification-settings tester-notification-lab"><NotificationTestPanel /></div>}
    </section>
    <p className="tester-human-note">Existing tester invitations, feedback forms and paid-tier testing remain available. Routine builds, genetics validation and Firestore security checks remain separate from human testing.</p>
  </div>;
}

export default function TesterCentre() {
  const location = useLocation();
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) { setAuthorized(false); return; }
    let active = true;
    void hasCreatorTesterClaim(false).then((allowed) => {
      if (active) setAuthorized(allowed);
    }).catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, [user]);
  if (authorized === false) return <Navigate to="/" replace />;
  if (!user || authorized === null) return <div className="page-container"><p>Checking tester access…</p></div>;
  if (location.pathname === "/creator/tester/paid-tiers") return <CreatorPaidTierTester />;
  if (location.pathname !== "/creator/tester") return <Navigate to="/creator/tester" replace />;
  return <div className="page-container">
    <PageBackButton fallbackPath="/creator" label="Back to Creator Centre" />
    <HumanTesterHub uid={user.uid} />
  </div>;
}
