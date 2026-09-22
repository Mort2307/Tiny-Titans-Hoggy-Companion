import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useWorkspaceBranding } from "../context/WorkspaceBrandingContext";
import {
  ensureCreatorClaim,
  getPaidAccess,
  setPaidTesterOverride,
  type PaidAccess,
} from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import {
  getWorkspacePresentation,
  refreshWorkspacePresentation,
  setActiveWorkspaceMode,
  subscribeToWorkspacePresentation,
  type WorkspacePresentation,
} from "../services/workspacePresentationService";
import {
  getPaidTierDefinition,
  PAID_TIER_ORDER,
  type PaidTierId,
} from "../config/paidTiers";
import TinyTitansIcon, { type TinyTitansIconName } from "./TinyTitansIcon";
import HeaderOverlayPortal from "./HeaderOverlayPortal";

function workspaceIcon(productId: WorkspacePresentation["product"]["id"]): TinyTitansIconName {
  if (productId === "personal") return "reptile";
  if (productId === "rescue") return "health";
  if (productId === "titan_seller") return "marketplace";
  if (productId.startsWith("business_")) return "community";
  return "titan";
}

function useMobileHeaderMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

type WorkspaceSwitcherProps = {
  isOwner?: boolean;
};

type DeveloperQaControlsProps = {
  qaBusy: boolean;
  qaMessage: string;
  onSwitchQaTier: (tier: PaidTierId) => void;
};

function DeveloperQaControls({ qaBusy, qaMessage, onSwitchQaTier }: DeveloperQaControlsProps) {
  return (
    <>
      <div className="workspace-switcher__qa-heading">
        <strong>Developer QA</strong>
        <small>Owner only · change the effective test tier</small>
      </div>
      <div className="workspace-switcher__qa-grid">
        {PAID_TIER_ORDER.map((tier) => (
          <button
            key={tier}
            type="button"
            disabled={qaBusy}
            onClick={() => onSwitchQaTier(tier)}
          >
            <span aria-hidden="true">{getPaidTierDefinition(tier).crest}</span>
            <span>{getPaidTierDefinition(tier).shortLabel}</span>
          </button>
        ))}
      </div>
      {qaMessage && (
        <small className="workspace-switcher__qa-status" role="status">{qaMessage}</small>
      )}
    </>
  );
}

