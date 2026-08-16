import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { hasCreatorClaim } from "../services/creatorAuthService";
import { getGlobalStats, type GlobalStats } from "../services/creatorService";
import { createCoreDiagnosticChecks, runTesterSuite, type TesterRun } from "../services/testerBotService";
import { createTrackerRegressionChecks } from "../services/testerSuitesService";
import { useAuth } from "../context/AuthContext";

const EMPTY_STATS: GlobalStats = {
  registeredUsers: 0,
  activeUsers: 0,
  snakeProfiles: 0,
  mealsFed: 0,
  weightLogs: 0,
  totalWeightKg: 0,
  totalWeightLb: 0,
  shedsLogged: 0,
  totalShedLengthCm: 0,
  totalShedLengthIn: 0,
  geneticsCalculations: 0,
};

const number = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits }).format(value);

export default function TesterCentre() {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [runningSuite, setRunningSuite] = useState("");
  const [run, setRun] = useState<TesterRun | null>(null);
  const [stats, setStats] = useState<GlobalStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    hasCreatorClaim(true)
      .then((value) => {
        if (active) setAuthorized(value);
      })
      .catch(() => {
        if (active) setAuthorized(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    setStatsLoading(true);
    void getGlobalStats()
      .then((loaded) => {
        if (active) setStats(loaded);
      })
      .catch((statsError) => {
        if (active) setError(statsError instanceof Error ? statsError.message : "Global tracker statistics could not be loaded.");
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authorized, run]);

  if (authorized === false) return <Navigate to="/" replace />;
  if (!user || authorized === null) {
    return (
      <div className="page-container">
        <div className="welcome-card">
          <h1>🤖 Tester Centre</h1>
          <p>Checking Creator authorization...</p>
        </div>
      </div>
    );
  }

  async function runSuite(suite: string) {
    setRunningSuite(suite);
    setError("");
    try {
      const checks = suite === "core-diagnostics"
        ? createCoreDiagnosticChecks({
            uid: user.uid,
            authenticated: true,
            creatorClaim: await hasCreatorClaim(true),
          })
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
  const criticalFailures = run?.results.filter((result) => result.status === "fail" && result.severity === "critical").length ?? 0;

  const health = criticalFailures > 0 || failed > 0 ? "🔴 Critical / Failed" : blocked > 0 ? "🟠 Warnings / Blocked" : "🟢 Healthy";

  return (
    <div className="page-container">
      <div className="welcome-card">
        <p className="eyebrow">🐍 TINY TITANS · PRIVATE QA</p>
        <h1>🤖 Tester Centre</h1>
        <p>Creator-only automated diagnostics and read-only regression testing against the live Firebase data model.</p>

        <div className="creator-global-grid">
          <div className="creator-global-card"><span>🩺</span><strong>{health}</strong><label>System Health</label></div>
          <div className="creator-global-card"><span>👥</span><strong>{statsLoading ? "…" : number(stats.registeredUsers)}</strong><label>Registered Users</label></div>
          <div className="creator-global-card"><span>🍽️</span><strong>{statsLoading ? "…" : number(stats.mealsFed)}</strong><label>Meals Fed</label></div>
          <div className="creator-global-card"><span>🐍</span><strong>{statsLoading ? "…" : number(stats.shedsLogged)}</strong><label>Sheds Logged</label></div>
          <div className="creator-global-card"><span>📏</span><strong>{statsLoading ? "…" : `${number(stats.totalShedLengthCm / 100, 2)} m`}</strong><label>Total Shed Length</label></div>
          <div className="creator-global-card"><span>🧬</span><strong>{statsLoading ? "…" : number(stats.geneticsCalculations)}</strong><label>Genetics Calculations</label></div>
        </div>

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
          <h2>{run.status === "passed" ? "🟢 Suite Passed" : run.status === "blocked" ? "🟠 Suite Blocked" : "🔴 Suite Failed"}</h2>
          <p>{passed} passed · {failed} failed · {blocked} blocked · {criticalFailures} critical failures</p>
          <p className="creator-muted">{run.suite === "tracker-regression" ? "Tracker Regression" : "Core Diagnostics"} · {run.ownerUid} · {run.durationMs}ms</p>
          <div className="creator-list">
            {run.results.map((result) => (
              <div className="creator-list-item" key={result.checkId}>
                <strong>{result.status === "pass" ? "🟢" : result.status === "fail" ? "🔴" : "🟠"} {result.name}</strong>
                <span>{result.message}</span>
                <small>{result.durationMs}ms · {result.severity} · {result.category} · {result.checkId}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
