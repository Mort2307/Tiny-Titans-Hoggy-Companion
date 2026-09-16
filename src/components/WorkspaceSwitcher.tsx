import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getActiveWorkspaceMode, setActiveWorkspaceMode, type WorkspacePresentation, getWorkspacePresentation, subscribeToWorkspacePresentation } from "../services/workspacePresentationService";
import TinyTitansIcon, { type TinyTitansIconName } from "./TinyTitansIcon";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function workspaceIcon(productId: WorkspacePresentation["product"]["id"]): TinyTitansIconName {
  if (productId === "personal") return "reptile";
  if (productId === "rescue") return "health";
  if (productId === "titan_seller") return "marketplace";
  if (productId.startsWith("business_")) return "community";
  return "titan";
}

export default function WorkspaceSwitcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(() => getWorkspacePresentation());
  const [access, setAccess] = useState<PaidAccess | null>(workspace.access);
  const [hasRescue, setHasRescue] = useState(workspace.rescueWorkspace);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToWorkspacePresentation((next) => {
    setWorkspace(next);
    setAccess(next.access);
    setHasRescue(next.rescueWorkspace);
  }), []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let active = true;
    void Promise.all([
      getPaidAccess(uid).catch(() => null),
      getMyRescueWorkspace().catch(() => ({ organisation: null, role: null })),
    ]).then(([nextAccess, rescue]) => {
      if (!active) return;
      setAccess(nextAccess);
      setHasRescue(Boolean(rescue.organisation));
    });
    return () => { active = false; };
  }, [user]);

  if (!user) return null;
  const uid = user.uid;
  const isOwner = user.email?.trim().toLowerCase() === OWNER_EMAIL;
  const workAvailable = hasRescue || Boolean(access && access.effectiveTier !== "free");
  const currentMode = getActiveWorkspaceMode(uid);
  const workPath = hasRescue ? "/rescue" : "/";
  const currentLabel = workspace.product.id === "personal" ? "Personal" : workspace.product.name;

  function switchMode(mode: "personal" | "work", path: string) {
    setOpen(false);
    setActiveWorkspaceMode(uid, mode);
    navigate(path);
  }

  return (
    <div className="workspace-switcher">
      <button type="button" className="workspace-switcher__button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
        <TinyTitansIcon name={workspaceIcon(workspace.product.id)} size={21} aria-hidden="true" />
        <span><strong>{currentLabel}</strong><small>{currentMode === "personal" ? "Personal mode" : "Work mode"}</small></span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && <div className="workspace-switcher__menu" role="menu">
        <button type="button" role="menuitem" onClick={() => switchMode("personal", "/")}><TinyTitansIcon name="reptile" size={20} aria-hidden="true" /><span><strong>Personal Reptile Companion</strong><small>Your private keeper workspace</small></span></button>
        {workAvailable && <button type="button" role="menuitem" onClick={() => switchMode("work", workPath)}><TinyTitansIcon name={hasRescue ? "health" : workspaceIcon(workspace.product.id)} size={20} aria-hidden="true" /><span><strong>{hasRescue ? "Rescue Workspace" : workspace.product.name}</strong><small>Purpose-built work mode</small></span></button>}
        {isOwner && <Link role="menuitem" to="/creator" onClick={() => { setActiveWorkspaceMode(uid, "personal"); setOpen(false); }}><TinyTitansIcon name="creator" size={20} aria-hidden="true" /><span><strong>Creator Centre</strong><small>Owner control &amp; intelligence</small></span></Link>}
        <Link role="menuitem" to="/account" onClick={() => setOpen(false)}><TinyTitansIcon name="account" size={20} aria-hidden="true" /><span><strong>Account</strong><small>Personal account settings</small></span></Link>
      </div>}
    </div>
  );
}
