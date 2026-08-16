import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasCreatorClaim } from "../services/creatorAuthService";
import { createCoreDiagnosticChecks, runTesterSuite, type TesterRun, type TesterCheck } from "../services/testerBotService";
import { createTrackerRegressionChecks } from "../services/testerSuitesService";
import { createShedPhotoRegressionCheck } from "../services/testerPhotoService";
import { getUserSnakes } from "../services/snakeService";
import { createSecurityBoundaryChecks } from "../services/testerSecurityService";
import { createServerSecurityAttackCheck } from "../services/testerSecurityRunnerService";
import { buildTesterReport } from "../services/testerReportService";

const categoryLabels: Record<string, string> = {
  auth: "Authentication", security: "Security & Authorization", data: "Snake Profiles & Data",
  feeding: "Feeding Tracker", weight: "Weight Tracker", shed: "Shed Tracker & Photos",
  genetics: "Genetics Calculator", privacy: "Privacy & Permissions", analytics: "Creator Analytics", mobile: "Mobile / UI",
};

export default function TesterCentre() {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<TesterRun | null>(null);
  const [specificArea, setSpecificArea] = useState("");
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"user" | "security">("user");

  const categories = useMemo(() => [...new Set(run?.results.map((result) => result.category) ?? [])], [run]);
  const passed = run?.results.filter((result) => result.status === "pass").length ?? 0;
  const failed = run?.results.filter((result) => result.status === "fail").length ?? 0;
  const blocked = run?.results.filter((result) => result.status === "blocked").length ?? 0;

  useEffect(() => {
    let active = true;
    hasCreatorClaim(true)
      .then((value) => { if (active) setAuthorized(value); })
      .catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, []);

  if (authorized === false) return <Navigate to="/" replace />;
  if (!user || authorized === null) {
    return <div className="page-container"><div className="welcome-card"><h1>🤖 Tester Centre</h1><p>Checking Creator authorization...</p></div></div>;
  }

  async function execute(suite: string, checks: TesterCheck[]) {
    setRunning(true); setCopied(false);
    try {
      const result = await runTesterSuite(user.uid, suite, checks);
      setRun(result); setReport(buildTesterReport(result));
    } finally { setRunning(false); }
  }

  async function buildUserChecks() {
    const claims = await hasCreatorClaim(true);
    const core = createCoreDiagnosticChecks({ uid: user.uid, authenticated: true, creatorClaim: claims, analyticsConsent: true }).filter((check) => check.category !== "security");
    const trackerChecks = await createTrackerRegressionChecks(user.uid);
    const snakes = await getUserSnakes(user.uid);
    return [...core, ...trackerChecks, createShedPhotoRegressionCheck(user.uid, snakes[0])];
  }

  async function buildSecurityChecks() {
    const claims = await hasCreatorClaim(true);
    const blockedIds = new Set(["security-firestore-cross-user", "security-storage-cross-user", "security-role-matrix", "security-cross-user-test-identity"]);
    const clientChecks = createSecurityBoundaryChecks(user.uid, claims).filter((check) => !blockedIds.has(check.id));
    return [...clientChecks, createServerSecurityAttackCheck()];
  }

  async function runFull() {
    await execute(mode === "user" ? "full-user-regression" : "full-security-regression", mode === "user" ? await buildUserChecks() : await buildSecurityChecks());
  }

  async function runSpecific() {
    const query = specificArea.trim().toLowerCase();
    if (!query) return;
    const all = mode === "user" ? await buildUserChecks() : await buildSecurityChecks();
    const matches = all.filter((check) => [check.id, check.name, check.category, check.descriptor ?? "", categoryLabels[check.category] ?? ""].join(" ").toLowerCase().includes(query));
    if (!matches.length) {
      matches.push({
        id: "specific-no-match", name: `No ${mode} test matched: ${specificArea}`, category: mode === "security" ? "security" : "data", severity: "high",
        descriptor: `Tester Centre / ${mode} specific test search`,
        run: async () => ({ status: "fail", message: `No registered ${mode} test matches '${specificArea}'.`, details: { expected: "At least one matching test", actual: "No match", fixHint: "Use a registered feature or test-area name." } }),
      });
    }
    await execute(`specific-${mode}:${query}`, matches);
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true); window.setTimeout(() => setCopied(false), 2000);
  }

  return <div className="page-container">
    <div className="welcome-card">
      <p className="eyebrow">🐍 TINY TITANS · CREATOR QA</p>
      <h1>🤖 Tester Centre</h1>
      <p>Choose normal-user regression testing or the separate security attack suite. Security tests never get hidden inside the normal user run.</p>
      <div className="creator-actions">
        <button className={mode === "user" ? "primary-button" : "secondary-button"} type="button" disabled={running} onClick={() => { setMode("user"); setRun(null); setReport(""); }}>👤 User Testing</button>
        <button className={mode === "security" ? "primary-button" : "secondary-button"} type="button" disabled={running} onClick={() => { setMode("security"); setRun(null); setReport(""); }}>🔐 Security Testing</button>
      </div>
      <div className="creator-actions"><button className="primary-button" type="button" disabled={running} onClick={runFull}>{running ? "🤖 Tester Bot running..." : mode === "user" ? "▶ Full User Test" : "🔐 Full Security Test"}</button></div>
      <div className="creator-form-grid">
        <label><span>{mode === "user" ? "Specific user test area" : "Specific security test area"}</span><input value={specificArea} onChange={(event) => setSpecificArea(event.target.value)} placeholder={mode === "user" ? "e.g. Shed, Genetics, Feeding" : "e.g. Claims, Firestore, Storage, Cross-user"} /></label>
        <button className="secondary-button" type="button" disabled={running || !specificArea.trim()} onClick={runSpecific}>🎯 Specific {mode === "user" ? "User" : "Security"} Test</button>
      </div>
      <small>{mode === "user" ? "Tests the app as a normal user would use it." : "Attempts unauthorized operations and verifies Firebase authorization boundaries."}</small>
    </div>
    {run && <><div className="welcome-card"><h2>{run.status === "passed" ? "🟢 Suite Passed" : "🔴 Suite Failed / Blocked"}</h2><p>{passed} passed · {failed} failed · {blocked} blocked</p><p>{categories.map((category) => categoryLabels[category] ?? category).join(" · ")}</p></div><div className="welcome-card"><h2>🔎 Detailed Results</h2><div className="creator-list">{run.results.map((result) => <div className="creator-list-item" key={result.checkId}><strong>{result.status === "pass" ? "🟢" : result.status === "fail" ? "🔴" : "🟠"} {result.name}</strong><span>{result.details?.descriptor ? `Page/feature: ${String(result.details.descriptor)}` : categoryLabels[result.category]}</span><span>{result.message}</span>{result.details?.expected && <span>Expected: {String(result.details.expected)}</span>}{result.details?.actual && <span>Actual: {String(result.details.actual)}</span>}{result.details?.fixHint && <span>🛠️ Fix: {String(result.details.fixHint)}</span>}<small>{result.durationMs}ms · {result.severity}</small></div>)}</div></div><div className="welcome-card"><div className="creator-card-header"><div><h2>📋 Copy-Paste Developer Report</h2><p>Paste this entire report into ChatGPT. It contains test IDs, page/feature descriptors, expected vs actual behaviour and fix direction.</p></div><button className="secondary-button" type="button" onClick={copyReport}>{copied ? "✅ Copied" : "📋 Copy Report"}</button></div><textarea readOnly value={report} rows={24} aria-label="Tester Bot copy-paste report" /></div></>}
  </div>;
}
