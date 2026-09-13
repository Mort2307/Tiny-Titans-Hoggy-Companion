import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/TinyTitans-Logo.jpg";
import { useAuth } from "../../context/useAuth";
import { getCreatorSubmissionConversations, getUserSubmissionConversations } from "../../services/submissionConversationService";
import { getTitanDecisionState, type TitanDecision } from "../../services/titanDecisionStateService";
import { subscribeToTitanIntelligenceUpdates } from "../../services/titanReactiveIntelligenceService";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";
import LiveWorldClockBadge from "../LiveWorldClockBadge";
import TinyTitansTierCrest from "../TinyTitansTierCrest";
import { getPaidAccess, type PaidAccess } from "../../services/paidTierService";
import { getPaidTierDefinition } from "../../config/paidTiers";
import "./Header.css";

function Header() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [decision, setDecision] = useState<TitanDecision | null>(null);
  const [paidAccess, setPaidAccess] = useState<PaidAccess | null>(null);
  const creatorMode = profile?.role === "admin";

  useEffect(() => {
    let active = true;
    if (!user) { setUnread(0); return () => { active = false; }; }
    void (creatorMode ? getCreatorSubmissionConversations() : getUserSubmissionConversations(user.uid)).then((threads) => {
      if (!active) return;
      setUnread(threads.reduce((sum, thread) => sum + (creatorMode ? thread.unreadForCreator : thread.unreadForSubmitter), 0));
    }).catch(() => { if (active) setUnread(0); });
    return () => { active = false; };
  }, [user, creatorMode, location.pathname]);

  useEffect(() => {
    if (!user || creatorMode) {
      setDecision(null);
      return () => undefined;
    }
    const refresh = () => setDecision(getTitanDecisionState(user.uid).decisions.find((item) => item.status === "active") ?? null);
    refresh();
    return subscribeToTitanIntelligenceUpdates(refresh);
  }, [user, creatorMode]);

  useEffect(() => {
    if (!user) {
      setPaidAccess(null);
      document.documentElement.removeAttribute("data-tt-tier");
      document.documentElement.removeAttribute("data-tt-tier-source");
      document.documentElement.style.removeProperty("--tt-tier-accent");
      return () => undefined;
    }
    let active = true;
    void getPaidAccess(user.uid).then((access) => {
      if (!active) return;
      setPaidAccess(access);
      const definition = getPaidTierDefinition(access.effectiveTier);
      document.documentElement.dataset.ttTier = definition.id;
      document.documentElement.dataset.ttTierSource = access.source;
      document.documentElement.style.setProperty("--tt-tier-accent", definition.accent);
    }).catch(() => {
      if (!active) return;
      setPaidAccess(null);
      document.documentElement.removeAttribute("data-tt-tier");
      document.documentElement.removeAttribute("data-tt-tier-source");
      document.documentElement.style.removeProperty("--tt-tier-accent");
    });
    return () => { active = false; };
  }, [user]);

  return (
    <header className="app-header">
      <Link to="/" className="logo-link" aria-label="Tiny Titans Reptile Companion home">
        <img src={logo} alt="Tiny Titans Reptile Companion" className="tiny-titans-logo" />
      </Link>
      <div className="app-brand-lockup" aria-label="Tiny Titans Reptile Companion">
        <span className="app-brand-name">
          <span className="app-brand-primary">Tiny Titans</span>
          <span className="app-brand-secondary">Reptile Companion</span>
        </span>
      </div>
      <div className="app-header-actions">
        <LiveWorldClockBadge />
        {!creatorMode && paidAccess && (
          <Link className="paid-tier-header-badge" to="/plans" aria-label={`Your Tiny Titans tier: ${getPaidTierDefinition(paidAccess.effectiveTier).name}`} title={paidAccess.source === "tester" ? "Creator tester access" : paidAccess.source === "trial" ? "Trial access" : "Your Tiny Titans tier"}>
            <TinyTitansTierCrest tier={paidAccess.effectiveTier} size={21} />
            <strong>{getPaidTierDefinition(paidAccess.effectiveTier).shortLabel}</strong>
            {paidAccess.source !== "subscription" && <small>{paidAccess.source === "tester" ? "TEST" : paidAccess.source === "trial" ? "TRIAL" : "FREE"}</small>}
          </Link>
        )}
        {!creatorMode && decision && <Link className="titan-proactive-header-link" to={decision.destination || `/snakes/${decision.animalId}/master-record`} aria-label={`Tiny Titans noticed something for ${decision.animalName ?? "your Titan"}: ${decision.title}`} title={decision.why}><span aria-hidden="true">⚡</span><span className="titan-proactive-header-copy"><strong>{decision.animalName ?? "Titan"}</strong><small>{decision.title}</small></span></Link>}
        <Link className="submission-mailbox-link" to="/conversations" aria-label={unread > 0 ? `Message Centre, ${unread} unread submission message${unread === 1 ? "" : "s"}` : "Open Message Centre"} title={unread > 0 ? `${unread} unread submission message${unread === 1 ? "" : "s"}` : "Message Centre"}><span aria-hidden="true">💬</span>{unread > 0 && <span className="submission-mailbox-badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</Link>
        <TitanCommandPalette />
      </div>
    </header>
  );
}

export default Header;
