import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { hasCreatorTesterClaim } from "../services/creatorTesterAuthService";
import { runTesterSuite, type TesterRun } from "../services/testerBotService";
import { buildBotChecks, buildFullBotChecks, BOT_DEFINITIONS, getBotDefinition, type BotDefinition } from "../services/testerBotRegistry";
import { useAuth } from "../context/useAuth";
import PageBackButton from "../components/PageBackButton";
import "./TesterCentre.css";

function TesterHub({ onSelect }: { onSelect: (id: BotDefinition["id"]) => void }) {
  return <div className="tester-shell">
    <div className="tester-header">
      <p className="eyebrow">🐍 TINY TITANS · PRIVATE QA</p>
      <h1>Bot Testers</h1>
      <p>Select a dedicated test bot. Each bot has a full test and targeted test mode. Automated tests never receive permission to modify real keeper records.</p>
    </div>
    <div className="tester-bot-grid">
      {BOT_DEFINITIONS.map((bot) => <button key={bot.id} type="button" className="tester-bot-tile" onClick={() => onSelect(bot.id)}>
        <span className="tester-bot-icon" aria-hidden="true">{bot.icon}</span>
        <span className="tester-bot-name">{bot.label}</span>
        <span className="tester-bot-description">{bot.description}</span>
        <span className="tester-bot-open">Open tester →</span>
      </button>)}
    </div>
    <div className="tester-safety-panel">
      <strong>🔒 Test safety</strong>
      <span>Bots are read-only against live keeper data. Write-capable workflow testing belongs in an isolated sandbox/test identity; the UI will not pretend that sandbox coverage exists until it is actually wired.</span>
    </div>
  </div>;
}

