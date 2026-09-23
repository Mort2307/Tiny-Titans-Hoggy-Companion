import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useWorkspaceBranding } from "../context/WorkspaceBrandingContext";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getWorkspacePresentation, refreshWorkspacePresentation, setActiveWorkspaceMode, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../services/workspacePresentationService";
import TinyTitansIcon, { type TinyTitansIconName } from "./TinyTitansIcon";

function workspaceIcon(product: WorkspacePresentation["product"]): TinyTitansIconName { return product.icon; }

export default function WorkspaceSwitcher() {
  const { user } = useAuth(); const location = useLocation(); const navigate = useNavigate(); const branding = useWorkspaceBranding();
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(() => getWorkspacePresentation()); const [access, setAccess] = useState<PaidAccess | null>(workspace.access); const [hasRescue, setHasRescue] = useState(workspace.rescueWorkspace); const [open, setOpen] = useState(false); const [menuTop, setMenuTop] = useState<number | null>(null); const buttonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => subscribeToWorkspacePresentation((next) => { setWorkspace(next); setAccess(next.access); setHasRescue(next.rescueWorkspace || next.productId === "rescue"); }), []);
  useEffect(() => { if (!user) return; refreshWorkspacePresentation(); let active = true; void Promise.all([getPaidAccess(user.uid).catch(() => null), getMyRescueWorkspace().catch(() => ({ organisation: null, role: null }))]).then(([nextAccess, rescue]) => { if (!active) return; setAccess(nextAccess); setHasRescue(Boolean(rescue.organisation)); }); return () => { active = false; }; }, [user, location.pathname, location.search]);
  const uid = user?.uid ?? "";
 const paidWorkAvailable = Boolean(access && access.effectiveTier !== "free"); const workAvailable = hasRescue || paidWorkAvailable; const currentMode = workspace.mode; const workPath = hasRescue ? "/rescue?manage=1" : "/"; const workName = hasRescue ? branding.name : (access && access.effectiveTier !== "free" ? access.effectiveTier === "titan_seller" ? "Seller Workspace" : access.effectiveTier.startsWith("business_") ? "Business Workspace" : "Pro Workspace" : "Work Workspace"); const workType = hasRescue ? "Rescue Centre" : access && access.effectiveTier !== "free" && access.effectiveTier.startsWith("business_") ? "Business" : access && access.effectiveTier === "titan_seller" ? "Seller" : "Advanced keeper"; const currentLabel = currentMode === "work" && workspace.product.id !== "personal" ? branding.name : "Personal";
  function positionMenu() {
    const button = buttonRef.current;
    if (!button) return;
    setMenuTop(button.getBoundingClientRect().bottom + 8);
  }

  useEffect(() => {
    if (!open) return;
    positionMenu();
    const reposition = () => positionMenu();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  function toggleMenu() {
    setOpen((value) => {
      const next = !value;
      if (!value) window.requestAnimationFrame(positionMenu);
      return next;
    });
  }

  function switchMode(mode: "personal" | "work", path: string) { setOpen(false); setActiveWorkspaceMode(uid, mode); navigate(path); }
  if (!user) return null;
  return <div className="workspace-switcher"><button ref={buttonRef} type="button" className="workspace-switcher__button" onClick={toggleMenu} aria-expanded={open} aria-haspopup="menu"><>{currentMode === "work" && branding.logoUrl ? <img className="workspace-brand-avatar" src={branding.logoUrl} alt="" aria-hidden="true"/> : <TinyTitansIcon name={workspaceIcon(workspace.product)} size={20} aria-hidden="true"/>}</><span><strong>{currentLabel}</strong><small>{currentMode === "personal" ? "Personal profile" : workType}</small></span><span aria-hidden="true" className="workspace-switcher__chevron" /></button>{open && <div className="workspace-switcher__menu" role="menu" style={{ "--tt-dropdown-top": `${menuTop ?? 0}px` } as CSSProperties}><button type="button" role="menuitem" onClick={() => switchMode("personal", "/")}><TinyTitansIcon name="animals" size={20} aria-hidden="true"/><span><strong>Personal profile</strong><small>My animals, records and personal intelligence</small></span></button>{workAvailable && <button type="button" role="menuitem" onClick={() => switchMode("work", workPath)}>{hasRescue && branding.logoUrl ? <img className="workspace-brand-avatar" src={branding.logoUrl} alt="" aria-hidden="true"/> : <TinyTitansIcon name={workspaceIcon(workspace.product)} size={20} aria-hidden="true"/>}<span><strong>{hasRescue ? branding.name : workName}</strong><small>{workType} workspace</small></span></button>}<Link role="menuitem" to="/plans" onClick={() => setOpen(false)}><TinyTitansIcon name="titan" size={20} aria-hidden="true"/><span><strong>Plans &amp; Features</strong><small>Manage workspace access</small></span></Link><Link role="menuitem" to="/account" onClick={() => setOpen(false)}><TinyTitansIcon name="account" size={20} aria-hidden="true"/><span><strong>Account</strong><small>Personal account settings</small></span></Link></div>}</div>;
}
