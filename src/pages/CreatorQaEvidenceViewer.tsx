import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getQaEvidenceBlobUrl, getQaRunHistory, getQaRunReport, type CreatorQaRun, type QaReport, type QaVisualResult } from "../services/creatorQaEvidenceService";
import { triggerCreatorVisualQa } from "../services/creatorOperationsService";
import "./CreatorQaEvidenceViewer.css";

function findingCounts(result: QaVisualResult) {
  const findings = result.findings || [];
  return {
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
  };
}

function runStatusClass(status?: string) {
  const value = String(status || "unknown").toLowerCase();
  return `qa-evidence-status qa-evidence-status-${value}`;
}

export default function CreatorQaEvidenceViewer() {
  const [runs, setRuns] = useState<CreatorQaRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [report, setReport] = useState<QaReport | null>(null);
  const [selectedViewport, setSelectedViewport] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("/");
  const [viewportUrl, setViewportUrl] = useState("");
  const [fullPageUrl, setFullPageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState("");
  const [triggerActionsUrl, setTriggerActionsUrl] = useState("");
  const [error, setError] = useState("");
  const blobUrlsRef = useRef({ viewport: "", fullPage: "" });

  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) || runs[0], [runs, selectedRunId]);

  const clearBlobEvidence = () => {
    for (const key of ["viewport", "fullPage"] as const) {
      const url = blobUrlsRef.current[key];
      if (url) URL.revokeObjectURL(url);
      blobUrlsRef.current[key] = "";
    }
    setViewportUrl("");
    setFullPageUrl("");
  };

  const loadHistory = async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const nextRuns = await getQaRunHistory();
      setRuns(nextRuns);
      setSelectedRunId((current) => current && nextRuns.some((run) => run.id === current) ? current : nextRuns[0]?.id || "");
      return nextRuns;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "QA history is unavailable.");
      return [];
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void loadHistory(true).then(() => { if (!active) return; });
    return () => { active = false; };
  }, []);

  async function runVisualQa() {
    if (triggering) return;
    setTriggering(true);
    setTriggerMessage("");
    setTriggerActionsUrl("");
    setError("");
    try {
      const result = await triggerCreatorVisualQa("", "Visual QA run triggered from Creator Centre");
      setTriggerActionsUrl(result.actionsUrl);
      setTriggerMessage("Visual QA run queued. The evidence will appear here when the BOT finishes publishing.");
    } catch (triggerError) {
      setError(triggerError instanceof Error ? triggerError.message : "The visual QA run could not be started.");
    } finally {
      setTriggering(false);
    }
  }

  useEffect(() => {
    clearBlobEvidence();
    if (!selectedRun) {
      setReport(null);
      return undefined;
    }
    let active = true;
    setEvidenceLoading(true);
    setError("");
    setReport(null);
    void getQaRunReport(selectedRun)
      .then((nextReport) => {
        if (!active) return;
        setReport(nextReport);
        setSelectedViewport(nextReport.viewports[0]?.name || "");
        setSelectedRoute(nextReport.routes[0] || "/");
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Visual evidence is unavailable for this run.");
      })
      .finally(() => {
        if (active) setEvidenceLoading(false);
      });
    return () => {
      active = false;
      clearBlobEvidence();
    };
  }, [selectedRun]);

  const result = useMemo(() => report?.results.find((item) => item.route === selectedRoute && item.viewport.name === selectedViewport) || null, [report, selectedRoute, selectedViewport]);

  useEffect(() => {
    clearBlobEvidence();
    if (!selectedRun || !result) return undefined;
    let active = true;
    setEvidenceLoading(true);
    void Promise.all([
      result.viewportScreenshot ? getQaEvidenceBlobUrl(selectedRun, result.viewportScreenshot) : Promise.resolve(""),
      result.fullPageScreenshot ? getQaEvidenceBlobUrl(selectedRun, result.fullPageScreenshot) : Promise.resolve(""),
    ])
      .then(([nextViewportUrl, nextFullPageUrl]) => {
        if (!active) {
          if (nextViewportUrl) URL.revokeObjectURL(nextViewportUrl);
          if (nextFullPageUrl) URL.revokeObjectURL(nextFullPageUrl);
          return;
        }
        blobUrlsRef.current = { viewport: nextViewportUrl, fullPage: nextFullPageUrl };
        setViewportUrl(nextViewportUrl);
        setFullPageUrl(nextFullPageUrl);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "The selected screenshots could not be loaded.");
      })
      .finally(() => {
        if (active) setEvidenceLoading(false);
      });
    return () => {
      active = false;
      clearBlobEvidence();
    };
  }, [selectedRun, result]);

  useEffect(() => () => clearBlobEvidence(), []);

  useEffect(() => {
    if (!triggerMessage || !triggerActionsUrl) return undefined;
    const interval = window.setInterval(() => { void loadHistory(false); }, 7000);
    return () => window.clearInterval(interval);
  }, [triggerMessage, triggerActionsUrl]);

  const metrics = result?.metrics || {};
  const historicalErrors = runs.reduce((sum, run) => sum + Number(run.errors || 0), 0);
  const reportErrors = report?.results.reduce((sum, item) => sum + findingCounts(item).errors, 0) || 0;
  const reportWarnings = report?.results.reduce((sum, item) => sum + findingCounts(item).warnings, 0) || 0;
  const currentRunRouteCount = report?.routes.length || selectedRun?.routes || 0;
  const currentRunScreenshotCount = report?.screenshotCount || selectedRun?.screenshots || 0;

  return (
    <main className="creator-section-page creator-qa-evidence-page">
      <header className="creator-section-header">
        <div>
          <span>QA STATUS DASHBOARD</span>
          <h1>🤖 Release &amp; visual QA</h1>
          <p>The Playwright BOT stays independent from production. This workspace shows the rendered evidence it publishes, plus the machine findings used to guide the next change.</p>
        </div>
        <div className="creator-qa-header-actions">
          <button type="button" className="creator-ops-primary" onClick={() => void runVisualQa()} disabled={triggering}>{triggering ? "Starting QA…" : "Run visual QA"}</button>
          <Link to="/creator" className="creator-ops-secondary">← Creator Centre</Link>
        </div>
      </header>

      {triggerMessage && <section className="creator-section-panel" role="status"><strong>{triggerMessage}</strong>{triggerActionsUrl && <p><a href={triggerActionsUrl} target="_blank" rel="noreferrer">View running BOT in GitHub Actions ↗</a></p>}</section>}
      {loading ? <section className="creator-section-panel"><p>Loading QA history…</p></section> : error && !selectedRun ? <section className="creator-section-error" role="alert">{error}</section> : runs.length === 0 ? (
        <section className="creator-section-panel creator-section-empty">
          <strong>No QA run has been published yet.</strong>
          <p>Use <b>Run visual QA</b> above. The universal BOT runs against the current <code>master</code> build, then publishes screenshots and machine findings to this Creator workspace and the GitHub <code>qa-evidence</code> branch.</p>
        </section>
      ) : (
        <>
          <section className="creator-metrics-grid qa-evidence-summary-grid">
            <div className="creator-metric"><span>Latest status</span><strong className={runStatusClass(selectedRun?.status)}>{selectedRun?.status || "UNKNOWN"}</strong><small>{selectedRun?.completedAt || "Awaiting published run"}</small></div>
            <div className="creator-metric"><span>Routes captured</span><strong>{currentRunRouteCount}</strong><small>Router + authenticated runtime discovery</small></div>
            <div className="creator-metric"><span>Screenshots</span><strong>{currentRunScreenshotCount}</strong><small>Viewport + full-page evidence</small></div>
            <div className="creator-metric"><span>Findings</span><strong>{reportErrors} / {reportWarnings}</strong><small>{reportErrors} errors · {reportWarnings} warnings in selected run</small></div>
          </section>

          <section className="qa-evidence-toolbar">
            <div>
              <span className="qa-evidence-kicker">PUBLISHED RUN</span>
              <select value={selectedRunId || selectedRun?.id || ""} onChange={(event) => setSelectedRunId(event.target.value)} aria-label="QA run">
                {runs.map((run) => <option key={run.id} value={run.id}>{run.completedAt || run.generatedAt || run.id} · {run.status || "UNKNOWN"} · {run.routes ?? 0} routes</option>)}
              </select>
            </div>
            <div className="qa-evidence-links">
              {selectedRun?.github?.url && <a href={selectedRun.github.url} target="_blank" rel="noreferrer">Open GitHub evidence ↗</a>}
              {selectedRun?.github?.actionsUrl && <a href={selectedRun.github.actionsUrl} target="_blank" rel="noreferrer">Open Actions run ↗</a>}
              <span>{historicalErrors ? `${historicalErrors} historical error finding(s) retained in QA metadata` : "Historical summaries retained; old screenshot files are replaced on the next publish."}</span>
            </div>
          </section>

          {selectedRun?.github?.url && <section className="qa-evidence-callout"><strong>Two evidence surfaces, one run.</strong><span>The in-app viewer loads creator-only screenshot bytes through authenticated Firebase access. GitHub holds the temporary evidence branch for direct review and handoff. Each new run replaces the old visual files.</span></section>}

          {report ? (
            <section className="qa-evidence-workspace">
              <aside className="qa-evidence-index">
                <div className="qa-evidence-panel-head"><span className="qa-evidence-kicker">VIEWPORTS</span><strong>{report.viewports.length} sizes</strong></div>
                {report.viewports.map((viewport) => <button key={viewport.name} type="button" className={selectedViewport === viewport.name ? "is-selected" : ""} onClick={() => setSelectedViewport(viewport.name)}>{viewport.name}<small>{viewport.width}×{viewport.height}</small></button>)}
                <div className="qa-evidence-panel-head route-head"><span className="qa-evidence-kicker">ROUTES</span><strong>{report.routes.length}</strong></div>
                <div className="qa-evidence-route-list">
                  {report.routes.map((route) => {
                    const routeResults = report.results.filter((item) => item.route === route);
                    const errors = routeResults.reduce((sum, item) => sum + findingCounts(item).errors, 0);
                    const warnings = routeResults.reduce((sum, item) => sum + findingCounts(item).warnings, 0);
                    return <button key={route} type="button" className={selectedRoute === route ? "is-selected" : ""} onClick={() => setSelectedRoute(route)}><span>{route}</span><small>{errors ? `🔴 ${errors}` : warnings ? `🟠 ${warnings}` : "🟢 clean"}</small></button>;
                  })}
                </div>
              </aside>

              <div className="qa-evidence-main">
                <div className="qa-evidence-main-head">
                  <div><span className="qa-evidence-kicker">RENDERED SCREEN</span><h2>{selectedRoute}</h2><p>{selectedViewport} · {report.viewports.find((item) => item.name === selectedViewport)?.width}×{report.viewports.find((item) => item.name === selectedViewport)?.height}</p></div>
                  {evidenceLoading && <span className="qa-evidence-loading">Loading evidence…</span>}
                </div>

                {result ? <>
                  <div className="qa-evidence-facts">
                    <span>HTTP {result.responseStatus ?? "—"}</span>
                    <span>{String(metrics.contentInteractiveCount ?? "—")} content controls</span>
                    <span>{String(metrics.pageHeight ?? "—")}px page height</span>
                    <span>{findingCounts(result).errors ? `🔴 ${findingCounts(result).errors} errors` : findingCounts(result).warnings ? `🟠 ${findingCounts(result).warnings} warnings` : "🟢 no automated findings"}</span>
                  </div>
                  {error && <div className="creator-section-error" role="alert">{error}</div>}
                  <div className="qa-evidence-image-grid">
                    <figure><figcaption>Viewport capture</figcaption>{viewportUrl ? <a href={viewportUrl} target="_blank" rel="noreferrer"><img src={viewportUrl} alt={`${selectedRoute} ${selectedViewport} viewport`} /></a> : <div className="qa-evidence-image-placeholder">No viewport screenshot published.</div>}</figure>
                    <figure><figcaption>Full-page capture</figcaption>{fullPageUrl ? <a href={fullPageUrl} target="_blank" rel="noreferrer"><img className="qa-evidence-full-image" src={fullPageUrl} alt={`${selectedRoute} ${selectedViewport} full page`} /></a> : <div className="qa-evidence-image-placeholder">No full-page screenshot published.</div>}</figure>
                  </div>
                  <section className="qa-evidence-findings">
                    <div className="qa-evidence-panel-head"><span className="qa-evidence-kicker">MACHINE FINDINGS</span><strong>{(result.findings || []).length}</strong></div>
                    {(result.findings || []).map((finding, index) => <article key={`${finding.code}-${index}`} className={`qa-finding qa-finding-${finding.severity}`}><strong>{finding.severity === "error" ? "🔴" : finding.severity === "warning" ? "🟠" : "🔵"} {finding.code}</strong><span>{finding.message}</span></article>)}
                  </section>
                </> : <div className="qa-evidence-image-placeholder">No rendered result exists for this route/viewport pair.</div>}
              </div>
            </section>
          ) : <section className="creator-section-panel"><strong>{evidenceLoading ? "Loading published visual evidence…" : "This run has metadata but no accessible visual report."}</strong><p>{error || "The visual evidence is replaced when the next run is published; historical QA summaries remain available for traceability."}</p></section>}
        </>
      )}
    </main>
  );
}