function BotWorkspace({ bot, uid }: { bot: BotDefinition; uid: string }) {
  const [selectedSuite, setSelectedSuite] = useState(bot.suites[0]?.id ?? "");
  const [running, setRunning] = useState<"full" | string | "">("");
  const [run, setRun] = useState<TesterRun | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedSuite(bot.suites[0]?.id ?? "");
    setRun(null);
    setError("");
  }, [bot]);

  const selected = useMemo(() => bot.suites.find((suite) => suite.id === selectedSuite), [bot, selectedSuite]);

  async function execute(mode: "full" | "specific") {
    setRunning(mode === "full" ? "full" : selectedSuite);
    setError("");
    setRun(null);
    try {
      const checks = mode === "full" ? await buildFullBotChecks(bot, uid) : await buildBotChecks(bot, selectedSuite, uid);
      const suffix = mode === "full" ? "full" : selectedSuite;
      setRun(await runTesterSuite(uid, `${bot.id}:${suffix}`, checks));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "The Tester Bot could not complete this test.");
    } finally {
      setRunning("");
    }
  }

  const passed = run?.results.filter((result) => result.status === "pass").length ?? 0;
  const failed = run?.results.filter((result) => result.status === "fail").length ?? 0;
  const blocked = run?.results.filter((result) => result.status === "blocked").length ?? 0;
  const critical = run?.results.filter((result) => result.status === "fail" && result.severity === "critical").length ?? 0;
  const total = run?.results.length ?? 0;
  const health = !run ? "Not run" : critical > 0 ? "Critical failure" : failed > 0 ? "Failed" : blocked > 0 ? "Blocked / needs sandbox" : "Passed";

  return <div className="tester-shell tester-workspace">
    <PageBackButton fallbackPath="/creator/tester" label="Back to Bot Testers" />
    <div className="tester-workspace-header">
      <div><p className="eyebrow">BOT TESTER</p><h1><span aria-hidden="true">{bot.icon}</span> {bot.label}</h1><p>{bot.purpose}</p></div>
      <div className="tester-safety-chip">🔒 {bot.id === "security" ? "Defensive / sandbox-safe" : "No real record writes"}</div>
    </div>

    <section className="tester-run-controls">
      <div className="tester-full-run">
        <div><span className="tester-control-kicker">COMPLETE TEST</span><h2>Run Full {bot.label}</h2><p>Runs every registered suite for this bot and produces one combined report.</p></div>
        <button className="tester-primary-button" type="button" disabled={Boolean(running)} onClick={() => void execute("full")}>{running === "full" ? "🤖 Running full test…" : "▶ Run Full Test"}</button>
      </div>
      <div className="tester-specific-run">
        <div><span className="tester-control-kicker">TARGETED TEST</span><h2>Run a specific section</h2><p>Choose one related test suite instead of running the entire bot.</p></div>
        <div className="tester-specific-controls"><label htmlFor="tester-suite">Test section</label><select id="tester-suite" value={selectedSuite} onChange={(event) => setSelectedSuite(event.target.value)} disabled={Boolean(running)}>{bot.suites.map((suite) => <option value={suite.id} key={suite.id}>{suite.label}</option>)}</select><p>{selected?.description}</p><button className="tester-secondary-button" type="button" disabled={Boolean(running) || !selectedSuite} onClick={() => void execute("specific")}>{running === selectedSuite ? "🤖 Running…" : "Run Selected Test"}</button></div>
      </div>
    </section>

    <section className="tester-suite-list"><div className="tester-section-heading"><div><span className="tester-control-kicker">AVAILABLE COVERAGE</span><h2>{bot.suites.length} test sections</h2></div><span className="tester-safety-chip">Live checks: read-only</span></div><div className="tester-suite-grid">{bot.suites.map((suite) => <button type="button" key={suite.id} className={`tester-suite-card ${selectedSuite === suite.id ? "is-selected" : ""}`} onClick={() => setSelectedSuite(suite.id)}><strong>{suite.label}</strong><span>{suite.category}</span><p>{suite.description}</p><small>{suite.safety === "sandbox" ? "🧪 Sandbox required for deeper write/attack simulation" : "🔎 Read-only against current data"}</small></button>)}</div></section>

    {error && <section className="tester-result tester-result-error"><strong>Could not complete test</strong><p>{error}</p></section>}

    {run && <section className="tester-result"><div className="tester-result-header"><div><span className="tester-control-kicker">LATEST RESULT</span><h2>{health}</h2><p>{run.suite} · {run.durationMs}ms · {run.completedAt}</p></div><div className="tester-result-score"><strong>{total ? Math.round((passed / total) * 100) : 0}%</strong><span>test pass rate</span></div></div><div className="tester-result-stats"><span>🟢 {passed} passed</span><span>🔴 {failed} failed</span><span>🟠 {blocked} blocked</span><span>🚨 {critical} critical</span></div><div className="tester-result-list">{run.results.map((result) => <article key={result.checkId}><strong>{result.status === "pass" ? "🟢" : result.status === "fail" ? "🔴" : "🟠"} {result.name}</strong><span>{result.message}</span><small>{result.category} · {result.severity} · {result.durationMs}ms · {result.checkId}</small></article>)}</div></section>}
  </div>;
}

export default function TesterCentre() {
  const { botId } = useParams<{ botId?: string }>();
  const { user, profile } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void hasCreatorTesterClaim(false).then((claimAuthorized) => {
      if (active) setAuthorized(claimAuthorized || profile?.role === "admin" || profile?.profileType === "creator");
    }).catch(() => {
      if (active) setAuthorized(profile?.role === "admin" || profile?.profileType === "creator");
    });
    return () => { active = false; };
  }, [user, profile]);

  if (authorized === false || (!user && authorized === null)) return <Navigate to="/" replace />;
  if (!user || authorized === null) return <div className="page-container"><div className="welcome-card"><h1>🤖 Checking Tester authorization…</h1></div></div>;

  const bot = getBotDefinition(botId);
  if (botId && !bot) return <Navigate to="/creator/tester" replace />;

  return bot ? <BotWorkspace bot={bot} uid={user.uid} /> : <div className="page-container"><PageBackButton fallbackPath="/creator" label="Back to Creator Centre" /><TesterHub onSelect={(id) => { window.history.pushState({}, "", `/creator/tester/${id}`); window.dispatchEvent(new PopStateEvent("popstate")); }} /></div>;
}
