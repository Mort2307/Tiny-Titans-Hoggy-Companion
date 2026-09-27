import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentTitanGoal, getCompletedTitanGoals, TITAN_GOALS } from "../config/titanGoals";
import TinyTitansIcon from "./TinyTitansIcon";
import TinyTitansFeedback from "./TinyTitansFeedback";
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
      <div className="tt-titan-goal-compact-top"><span><TinyTitansIcon name="titan" size={16} /> <strong>Titan Fund</strong></span><span>{loading ? "Loading…" : currentGoal ? `${formatMoney(total)} raised` : "All current goals reached"}</span></div>
      {error ? <TinyTitansFeedback compact kind="error" className="tt-titan-goal-error">{error}</TinyTitansFeedback> : currentGoal ? <>
        <div className="tt-titan-goal-compact-title"><strong><TinyTitansIcon name={currentGoal.icon} size={16} /> {currentGoal.shortTitle}</strong><span>{Math.round(progress)}%</span></div>
        <div className="tt-titan-progress" aria-label={`${Math.round(progress)} percent of current Titan Fund goal reached`}><span style={{ width: `${progress}%` }} /></div>
        <div className="tt-titan-goal-compact-bottom"><span>{formatMoney(currentGoal.targetGbp)} goal</span><a href="/become-a-titan">Help us get there <TinyTitansIcon name="forward" size={14} /></a></div>
      </> : <div className="tt-titan-goal-complete"><strong><TinyTitansIcon name="check" size={16} /> Roadmap funded</strong><a href="/become-a-titan">See what we build next <TinyTitansIcon name="forward" size={14} /></a></div>}
    </section>;
  }

  return <section className="tt-titan-goal" aria-labelledby="titan-goal-heading">
    <div className="tt-titan-goal-header"><div><p className="tt-titan-goal-kicker"><TinyTitansIcon name="titan" size={16} /> BECOME A TITAN · LIVE FUND</p><h2 id="titan-goal-heading">Help build what comes next</h2></div><button type="button" className="tt-titan-refresh" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : <><TinyTitansIcon name="rotate" size={15} /> Refresh</>}</button></div>
    {error ? <TinyTitansFeedback kind="error" className="tt-titan-goal-error">{error}</TinyTitansFeedback> : currentGoal ? <>
      <div className="tt-titan-goal-main"><div><span className="tt-titan-goal-icon"><TinyTitansIcon name={currentGoal.icon} size={28} /></span><div><span className="tt-titan-goal-label">CURRENT GOAL</span><h3>{currentGoal.title}</h3><p>{currentGoal.description}</p></div></div><div className="tt-titan-goal-amount"><strong>{formatMoney(total)}</strong><span>of {formatMoney(currentGoal.targetGbp)}</span></div></div>
      <div className="tt-titan-progress tt-titan-progress-large"><span style={{ width: `${progress}%` }} /></div>
      <div className="tt-titan-goal-meta"><strong>{Math.round(progress)}% funded</strong><span>{formatMoney(remaining)} to go</span><span>{stats?.totalSupporters ?? 0} Titan supporters</span></div>
      <div className="tt-titan-goal-use"><strong>What this goal helps fund</strong><ul>{currentGoal.fundingUse.map((item) => <li key={item}><TinyTitansIcon name="check" size={14} /> {item}</li>)}</ul></div>
      {nextGoal && <div className="tt-titan-next-goal"><span>NEXT UP</span><strong><TinyTitansIcon name={nextGoal.icon} size={16} /> {nextGoal.title}</strong><em>Target: {formatMoney(nextGoal.targetGbp)}</em></div>}
    </> : <div className="tt-titan-goal-all-complete"><span><TinyTitansIcon name="check" size={26} /></span><div><h3>Every current Titan Fund goal has been reached.</h3><p>{formatMoney(total)} has been raised by {stats?.totalSupporters ?? 0} supporters. The next roadmap will be published as the project grows.</p></div></div>}

    <div id="goals" className="tt-titan-roadmap"><div className="tt-titan-roadmap-heading"><div><span>THE ROADMAP</span><h3>Where the fund is heading</h3></div><small>Goals are cumulative milestones, not separate charges.</small></div><div className="tt-titan-roadmap-list">{TITAN_GOALS.map((goal) => {
      const completed = total >= goal.targetGbp;
      const active = currentGoal?.id === goal.id;
      const milestoneProgress = completed ? 100 : active ? progress : 0;
      return <article key={goal.id} className={`tt-titan-roadmap-item${completed ? " is-complete" : ""}${active ? " is-active" : ""}`}>
        <div className="tt-titan-roadmap-icon"><TinyTitansIcon name={completed ? "check" : goal.icon} size={20} /></div><div className="tt-titan-roadmap-copy"><div><strong>{goal.title}</strong><span>£{goal.targetGbp}</span></div><p>{goal.description}</p><div className="tt-titan-progress"><span style={{ width: `${milestoneProgress}%` }} /></div></div><div className="tt-titan-roadmap-state">{completed ? "Reached" : active ? `${Math.round(progress)}%` : "Upcoming"}</div>
      </article>;
    })}</div></div>

    <div className="tt-titan-goal-actions"><a className="tt-titan-support-button" href="/become-a-titan#support"><TinyTitansIcon name="titan" size={16} /> Become a Titan</a><a href="/wall-of-titans">Meet the Titans <TinyTitansIcon name="forward" size={14} /></a></div>
  </section>;
}
