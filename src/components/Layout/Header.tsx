import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/TinyTitans-Logo.jpg";
import { useAuth } from "../../context/useAuth";
import { useWorkspaceBranding } from "../../context/WorkspaceBrandingContext";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";
import LiveWorldClockBadge from "../LiveWorldClockBadge";
import TinyTitansIcon from "../TinyTitansIcon";
import TinyTitansTierCrest from "../TinyTitansTierCrest";
import WorkspaceSwitcher from "../WorkspaceSwitcher";
import { getPaidAccess, type PaidAccess } from "../../services/paidTierService";
import { getPaidTierDefinition } from "../../config/paidTiers";
import { getWorkspaceProduct } from "../../config/workspaceProducts";
import {
  getWorkspacePresentation,
  subscribeToWorkspacePresentation,
  type WorkspacePresentation,
} from "../../services/workspacePresentationService";
import "./Header.css";
import "./HeaderOverlays.css";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

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
  const branding = useWorkspaceBranding();
  const [paidAccess, setPaidAccess] = useState<PaidAccess | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(getWorkspacePresentation);

  const creatorMode = profile?.role === "admin";

  useEffect(() => subscribeToWorkspacePresentation(setWorkspace), []);

  useEffect(() => {
    if (!user) {
      setPaidAccess(null);
      return () => undefined;
    }

    let active = true;
    void getPaidAccess(user.uid)
      .then((access) => {
        if (active) setPaidAccess(access);
      })
      .catch(() => {
        if (active) setPaidAccess(null);
      });

    return () => { active = false; };
  }, [user]);

  const productId = workspace.productId;
  const workspaceProduct = getWorkspaceProduct(productId);
  const isPersonal = productId === "personal";
  const customerTier = paidAccess?.actualTier ?? "free";
  const customerTierDefinition = getPaidTierDefinition(customerTier);
  const showTesterTier = paidAccess?.source === "tester";
  const displayTier = showTesterTier ? paidAccess!.effectiveTier : customerTier;
  const displayTierDefinition = getPaidTierDefinition(displayTier);
  const isOwner = user?.email?.trim().toLowerCase() === OWNER_EMAIL;

  const workspaceName = isPersonal
    ? "Tiny Titans"
    : branding.name ||
      (productId === "rescue"
        ? "Rescue Centre"
        : getPaidTierDefinition(workspace.access?.effectiveTier ?? "free").name);

  const productSubtitle = isPersonal
    ? "Reptile Companion"
    : productId === "rescue"
      ? "Rescue Centre Workspace"
      : productId === "titan_pro"
        ? "Advanced Keeper Workspace"
        : productId === "titan_seller"
          ? "Seller Workspace"
          : productId === "business_advanced"
            ? "Full Business Workspace"
            : productId === "business_plus"
              ? "Growing Business Workspace"
              : "Business Workspace";

  const tagline = isPersonal
    ? "Know your reptiles. Understand their patterns. Keep better records."
    : productId === "rescue"
      ? "Your rescue centre, its animals and its daily operations."
      : getPaidTierDefinition(workspace.access?.effectiveTier ?? "free").description;

  const workspaceLabel = location.pathname.startsWith("/rescue") && productId === "rescue"
    ? "Rescue Centre"
    : workspaceName;

  return (
    <header className={"app-header app-header--" + productId}>
      <Link to={productId === "rescue" ? "/rescue" : "/"} className="logo-link" aria-label={workspaceName + " home"}>
        <img src={logo} alt="Tiny Titans Reptile Companion" className="tiny-titans-logo" />
      </Link>

      <div className="app-brand-lockup" aria-label={workspaceName}>
        {!isPersonal && branding.logoUrl && (
          <img className="workspace-brand-avatar" src={branding.logoUrl} alt="" aria-hidden="true" />
        )}
        <span className="app-brand-overline">
          {isPersonal ? "TINY TITANS" : (productId === "rescue" ? "RESCUE" : "TINY TITANS") + " WORKSPACE"}
        </span>
        <span className="app-brand-name">
          <span className="app-brand-primary">{workspaceLabel}</span>
          <span className="app-brand-secondary">{productSubtitle}</span>
        </span>
        <span className="app-brand-tagline">{tagline}</span>
      </div>

      {!isPersonal && (
        <Link
          className="workspace-purpose-pill"
          to={productId === "rescue" ? "/rescue" : "/plans"}
          aria-label={workspaceProduct.eyebrow + " active"}
        >
          <TinyTitansIcon name={workspaceIcon(productId)} size={20} aria-hidden="true" />
          <span><strong>{workspaceProduct.eyebrow}</strong><small>Workspace active</small></span>
        </Link>
      )}

      <div className="app-header-actions">
        <LiveWorldClockBadge />
        <WorkspaceSwitcher isOwner={isOwner} />

        {!creatorMode && paidAccess && (
          <Link
            className="paid-tier-header-badge"
            to="/plans"
            aria-label={"Your Tiny Titans tier: " + (showTesterTier ? displayTierDefinition.name : customerTierDefinition.name)}
            title={
              showTesterTier
                ? "Creator tester access is enabled for tier QA"
                : paidAccess.source === "trial"
                  ? "Trial access"
                  : "Your Tiny Titans tier"
            }
          >
            <TinyTitansTierCrest tier={displayTier} size={21} />
            <strong>{displayTierDefinition.shortLabel}</strong>
            {showTesterTier && <small>TEST · {displayTierDefinition.shortLabel}</small>}
          </Link>
        )}

        <TitanCommandPalette />
      </div>
    </header>
  );
}

export default Header;