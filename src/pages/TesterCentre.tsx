import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasCreatorClaim } from "../services/creatorAuthService";
import { createCoreDiagnosticChecks, runTesterSuite, type TesterRun } from "../services/testerBotService";
import { createTrackerRegressionChecks } from "../services/testerSuitesService";

export default function TesterCentre() {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [runningSuite, setRunningSuite] = useState<string>("");
  const [run, setRun] = useState<TesterRun | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    hasCreatorClaim(true).then((value) => { if (active) setAuthorized(value); }).catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, []);

  if (authorized === false) return <Navigate to="/" replace />;
  if (!user || authorized === null) return <div className="page-container"><div className="welcome-card"><h1>🤖 Tester Centre</h1><p>Checking Creator authorization...</p></div></div>;

  async function runSuite(suite: string) {
    setRunningSuite(suite);
    setError("");
    try {
      const checks = suite === "core-diagnostics"
        ? createCoreDiagnosticChecks({ uid: user.uid, authenticated: true, creatorClaim: await hasCreatorClaim(true), analyticsConsent: true })
        : await createTrackerRegressionChecks(user.uid);
      setRun(await runTesterSuite(user.uid, suite, checks));
    } catch (suiteError) {
      setError(suiteError instanceof Error ? suiteError.message : "Tester Bot could not complete the suite.");
    } finally {
      setRunningSuite("");
    }
  }

  const passed = run?.results.filter((result) => result.status === "pass").length ?? 0;
  const failed = run?.results.filter((result) => result.status === "fail").length ?? 0;
  const blocked = run?.results.filter((result) => result.status === "blocked").length ?? 0;

  return (
    <div className="page-container">
      <div className="welcome-card">
        <p className="eyebrow">🐍 TINY TITANS</p>
        <h1>🤖 Tester Centre</h1>
        <p>Automated diagnostics and read-only regression testing against the live Firebase data model.</p>
        <div className="creator-actions">
          <button className="primary-button" type="button" disabled={Boolean(runningSuite)} onClick={() => void runSuite("core-diagnostics")}>
            {runningSuite === "core-diagnostics" ? "🤖 Running core diagnostics…" : "▶ Run Core Diagnostics"}
          </button>
          <button className="primary-button" type="button" disabled={Boolean(runningSuite)} onClick={() => void runSuite("tracker-regression")}>
            {runningSuite === "tracker-regression" ? "🤖 Running tracker regression…" : "🧪 Run Tracker Regression"}
          </button>
        </div>
        {error && <div className="creator-error">{error}</div>}
      </div>

      {run && (
        <div className="welcome-card">
          <h2>{run.status === "passed" ? "🟢 Suite Passed" : "🔴 Suite Failed"}</h2>
          <p>{passed} passed · {failed} failed · {blocked} blocked</p>
          <p className="creator-muted">{run.suite === "tracker-regression" ? "Tracker Regression" : "Core Diagnostics"} · {run.ownerUid}</p>
          <div className="creator-list">
            {run.results.map((result) => (
              <div className="creator-list-item" key={result.checkId}>
                <strong>{result.status === "pass" ? "🟢" : result.status === "fail" ? "🔴" : "🟠"} {result.name}</strong>
                <span>{result.message}</span>
                <small>{result.durationMs}ms · {result.severity} · {result.category}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
