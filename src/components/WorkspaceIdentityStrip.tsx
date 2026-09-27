import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
import { useWorkspaceBranding } from "../context/WorkspaceBrandingContext";
import { getWorkspacePresentation, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../services/workspacePresentationService";

export default function WorkspaceIdentityStrip() {
  const branding = useWorkspaceBranding();
  const [presentation, setPresentation] = useState<WorkspacePresentation>(getWorkspacePresentation);
  useEffect(() => subscribeToWorkspacePresentation(setPresentation), []);
  if (presentation.mode !== "work" || presentation.productId === "personal") return null;
  const rescue = presentation.productId === "rescue";
  return <section className={`tt-workspace-identity-strip tt-workspace-identity-strip--${rescue ? "rescue" : "business"}`} aria-label="Active workspace">
    <div className="tt-workspace-identity-main">
      {branding.logoUrl ? <img className="workspace-brand-avatar" src={branding.logoUrl} alt="" aria-hidden="true"/> : <TinyTitansIcon name={rescue ? "health" : "community"} size={23} aria-hidden="true"/>}
      <div><span>{rescue ? "RESCUE CENTRE" : "BUSINESS WORKSPACE"}</span><strong>{branding.name}</strong><small>{branding.tagline || presentation.product.tagline}</small></div>
    </div>
    <div className="tt-workspace-identity-actions"><span className="tt-workspace-identity-status">Workspace active</span><Link to={rescue ? "/rescue" : "/account/partner-landing"}>{rescue ? "Open rescue centre" : "Open organisation"} <TinyTitansIcon name="forward" size={14} /></Link></div>
  </section>;
}
