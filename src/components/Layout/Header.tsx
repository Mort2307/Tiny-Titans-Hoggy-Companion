import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/TinyTitans-Logo.jpg";
import { useAuth } from "../../context/useAuth";
import { useWorkspaceBranding } from "../../context/WorkspaceBrandingContext";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";
import LiveWorldClockBadge from "../LiveWorldClockBadge";
import TinyTitansIcon from "../TinyTitansIcon";
import TinyTitansTierCrest from "../TinyTitansTierCrest";
import WorkspaceSwitcher from "../WorkspaceSwitcher";
import {
  ensureCreatorClaim,
  getPaidAccess,
  setPaidTesterOverride,
  type PaidAccess,
} from "../../services/paidTierService";
import {
  getPaidTierDefinition,
  PAID_TIER_ORDER,
  type PaidTierId,
} from "../../config/paidTiers";
import { getWorkspaceProduct } from "../../config/workspaceProducts";
import {
  getWorkspacePresentation,
  refreshWorkspacePresentation,
  setActiveWorkspaceMode,
  subscribeToWorkspacePresentation,
  type WorkspacePresentation,
} from "../../services/workspacePresentationService";
import "./Header.css";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function workspaceIcon(productId: WorkspacePresentation["productId"]) {
  if (productId === "rescue") return "health" as const;
  if (productId === "titan_seller") return "marketplace" as const;
  if (productId.startsWith("business_")) return "community" as const;
  if (productId === "titan_pro") return "titan" as const;
  return "animals" as const;
}

function mobileContextLabel(pathname: string) {
  if (pathname === "/") return "At a Glance";
  if (pathname.startsWith("/animals") || pathname.startsWith("/snakes")) return "My Animals";
  if (pathname.startsWith("/feeding")) return "Feeding";
  if (pathname.startsWith("/weights")) return "Weight";
  if (pathname.startsWith("/shedding")) return "Shedding";
  if (pathname.startsWith("/health")) return "Health";
  if (pathname.startsWith("/behaviour")) return "Behaviour";
  if (pathname.startsWith("/reminders")) return "Reminders";
  if (pathname.startsWith("/species")) return "Species";
  if (pathname.startsWith("/morph-library")) return "Morph Library";
  if (pathname.startsWith("/calculator")) return "Genetics";
  if (pathname.startsWith("/breeding")) return "Breeding";
  if (pathname.startsWith("/rescue")) return "Rescue";
  if (pathname.startsWith("/marketplace")) return "Marketplace";
  if (pathname.startsWith("/paid") || pathname.startsWith("/plans")) return "Plans & Features";
  if (pathname.startsWith("/titan-intelligence")) return "Titan Intelligence";
  if (pathname.startsWith("/husbandry")) return "Husbandry";
  if (pathname.startsWith("/enclosure-intelligence")) return "Enclosure";
  if (pathname.startsWith("/behaviour-observatory")) return "Observatory";
  if (pathname.startsWith("/keeper-handbook")) return "Keeper Handbook";
  if (pathname.startsWith("/learn") || pathname.startsWith("/challenge")) return "Learning";
  if (pathname.startsWith("/knowledge-base")) return "Knowledge Base";
  if (pathname.startsWith("/sandbox")) return "Sandbox";
  if (pathname.startsWith("/community/mentorship")) return "Mentorship";
  if (pathname.startsWith("/community")) return "Community";
  if (pathname.startsWith("/creator")) return "Creator";
  if (pathname.startsWith("/account")) return "My Account";
  if (pathname.startsWith("/feedback")) return "Feedback";
  if (pathname.startsWith("/report-bug")) return "Report a Bug";
  return "Keeper Companion";
}

function mobileBackFallback(pathname: string) {
  if (pathname.startsWith("/snakes/") || pathname === "/snakes") return "/animals";
  if (pathname.startsWith("/animals/")) return "/animals";
  if (pathname.startsWith("/reminders/")) return "/reminders";
  if (pathname.startsWith("/species/")) return "/species";
  if (pathname.startsWith("/morph-library/")) return "/morph-library";
  if (pathname.startsWith("/paid/")) return "/plans";
  if (pathname.startsWith("/account/")) return "/account";
  if (pathname.startsWith("/rescue/")) return "/rescue";
  if (pathname.startsWith("/creator/")) return "/creator";
  if (pathname.startsWith("/community/")) return "/community";
  if (pathname.startsWith("/breeding/")) return "/breeding";
  return "/";
}

