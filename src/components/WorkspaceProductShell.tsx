import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getPaidTierDefinition, type PaidTierId } from "../config/paidTiers";
import { workspaceProductForTier, type WorkspaceProduct } from "../config/workspaceProducts";
import "../styles/workspaceProductShell.css";

function rescueActive(workspace: { organisation: { accountStatus?: string; pilotStatus?: string; pilotEndsAt?: string } | null }) {
  const org = workspace.organisation;
  if (!org) return false;
  if (org.accountStatus === "paid_active") return true;
  if (org.pilotStatus !== "pilot_active") return false;
  const expiry = org.pilotEndsAt ? new Date(org.pilotEndsAt).getTime() : 0;
  return Number.isFinite(expiry) && expiry > Date.now();
}

function resolveProduct(access: PaidAccess | null, rescueWorkspace: boolean): WorkspaceProduct {
  if (rescueWorkspace) return workspaceProductForTier("rescue");
  return workspaceProductForTier(access?.effectiveTier ?? "free");
}

export default function WorkspaceProductShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [access, setAccess] = useState<PaidAccess | null>(null);
  const [rescueWorkspace, setRescueWorkspace] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAccess(null);
      setRescueWorkspace(false);
      return () => { active = false; };
    }
    void Promise.all([
      getPaidAccess(user.uid).catch(() => null),
      getMyRescueWorkspace().catch(() => ({ organisation: null, role: null })),
    ]).then(([nextAccess, workspace]) => {
      if (!active) return;
      setAccess(nextAccess);
      setRescueWorkspace(rescueActive(workspace));
    });
    return () => { active = false; };
  }, [user]);

  const product = useMemo(() => resolveProduct(access, rescueWorkspace), [access, rescueWorkspace]);
  const tier: PaidTierId = product.tierId;
  const tierDefinition = getPaidTierDefinition(tier);
  const rescue = product.id === "rescue" && location.pathname.startsWith("/rescue");

  useEffect(() => {
    document.documentElement.dataset.ttTier = tier;
    document.documentElement.dataset.ttWorkspace = product.id;
    document.documentElement.style.setProperty("--tt-workspace-accent", tierDefinition.accent);
    document.documentElement.style.setProperty("--tt-workspace-tier", tier);
    return () => {
      delete document.documentElement.dataset.ttTier;
      delete document.documentElement.dataset.ttWorkspace;
      document.documentElement.style.removeProperty("--tt-workspace-accent");
      document.documentElement.style.removeProperty("--tt-workspace-tier");
    };
  }, [product.id, tier, tierDefinition.accent]);

  const visibleNav = product.nav.filter((item) => !item.path.startsWith("/creator/") && !item.path.startsWith("/creator"));

  return <div className={`workspace-product-shell workspace-product-shell--${product.id}${rescue ? " workspace-product-shell--rescue" : ""}`} data-workspace={product.id} data-tier={tier}>
    <header className="workspace-product-header">
      <div className="workspace-product-brand">
        <span className="workspace-product-icon" aria-hidden="true">{product.icon}</span>
        <div><span className="workspace-product-eyebrow">{product.eyebrow}</span><strong>{product.name}</strong></div>
      </div>
      <div className="workspace-product-status">
        <span className="workspace-product-tier">{tierDefinition.shortLabel}</span>
        {rescueWorkspace && <span className="workspace-product-live">● WORKSPACE ACTIVE</span>}
      </div>
    </header>
    {visibleNav.length > 0 && <nav className="workspace-product-nav" aria-label={`${product.name} navigation`}>
      {visibleNav.map((item) => <Link key={`${item.label}-${item.path}`} className={location.pathname === item.path ? "active" : undefined} to={item.path}>{item.label}</Link>)}
    </nav>}
    <section className="workspace-product-intro" aria-label="Workspace identity">
      <div><span>{product.audience}</span><h1>{product.tagline}</h1></div>
      <Link className="workspace-product-upgrade" to="/plans">Plans &amp; workspace options</Link>
    </section>
    <div className="workspace-product-content">{children}</div>
  </div>;
}
