import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasCreatorClaim } from "../services/creatorAuthService";
import { createCoreDiagnosticChecks, runTesterSuite, type TesterRun } from "../services/testerBotService";

export default function TesterCentre() {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<TesterRun | null>(null);

  useEffect(() => {
    let active = true;
    hasCreatorClaim(true).then((value) => { if (active) setAuthorized(value); }).catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, []);

  if (authorized === false) return <Navigate to="/" replace />;
  if (!user || authorized === null) return <div className="page-container"><div className="welcome-card"><h1>🤖 Tester Centre</h1><p>Checking Creator authorization...</p></div></div>;

  async function runCoreDiagnostics() {
    setRunning(true);
    try {
      const claims = await hasCreatorClaim(true);
      const checks = createCoreDiagnosticChecks({ uid: user.uid, authenticated: true, creatorClaim: claims, analyticsConsent: true });
      setRun(await runTesterSuite(user.uid, "core-diagnostics", checks));
    } finally {
      setRunning(false);
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
        <p>Automated diagnostics and regression testing for the Creator Hub.</p>
        <button className="primary-button" type="button" disabled={running} onClick={runCoreDiagnostics}>
          {running ? "🤖 Tester Bot running..." : "▶ Run Core Diagnostics"}
        </button>
      </div>

      {run && (
        <div className="welcome-card">
          <h2>{run.status === "passed" ? "🟢 Suite Passed" : "🔴 Suite Failed"}</h2>
          <p>{passed} passed · {failed} failed · {blocked} blocked</p>
          <div className="creator-list">
            {run.results.map((result) => (
              <div className="creator-list-item" key={result.checkId}>
                <strong>{result.status === "pass" ? "🟢" : result.status === "fail" ? "🔴" : "🟠"} {result.name}</strong>
                <span>{result.message}</span>
                <small>{result.durationMs}ms · {result.severity}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