function Header() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const branding = useWorkspaceBranding();
  const [paidAccess, setPaidAccess] = useState<PaidAccess | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(getWorkspacePresentation);
  const [qaOpen, setQaOpen] = useState(false);
  const [qaMenuTop, setQaMenuTop] = useState<number | null>(null);
  const qaButtonRef = useRef<HTMLButtonElement | null>(null);
  const [qaBusy, setQaBusy] = useState(false);
  const [qaMessage, setQaMessage] = useState("");

  const creatorMode = profile?.role === "admin";
  const showMobileBack = !["/", "/animals", "/reminders"].includes(location.pathname);

  function handleMobileBack() {
    const historyState = window.history.state as { idx?: number } | null;
    if ((historyState?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate(mobileBackFallback(location.pathname));
  }

  useEffect(() => subscribeToWorkspacePresentation(setWorkspace), []);

  useEffect(() => {
    if (!qaOpen) return;
    const positionMenu = () => {
      const button = qaButtonRef.current;
      if (button) setQaMenuTop(button.getBoundingClientRect().bottom + 8);
    };
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [qaOpen]);

  function toggleQaMenu() {
    setQaOpen((value) => {
      const next = !value;
      if (!value) window.requestAnimationFrame(() => {
        const button = qaButtonRef.current;
        if (button) setQaMenuTop(button.getBoundingClientRect().bottom + 8);
      });
      return next;
    });
  }


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

    return () => {
      active = false;
    };
  }, [user]);

  async function switchQaTier(tier: PaidTierId) {
    if (!user || user.email?.trim().toLowerCase() !== OWNER_EMAIL || qaBusy) return;

    setQaBusy(true);
    setQaMessage("");

    try {
      await ensureCreatorClaim();
      await setPaidTesterOverride(user.uid, tier !== "free", tier, "silent", null);
      setActiveWorkspaceMode(user.uid, tier === "free" ? "personal" : "work");
      refreshWorkspacePresentation();
      setQaMessage(`${getPaidTierDefinition(tier).name} QA active`);
      window.setTimeout(() => window.location.reload(), 150);
    } catch (error) {
      setQaMessage(
        error instanceof Error ? error.message : "Could not change the QA tier.",
      );
      setQaBusy(false);
    }
  }

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

  const workspaceLabel =
    location.pathname.startsWith("/rescue") && productId === "rescue"
      ? "Rescue Centre"
      : workspaceName;

  return (
    <header className={`app-header app-header--${productId}${showMobileBack ? " app-header--has-mobile-back" : ""}`}>
      <div className="app-header-identity">
        {showMobileBack && (
          <button type="button" className="app-mobile-back" onClick={handleMobileBack} aria-label="Go back">
            <TinyTitansIcon name="back" size={20} aria-hidden="true" />
          </button>
        )}
        <Link
          to={productId === "rescue" ? "/rescue" : "/"}
          className="logo-link"
          aria-label={`${workspaceName} home`}
        >
          <img
            src={logo}
            alt="Tiny Titans Keeper Companion"
            className="tiny-titans-logo"
          />
        </Link>

        <div className="app-brand-lockup" aria-label="Tiny Titans Keeper Companion">
          {!isPersonal && branding.logoUrl && (
            <img
              className="workspace-brand-avatar"
              src={branding.logoUrl}
              alt=""
              aria-hidden="true"
            />
          )}
          <span className="app-brand-name">
            <span className="app-brand-primary">Tiny Titans</span>
            <span className="app-brand-secondary">Keeper Companion</span>
          </span>
          <span className="app-mobile-context">{mobileContextLabel(location.pathname)}</span>
          {!isPersonal && (
            <span className="app-brand-workspace">{workspaceLabel}</span>
          )}
        </div>
      </div>

      {!isPersonal && (
        <Link
          className="workspace-purpose-pill"
          to={productId === "rescue" ? "/rescue" : "/plans"}
          aria-label={`${workspaceProduct.eyebrow} active`}
        >
          <TinyTitansIcon
            name={workspaceIcon(productId)}
            size={20}
            aria-hidden="true"
          />
          <span>
            <strong>{workspaceProduct.eyebrow}</strong>
            <small>Workspace active</small>
          </span>
        </Link>
      )}

      <div className="app-header-actions">
        <LiveWorldClockBadge />
        <WorkspaceSwitcher />

        {isOwner && (
          <div className="header-qa-switcher">
            <button
              type="button"
              className="header-qa-button"
              ref={qaButtonRef}
              onClick={toggleQaMenu}
              aria-expanded={qaOpen}
              aria-haspopup="menu"
              title="Quick QA tier switch"
            >
              <TinyTitansIcon name="testing" size={18} aria-hidden="true" />
              <strong>QA</strong>
            </button>

            {qaOpen && (
              <div className="header-qa-menu" role="menu" style={{ "--tt-dropdown-top": `${qaMenuTop ?? 0}px` } as CSSProperties}>
                <div className="header-qa-heading">
                  <strong>Quick QA Tier</strong>
                  <small>Owner only · swap the effective test tier</small>
                </div>
                <div className="header-qa-grid">
                  {PAID_TIER_ORDER.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      role="menuitem"
                      disabled={qaBusy}
                      onClick={() => void switchQaTier(tier)}
                    >
                      <span>{getPaidTierDefinition(tier).crest}</span>
                      <span>{getPaidTierDefinition(tier).shortLabel}</span>
                    </button>
                  ))}
                </div>
                {qaMessage && (
                  <small className="header-qa-status" role="status">
                    {qaMessage}
                  </small>
                )}
              </div>
            )}
          </div>
        )}

        {!creatorMode && paidAccess && (
          <Link
            className="paid-tier-header-badge"
            to="/plans"
            aria-label={`Your Tiny Titans tier: ${showTesterTier ? displayTierDefinition.name : customerTierDefinition.name}`}
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
            {showTesterTier && (
              <small>TEST · {displayTierDefinition.shortLabel}</small>
            )}
          </Link>
        )}

        <TitanCommandPalette />
      </div>
    </header>
  );
}

export default Header;