export default function WorkspaceSwitcher({ isOwner = false }: WorkspaceSwitcherProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const branding = useWorkspaceBranding();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const [workspace, setWorkspace] = useState<WorkspacePresentation>(() => getWorkspacePresentation());
  const [access, setAccess] = useState<PaidAccess | null>(workspace.access);
  const [hasRescue, setHasRescue] = useState(workspace.rescueWorkspace);
  const [open, setOpen] = useState(false);
  const isMobile = useMobileHeaderMode();
  const [menuPosition, setMenuPosition] = useState({ top: 72, right: 16 });
  const [qaBusy, setQaBusy] = useState(false);
  const [qaMessage, setQaMessage] = useState("");

  useEffect(
    () => subscribeToWorkspacePresentation((next) => {
      setWorkspace(next);
      setAccess(next.access);
      setHasRescue(next.rescueWorkspace || next.productId === "rescue");
    }),
    [],
  );

  useEffect(() => {
    if (!user) return;

    refreshWorkspacePresentation();
    let active = true;

    void Promise.all([
      getPaidAccess(user.uid).catch(() => null),
      getMyRescueWorkspace().catch(() => ({ organisation: null, role: null })),
    ]).then(([nextAccess, rescue]) => {
      if (!active) return;
      setAccess(nextAccess);
      setHasRescue(Boolean(rescue.organisation));
    });

    return () => { active = false; };
  }, [user, location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || overlayRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({
        top: Math.round(rect.bottom + 8),
        right: Math.max(12, Math.round(window.innerWidth - rect.right)),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    setOpen(false);
    setQaMessage("");
  }, [location.pathname, location.search]);

  const workspaceState = useMemo(() => {
    const paidWorkAvailable = Boolean(access && access.effectiveTier !== "free");
    const workAvailable = hasRescue || paidWorkAvailable;
    const currentMode = workspace.mode;
    const product = workspace.product;
    const workPath = hasRescue ? "/rescue?manage=1" : "/";
    const workName = hasRescue
      ? branding.name || "Rescue Centre"
      : access && access.effectiveTier !== "free"
        ? access.effectiveTier === "titan_seller"
          ? "Seller Workspace"
          : access.effectiveTier.startsWith("business_")
            ? "Business Workspace"
            : "Pro Workspace"
        : "Work Workspace";
    const workType = hasRescue
      ? "Rescue Centre"
      : access && access.effectiveTier !== "free" && access.effectiveTier.startsWith("business_")
        ? "Business"
        : access && access.effectiveTier === "titan_seller"
          ? "Seller"
          : "Advanced keeper";

    return { workAvailable, currentMode, product, workPath, workName, workType };
  }, [access, branding.name, hasRescue, workspace]);

  if (!user) return null;

  const uid = user.uid;
  const { currentMode, product, workPath, workName, workType, workAvailable } = workspaceState;
  const currentLabel = currentMode === "work" && product.id !== "personal"
    ? branding.name || workName
    : "Personal";

  function switchMode(mode: "personal" | "work", path: string) {
    setOpen(false);
    setQaMessage("");
    setActiveWorkspaceMode(uid, mode);
    navigate(path);
  }

  async function switchQaTier(tier: PaidTierId) {
    if (!isOwner || qaBusy) return;
    setQaBusy(true);
    setQaMessage("");

    try {
      await ensureCreatorClaim();
      await setPaidTesterOverride(uid, tier !== "free", tier, "silent", null);
      setActiveWorkspaceMode(uid, tier === "free" ? "personal" : "work");
      refreshWorkspacePresentation();
      setQaMessage(getPaidTierDefinition(tier).name + " QA active");
      window.setTimeout(() => window.location.reload(), 150);
    } catch (error) {
      setQaMessage(error instanceof Error ? error.message : "Could not change the QA tier.");
      setQaBusy(false);
    }
  }

  const overlayStyle = {
    "--tt-workspace-top": menuPosition.top + "px",
    "--tt-workspace-right": menuPosition.right + "px",
  } as CSSProperties;

  return (
    <div className="workspace-switcher">
      <button
        ref={triggerRef}
        type="button"
        className="workspace-switcher__button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={"Current workspace: " + currentLabel + ". Open workspace menu."}
      >
        {currentMode === "work" && branding.logoUrl ? (
          <img className="workspace-brand-avatar" src={branding.logoUrl} alt="" aria-hidden="true" />
        ) : (
          <TinyTitansIcon
            name={workspaceIcon(currentMode === "work" ? product.id : "personal")}
            size={20}
            aria-hidden="true"
          />
        )}
        <span>
          <strong>{currentLabel}</strong>
          <small>{currentMode === "personal" ? "Personal profile" : workType}</small>
        </span>
        <span aria-hidden="true">⌄</span>
      </button>

      {open && (
        <HeaderOverlayPortal>
          <div ref={overlayRef} className="tt-header-overlay-root">
            <div className="workspace-switcher__desktop-layer" aria-hidden={isMobile}>
              <div className="workspace-switcher__menu" role="menu" style={!isMobile ? overlayStyle : undefined}>
                <button type="button" role="menuitem" onClick={() => switchMode("personal", "/")}>
                  <TinyTitansIcon name="reptile" size={20} aria-hidden="true" />
                  <span><strong>Personal profile</strong><small>My reptiles, records and personal intelligence</small></span>
                </button>

                {workAvailable && (
                  <button type="button" role="menuitem" onClick={() => switchMode("work", workPath)}>
                    {hasRescue && branding.logoUrl ? (
                      <img className="workspace-brand-avatar" src={branding.logoUrl} alt="" aria-hidden="true" />
                    ) : (
                      <TinyTitansIcon name={workspaceIcon(product.id)} size={20} aria-hidden="true" />
                    )}
                    <span>
                      <strong>{hasRescue ? branding.name || "Rescue Centre" : workName}</strong>
                      <small>{workType} workspace</small>
                    </span>
                  </button>
                )}

                <Link role="menuitem" to="/plans" onClick={() => setOpen(false)}>
                  <TinyTitansIcon name="titan" size={20} aria-hidden="true" />
                  <span><strong>Plans &amp; Features</strong><small>Manage workspace access</small></span>
                </Link>

                <Link role="menuitem" to="/account" onClick={() => setOpen(false)}>
                  <TinyTitansIcon name="account" size={20} aria-hidden="true" />
                  <span><strong>Account</strong><small>Personal account settings</small></span>
                </Link>

                {isOwner && (
                  <div className="workspace-switcher__qa" aria-label="Developer QA">
                    <DeveloperQaControls qaBusy={qaBusy} qaMessage={qaMessage} onSwitchQaTier={(tier) => void switchQaTier(tier)} />
                  </div>
                )}
              </div>
            </div>

            <div className="workspace-switcher__mobile-layer">
              <button type="button" className="tt-header-overlay-backdrop" aria-label="Close workspace menu" onClick={() => setOpen(false)} />
              <section className="workspace-switcher__mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="tt-workspace-sheet-title">
                <div className="workspace-switcher__mobile-heading">
                  <div>
                    <span className="workspace-switcher__mobile-eyebrow">TINY TITANS</span>
                    <h2 id="tt-workspace-sheet-title">Workspace</h2>
                  </div>
                  <button type="button" className="workspace-switcher__mobile-close" onClick={() => setOpen(false)} aria-label="Close workspace menu">×</button>
                </div>

                <div className="workspace-switcher__mobile-options">
                  <button type="button" className={currentMode === "personal" ? "is-active" : ""} onClick={() => switchMode("personal", "/")}>
                    <span className="workspace-switcher__mobile-icon"><TinyTitansIcon name="reptile" size={20} aria-hidden="true" /></span>
                    <span><strong>Personal profile</strong><small>My reptiles, records and personal intelligence</small></span>
                    {currentMode === "personal" && <span className="workspace-switcher__mobile-check">✓</span>}
                  </button>

                  {workAvailable && (
                    <button type="button" className={currentMode === "work" ? "is-active" : ""} onClick={() => switchMode("work", workPath)}>
                      <span className="workspace-switcher__mobile-icon">
                        {hasRescue && branding.logoUrl ? (
                          <img className="workspace-brand-avatar" src={branding.logoUrl} alt="" aria-hidden="true" />
                        ) : (
                          <TinyTitansIcon name={workspaceIcon(product.id)} size={20} aria-hidden="true" />
                        )}
                      </span>
                      <span><strong>{hasRescue ? branding.name || "Rescue Centre" : workName}</strong><small>{workType} workspace</small></span>
                      {currentMode === "work" && <span className="workspace-switcher__mobile-check">✓</span>}
                    </button>
                  )}
                </div>

                <div className="workspace-switcher__mobile-links">
                  <Link to="/plans" onClick={() => setOpen(false)}>
                    <TinyTitansIcon name="titan" size={19} aria-hidden="true" />
                    <span><strong>Plans &amp; Features</strong><small>Manage workspace access</small></span>
                    <span aria-hidden="true">›</span>
                  </Link>
                  <Link to="/account" onClick={() => setOpen(false)}>
                    <TinyTitansIcon name="account" size={19} aria-hidden="true" />
                    <span><strong>Account</strong><small>Personal account settings</small></span>
                    <span aria-hidden="true">›</span>
                  </Link>
                </div>

                {isOwner && (
                  <div className="workspace-switcher__mobile-qa">
                    <DeveloperQaControls qaBusy={qaBusy} qaMessage={qaMessage} onSwitchQaTier={(tier) => void switchQaTier(tier)} />
                  </div>
                )}
              </section>
            </div>
          </div>
        </HeaderOverlayPortal>
      )}
    </div>
  );
}