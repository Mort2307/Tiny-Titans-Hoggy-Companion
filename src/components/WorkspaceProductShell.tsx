import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getPaidTierDefinition, type PaidTierId } from "../config/paidTiers";
import { workspaceProductForTier, type WorkspaceProduct } from "../config/workspaceProducts";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import WorkspaceDashboard from "./WorkspaceDashboard";
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

const tierCommandCopy: Record<Exclude<PaidTierId, "free">, { label: string; heading: string; description: string; actions: Array<{ title: string; path: string }> }> = {
  titan_pro: { label: "TITAN PRO COMMAND", heading: "A deeper keeper workspace", description: "Your records stay central. Pro brings the intelligence, analysis and advanced keeper workflows around them.", actions: [{ title: "My Animals", path: "/snakes" }, { title: "Intelligence", path: "/titan-intelligence" }, { title: "Records", path: "/weights" }, { title: "Breeding", path: "/breeding" }] },
  titan_seller: { label: "SELLER COMMAND", heading: "Animals in one side. Customers on the other.", description: "Move from animal record to listing, conversation and seller workflow without leaving TinyTitans.", actions: [{ title: "Animals", path: "/snakes" }, { title: "Marketplace", path: "/marketplace" }, { title: "Seller Tools", path: "/paid/marketplace" }, { title: "Messages", path: "/conversations" }] },
  business_starter: { label: "BUSINESS COMMAND", heading: "Operate the business, not just the animals.", description: "Bring animals, breeding, reporting and your public business presence into one workspace.", actions: [{ title: "Animals", path: "/snakes" }, { title: "Marketplace", path: "/marketplace" }, { title: "Breeding", path: "/breeding" }, { title: "Reports", path: "/paid/business-reporting" }] },
  business_plus: { label: "BUSINESS PLUS COMMAND", heading: "A workspace built for shared operations.", description: "Your team, workflows, reporting and customer-facing presence stay connected to the animal records.", actions: [{ title: "Animals", path: "/snakes" }, { title: "Breeding", path: "/breeding" }, { title: "Reports", path: "/paid/business-reporting" }, { title: "Organisation", path: "/account/partner-landing" }] },
  business_advanced: { label: "BUSINESS ADVANCED COMMAND", heading: "The operating layer for a professional reptile business.", description: "Advanced intelligence, business controls and organisation-wide workflows in one environment.", actions: [{ title: "Animals", path: "/snakes" }, { title: "Intelligence", path: "/titan-intelligence" }, { title: "Reports", path: "/paid/business-reporting" }, { title: "API & Tools", path: "/paid" }] },
  rescue: { label: "RESCUE COMMAND", heading: "Rescue operations around the animals, not the paperwork.", description: "Intake, quarantine, care, medical, movement, adoption and animal identity belong together here.", actions: [{ title: "Animal Register", path: "/rescue/animals" }, { title: "New Intake", path: "/rescue/animals?intake=1" }, { title: "Scan / Create QR", path: "/rescue/qr" }, { title: "Team", path: "/rescue/team" }] },
};

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
  const commandCopy = product.id === "personal" ? null : tierCommandCopy[product.id];

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
        <div>
          <span className="workspace-product-eyebrow">{product.eyebrow}</span>
          <strong>{product.name}</strong>
          <small>{product.audience}</small>
        </div>
      </div>
      <div className="workspace-product-tools"><WorkspaceSwitcher /></div>
      <div className="workspace-product-status">
        <span className="workspace-product-tier">{tierDefinition.shortLabel}</span>
        {access?.source === "tester" && <span className="workspace-product-live workspace-product-live--test">CREATOR TEST</span>}
        {access?.source === "trial" && <span className="workspace-product-live">TRIAL</span>}
        {rescueWorkspace && <span className="workspace-product-live">● WORKSPACE ACTIVE</span>}
      </div>
    </header>

    {visibleNav.length > 0 && <nav className="workspace-product-nav" aria-label={`${product.name} navigation`}>
      {visibleNav.map((item) => <Link key={`${item.label}-${item.path}`} className={location.pathname === item.path ? "active" : undefined} to={item.path}>{item.label}</Link>)}
    </nav>}

    {commandCopy && <section className="workspace-command-deck" aria-label={`${product.name} command deck`}>
      <div className="workspace-command-copy">
        <span>{commandCopy.label}</span>
        <h1>{commandCopy.heading}</h1>
        <p>{commandCopy.description}</p>
      </div>
      <div className="workspace-command-actions">
        {commandCopy.actions.map((item) => <Link key={`${item.title}-${item.path}`} to={item.path} className="workspace-command-action"><strong>{item.title}</strong><span>Open →</span></Link>)}
      </div>
    </section>}

    {product.id === "personal" && <section className="workspace-product-intro" aria-label="Workspace identity">
      <div><span>{product.audience}</span><h1>{product.tagline}</h1></div>
      <Link className="workspace-product-upgrade" to="/plans">Plans &amp; workspace options</Link>
    </section>}

    <div className="workspace-product-content">{location.pathname === "/" && product.id !== "personal" && product.id !== "rescue" ? <WorkspaceDashboard productId={product.id as Exclude<WorkspaceProduct["id"], "personal" | "rescue">} /> : children}</div>
  </div>;
}
