import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/TinyTitans-Logo.jpg";
import { useAuth } from "../../context/useAuth";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";
import LiveWorldClockBadge from "../LiveWorldClockBadge";
import TinyTitansIcon from "../TinyTitansIcon";
import TinyTitansTierCrest from "../TinyTitansTierCrest";
import { getPaidAccess, type PaidAccess } from "../../services/paidTierService";
import { getPaidTierDefinition } from "../../config/paidTiers";
import { getWorkspaceProduct } from "../../config/workspaceProducts";
import { getWorkspacePresentation, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../../services/workspacePresentationService";
import "./Header.css";

function workspaceIcon(productId: WorkspacePresentation["productId"]) {
  if (productId === "rescue") return "health" as const;
  if (productId === "titan_seller") return "marketplace" as const;
  if (productId.startsWith("business_")) return "community" as const;
  if (productId === "titan_pro") return "titan" as const;
  return "reptile" as const;
}

function Header() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [paidAccess, setPaidAccess] = useState<PaidAccess | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(getWorkspacePresentation);
  const creatorMode = profile?.role === "admin";

  useEffect(() => subscribeToWorkspacePresentation(setWorkspace), []);

  useEffect(() => {
    if (!user) { setPaidAccess(null); return () => undefined; }
    let active = true;
    void getPaidAccess(user.uid).then((access) => { if (active) setPaidAccess(access); }).catch(() => { if (active) setPaidAccess(null); });
    return () => { active = false; };
  }, [user]);

  const product = workspace;
  const workspaceProduct = getWorkspaceProduct(workspace.productId);
  const isPersonal = workspace.productId === "personal";
  const productName = isPersonal ? "Tiny Titans" : product.productId === "rescue" ? "TinyTitans Rescue" : getPaidTierDefinition(workspace.access?.effectiveTier ?? "free").name;
  const productSubtitle = isPersonal ? "Reptile Companion" : product.productId === "rescue" ? "Rescue Operations" : product.productId === "titan_pro" ? "Advanced Keeper Workspace" : product.productId === "titan_seller" ? "Seller Workspace" : product.productId === "business_advanced" ? "Full Business Workspace" : product.productId === "business_plus" ? "Growing Business Workspace" : "Business Workspace";
  const tagline = isPersonal ? "Know your reptiles. Understand their patterns. Keep better records." : product.productId === "rescue" ? "Run rescue operations around the animals, not the paperwork." : getPaidTierDefinition(workspace.access?.effectiveTier ?? "free").description;
  const workspaceLabel = location.pathname.startsWith("/rescue") && product.productId === "rescue" ? "Rescue" : productName;

  return (
    <header className={`app-header app-header--${workspace.productId}`}>
      <Link to={product.productId === "rescue" ? "/rescue" : "/"} className="logo-link" aria-label={`${productName} home`}>
        <img src={logo} alt="Tiny Titans Reptile Companion" className="tiny-titans-logo" />
      </Link>
      <div className="app-brand-lockup" aria-label={productName}>
        <span className="app-brand-overline">{isPersonal ? "TINY TITANS" : `${product.productId === "rescue" ? "RESCUE" : "TINY TITANS"} WORKSPACE`}</span>
        <span className="app-brand-name"><span className="app-brand-primary">{workspaceLabel}</span><span className="app-brand-secondary">{productSubtitle}</span></span>
        <span className="app-brand-tagline">{tagline}</span>
      </div>
      {!isPersonal && <Link className="workspace-purpose-pill" to={product.productId === "rescue" ? "/rescue" : "/plans"} aria-label={`${workspaceProduct.eyebrow} active`}><TinyTitansIcon name={workspaceIcon(product.productId)} size={20} aria-hidden="true" /><span><strong>{workspaceProduct.eyebrow}</strong><small>Workspace active</small></span></Link>}
      <div className="app-header-actions">
        <LiveWorldClockBadge />
        {!creatorMode && paidAccess && <Link className="paid-tier-header-badge" to="/plans" aria-label={`Your Tiny Titans tier: ${getPaidTierDefinition(paidAccess.effectiveTier).name}`} title={paidAccess.source === "tester" ? "Creator tester access" : paidAccess.source === "trial" ? "Trial access" : "Your Tiny Titans tier"}><TinyTitansTierCrest tier={paidAccess.effectiveTier} size={21} /><strong>{getPaidTierDefinition(paidAccess.effectiveTier).shortLabel}</strong>{paidAccess.source !== "subscription" && <small>{paidAccess.source === "tester" ? "TEST" : paidAccess.source === "trial" ? "TRIAL" : "FREE"}</small>}</Link>}
        <TitanCommandPalette />
      </div>
    </header>
  );
}

export default Header;
