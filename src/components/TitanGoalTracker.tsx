import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentTitanGoal, getCompletedTitanGoals, TITAN_GOALS } from "../config/titanGoals";
import { getTitanSupportStats, type TitanSupportStats } from "../services/titanSupportService";
import "../styles/TitanGoalTracker.css";

type TitanGoalTrackerProps = { compact?: boolean };

function formatMoney(value: number) {
  return `£${value.toFixed(2)}`;
}

export default function TitanGoalTracker({ compact = false }: TitanGoalTrackerProps) {
  const [stats, setStats] = useState<TitanSupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await getTitanSupportStats();
      setStats(next);
      setError("");
    } catch (refreshError) {
      console.error("Titan goal tracker refresh failed", refreshError);
      setError("Live goal data is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const total = stats?.totalReceivedGbp ?? 0;
  const currentGoal = useMemo(() => getCurrentTitanGoal(total), [total]);
  const completedGoals = useMemo(() => getCompletedTitanGoals(total), [total]);
  const previousTarget = completedGoals.length ? completedGoals[completedGoals.length - 1].targetGbp : 0;
  const progress = currentGoal ? Math.min(100, Math.max(0, ((total - previousTarget) / (currentGoal.targetGbp - previousTarget)) * 100)) : 100;
  const remaining = currentGoal ? Math.max(0, currentGoal.targetGbp - total) : 0;
  const nextGoal = currentGoal ? TITAN_GOALS[TITAN_GOALS.findIndex((goal) => goal.id === currentGoal.id) + 1] : null;

  if (compact) {
    return <section className="tt-titan-goal tt-titan-goal-compact" aria-label="Live Titan Fund goal">
      <div className="tt-titan-goal-compact-top"><span>🐍 <strong>Titan Fund</strong></span><span>{loading ? "Loading…" : currentGoal ? `${formatMoney(total)} raised` : "All current goals reached"}</span></div>
      {error ? <p className="tt-titan-goal-error">{error}</p> : currentGoal ? <>
        <div className="tt-titan-goal-compact-title"><strong>{currentGoal.icon} {currentGoal.shortTitle}</strong><span>{Math.round(progress)}%</span></div>
        <div className="tt-titan-progress" aria-label={`${Math.round(progress)} percent of current Titan Fund goal reached`}><span style={{ width: `${progress}%` }} /></div>
        <div className="tt-titan-goal-compact-bottom"><span>{formatMoney(currentGoal.targetGbp)} goal</span><a href="/become-a-titan">Help us get there →</a></div>
      </> : <div className="tt-titan-goal-complete"><strong>🎉 Roadmap funded</strong><a href="/become-a-titan">See what we build next →</a></div>}
    </section>;
  }

  return <section className="tt-titan-goal" aria-labelledby="titan-goal-heading">
    <div className="tt-titan-goal-header"><div><p className="tt-titan-goal-kicker">🐍 BECOME A TITAN · LIVE FUND</p><h2 id="titan-goal-heading">Help build what comes next</h2></div><button type="button" className="tt-titan-refresh" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button></div>
    {error ? <div className="tt-titan-goal-error">{error}</div> : currentGoal ? <>
      <div className="tt-titan-goal-main"><div><span className="tt-titan-goal-icon">{currentGoal.icon}</span><div><span className="tt-titan-goal-label">CURRENT GOAL</span><h3>{currentGoal.title}</h3><p>{currentGoal.description}</p></div></div><div className="tt-titan-goal-amount"><strong>{formatMoney(total)}</strong><span>of {formatMoney(currentGoal.targetGbp)}</span></div></div>
      <div className="tt-titan-progress tt-titan-progress-large"><span style={{ width: `${progress}%` }} /></div>
      <div className="tt-titan-goal-meta"><strong>{Math.round(progress)}% funded</strong><span>{formatMoney(remaining)} to go</span><span>{stats?.totalSupporters ?? 0} Titan supporters</span></div>
      <div className="tt-titan-goal-use"><strong>What this goal helps fund</strong><ul>{currentGoal.fundingUse.map((item) => <li key={item}>✓ {item}</li>)}</ul></div>
      {nextGoal && <div className="tt-titan-next-goal"><span>NEXT UP</span><strong>{nextGoal.icon} {nextGoal.title}</strong><em>Target: {formatMoney(nextGoal.targetGbp)}</em></div>}
    </> : <div className="tt-titan-goal-all-complete"><span>🎉</span><div><h3>Every current Titan Fund goal has been reached.</h3><p>{formatMoney(total)} has been raised by {stats?.totalSupporters ?? 0} supporters. The next roadmap will be published as the project grows.</p></div></div>}

    <div id="goals" className="tt-titan-roadmap"><div className="tt-titan-roadmap-heading"><div><span>THE ROADMAP</span><h3>Where the fund is heading</h3></div><small>Goals are cumulative milestones, not separate charges.</small></div><div className="tt-titan-roadmap-list">{TITAN_GOALS.map((goal) => {
      const completed = total >= goal.targetGbp;
      const active = currentGoal?.id === goal.id;
      const milestoneProgress = completed ? 100 : active ? progress : 0;
      return <article key={goal.id} className={`tt-titan-roadmap-item${completed ? " is-complete" : ""}${active ? " is-active" : ""}`}>
        <div className="tt-titan-roadmap-icon">{completed ? "✓" : goal.icon}</div><div className="tt-titan-roadmap-copy"><div><strong>{goal.title}</strong><span>£{goal.targetGbp}</span></div><p>{goal.description}</p><div className="tt-titan-progress"><span style={{ width: `${milestoneProgress}%` }} /></div></div><div className="tt-titan-roadmap-state">{completed ? "Reached" : active ? `${Math.round(progress)}%` : "Upcoming"}</div>
      </article>;
    })}</div></div>

    <div className="tt-titan-goal-actions"><a className="tt-titan-support-button" href="/become-a-titan#support">Become a Titan 🐍</a><a href="/wall-of-titans">Meet the Titans →</a></div>
  </section>;
}
