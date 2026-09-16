import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getActiveWorkspaceMode, setActiveWorkspaceMode, type WorkspacePresentation, getWorkspacePresentation, subscribeToWorkspacePresentation } from "../services/workspacePresentationService";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

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
  }, [user]);

  if (!user) return null;
  const isOwner = user.email?.trim().toLowerCase() === OWNER_EMAIL;
  const workAvailable = hasRescue || Boolean(access && access.effectiveTier !== "free");
  const currentMode = getActiveWorkspaceMode(user.uid);
  const workPath = hasRescue ? "/rescue" : "/";
  const currentLabel = workspace.product.id === "personal" ? "Personal" : workspace.product.name;

  function switchMode(mode: "personal" | "work", path: string) {
    setOpen(false);
    setActiveWorkspaceMode(user.uid, mode);
    navigate(path);
  }

  return (
    <div className="workspace-switcher">
      <button type="button" className="workspace-switcher__button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
        <span aria-hidden="true">{workspace.product.icon}</span>
        <span><strong>{currentLabel}</strong><small>{currentMode === "personal" ? "Personal mode" : "Work mode"}</small></span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && <div className="workspace-switcher__menu" role="menu">
        <button type="button" role="menuitem" onClick={() => switchMode("personal", "/")}><span>🐍</span><span><strong>Personal Reptile Companion</strong><small>Your private keeper workspace</small></span></button>
        {workAvailable && <button type="button" role="menuitem" onClick={() => switchMode("work", workPath)}><span>{hasRescue ? "🚑" : workspace.product.icon}</span><span><strong>{hasRescue ? "Rescue Workspace" : workspace.product.name}</strong><small>Purpose-built work mode</small></span></button>}
        {isOwner && <Link role="menuitem" to="/creator" onClick={() => { setActiveWorkspaceMode(user.uid, "personal"); setOpen(false); }}><span>🧠</span><span><strong>Creator Centre</strong><small>Owner control &amp; intelligence</small></span></Link>}
        <Link role="menuitem" to="/account" onClick={() => setOpen(false)}><span>⚙️</span><span><strong>Account</strong><small>Personal account settings</small></span></Link>
      </div>}
    </div>
  );
}
