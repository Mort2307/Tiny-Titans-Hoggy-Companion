import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/TinyTitans-Logo.jpg";
import { useAuth } from "../../context/useAuth";
import { getCreatorSubmissionConversations, getUserSubmissionConversations } from "../../services/submissionConversationService";
import { getTitanDecisionState, type TitanDecision } from "../../services/titanDecisionStateService";
import { subscribeToTitanIntelligenceUpdates } from "../../services/titanReactiveIntelligenceService";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";
import LiveWorldClockBadge from "../LiveWorldClockBadge";
import TinyTitansIcon from "../TinyTitansIcon";
import TinyTitansTierCrest from "../TinyTitansTierCrest";
import { getPaidAccess, type PaidAccess } from "../../services/paidTierService";
import { getPaidTierDefinition } from "../../config/paidTiers";
import { getWorkspaceProduct } from "../../config/workspaceProducts";
import { getWorkspacePresentation, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../../services/workspacePresentationService";
import "./Header.css";

function Header() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [decision, setDecision] = useState<TitanDecision | null>(null);
  const [paidAccess, setPaidAccess] = useState<PaidAccess | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(getWorkspacePresentation);
  const creatorMode = profile?.role === "admin";

  useEffect(() => subscribeToWorkspacePresentation(setWorkspace), []);

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
    if (!user || creatorMode) { setDecision(null); return () => undefined; }
    const refresh = () => setDecision(getTitanDecisionState(user.uid).decisions.find((item) => item.status === "active") ?? null);
    refresh();
    return subscribeToTitanIntelligenceUpdates(refresh);
  }, [user, creatorMode]);

  useEffect(() => {
    if (!user) { setPaidAccess(null); return () => undefined; }
    let active = true;
    void getPaidAccess(user.uid).then((access) => { if (active) setPaidAccess(access); }).catch(() => { if (active) setPaidAccess(null); });
    return () => { active = false; };
  }, [user]);

  const product = getWorkspacePresentation();
  const workspaceProduct = getWorkspaceProduct(workspace.productId);
  const isPersonal = workspace.productId === "personal";
  const productName = isPersonal ? "Tiny Titans" : product.productId === "rescue" ? "TinyTitans Rescue" : getPaidTierDefinition(workspace.access?.effectiveTier ?? "free").name;
  const productSubtitle = isPersonal ? "Reptile Companion" : product.productId === "rescue" ? "Rescue Operations" : product.productId === "titan_pro" ? "Advanced Keeper Workspace" : product.productId === "titan_seller" ? "Seller Workspace" : product.productId === "business_advanced" ? "Full Business Workspace" : product.productId === "business_plus" ? "Growing Business Workspace" : "Business Workspace";
  const tagline = isPersonal ? "Know your reptiles. Understand their patterns. Keep better records." : product.productId === "rescue" ? "Run rescue operations around the animals, not the paperwork." : getPaidTierDefinition(workspace.access?.effectiveTier ?? "free").description;

  return (
    <header className={`app-header app-header--${workspace.productId}`}>
      <Link to={workspace.productId === "rescue" ? "/rescue" : "/"} className="logo-link" aria-label={`${productName} home`}>
        <img src={logo} alt="Tiny Titans Reptile Companion" className="tiny-titans-logo" />
      </Link>
      <div className="app-brand-lockup" aria-label={productName}>
        <span className="app-brand-overline">{isPersonal ? "TINY TITANS" : `${workspace.productId === "rescue" ? "RESCUE" : "TINY TITANS"} WORKSPACE`}</span>
        <span className="app-brand-name"><span className="app-brand-primary">{productName}</span><span className="app-brand-secondary">{productSubtitle}</span></span>
        <span className="app-brand-tagline">{tagline}</span>
      </div>
      {!isPersonal && <Link className="workspace-purpose-pill" to={workspace.productId === "rescue" ? "/rescue" : "/plans"}><span aria-hidden="true">{product.productId === "rescue" ? "🚑" : product.productId === "titan_pro" ? "⚡" : product.productId === "titan_seller" ? "🛍️" : product.productId === "business_advanced" ? "👑" : "🏢"}</span><strong>{workspaceProduct.eyebrow}</strong><small>Workspace active</small></Link>}
      <div className="app-header-actions">
        <LiveWorldClockBadge />
        {!creatorMode && paidAccess && <Link className="paid-tier-header-badge" to="/plans" aria-label={`Your Tiny Titans tier: ${getPaidTierDefinition(paidAccess.effectiveTier).name}`} title={paidAccess.source === "tester" ? "Creator tester access" : paidAccess.source === "trial" ? "Trial access" : "Your Tiny Titans tier"}><TinyTitansTierCrest tier={paidAccess.effectiveTier} size={21} /><strong>{getPaidTierDefinition(paidAccess.effectiveTier).shortLabel}</strong>{paidAccess.source !== "subscription" && <small>{paidAccess.source === "tester" ? "TEST" : paidAccess.source === "trial" ? "TRIAL" : "FREE"}</small>}</Link>}
        {!creatorMode && decision && <Link className="titan-proactive-header-link" to={decision.destination || `/snakes/${decision.animalId}/master-record`} aria-label={`Tiny Titans noticed something for ${decision.animalName ?? "your Titan"}: ${decision.title}`} title={decision.why}><TinyTitansIcon name="titan" size={20} /><span className="titan-proactive-header-copy"><strong>{decision.animalName ?? "Titan"}</strong><small>{decision.title}</small></span></Link>}
        <Link className="submission-mailbox-link" to="/conversations" aria-label={unread > 0 ? `Message Centre, ${unread} unread submission message${unread === 1 ? "" : "s"}` : "Open Message Centre"} title={unread > 0 ? `${unread} unread submission message${unread === 1 ? "" : "s"}` : "Message Centre"}><TinyTitansIcon name="messages" size={20} />{unread > 0 && <span className="submission-mailbox-badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</Link>
        <TitanCommandPalette />
      </div>
    </header>
  );
}

export default Header;
