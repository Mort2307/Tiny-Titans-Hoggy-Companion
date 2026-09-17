import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useAuth } from "./useAuth";
import { getWorkspacePresentation, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../services/workspacePresentationService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getPartnerLandingByOwner } from "../services/partnerLandingService";
import type { PartnerLandingProfile } from "../types/partnerLanding";

export type WorkspaceBranding = {
  name: string;
  accentColor: string;
  logoUrl?: string;
  tagline?: string;
  profile: PartnerLandingProfile | null;
};

const DEFAULT_ACCENT = "#62d6c7";
const WorkspaceBrandingContext = createContext<WorkspaceBranding>({ name: "Tiny Titans", accentColor: DEFAULT_ACCENT, profile: null });

function safeAccent(value: string | undefined): string {
  const clean = String(value || "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(clean) ? clean : DEFAULT_ACCENT;
}

function fallbackBranding(presentation: WorkspacePresentation): WorkspaceBranding {
  return { name: presentation.product.id === "personal" ? "Tiny Titans" : presentation.product.name, accentColor: DEFAULT_ACCENT, profile: null };
}

function applyBranding(branding: WorkspaceBranding, presentation: WorkspacePresentation) {
  const root = document.documentElement;
  const active = presentation.mode === "work" && presentation.productId !== "personal";
  root.dataset.ttWorkspaceBrand = active ? "custom" : "default";
  root.style.setProperty("--tt-workspace-accent", active ? branding.accentColor : DEFAULT_ACCENT);
  root.style.setProperty("--tt-workspace-logo", branding.logoUrl ? `url(${JSON.stringify(branding.logoUrl)})` : "none");
  root.style.setProperty("--tt-workspace-name", JSON.stringify(active ? branding.name : "Tiny Titans"));
  root.dataset.ttWorkspaceBrandName = active ? branding.name.slice(0, 80) : "Tiny Titans";
  if (active && branding.name) document.title = `${branding.name} · Tiny Titans Reptile Companion`;
  else document.title = "TinyTitans Reptile Companion";
}

export function WorkspaceBrandingProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [presentation, setPresentation] = useState<WorkspacePresentation>(getWorkspacePresentation);
  const [branding, setBranding] = useState<WorkspaceBranding>(() => fallbackBranding(getWorkspacePresentation()));

  useEffect(() => subscribeToWorkspacePresentation(setPresentation), []);

  useEffect(() => {
    let active = true;
    async function load() {
      const nextPresentation = getWorkspacePresentation();
      if (!user || nextPresentation.mode !== "work" || nextPresentation.productId === "personal") {
        if (active) setBranding(fallbackBranding(nextPresentation));
        return;
      }
      try {
        let profile: PartnerLandingProfile | null = null;
        if (nextPresentation.productId === "rescue") {
          const rescue = await getMyRescueWorkspace().catch(() => ({ organisation: null, role: null }));
          const ownerUid = rescue.organisation?.ownerUid || user.uid;
          profile = await getPartnerLandingByOwner(ownerUid).catch(() => null);
          if (active) setBranding({ name: profile?.brandName || rescue.organisation?.name || "Rescue Centre", accentColor: safeAccent(profile?.accentColor), logoUrl: profile?.logoUrl, tagline: profile?.tagline, profile });
          return;
        }
        profile = await getPartnerLandingByOwner(user.uid).catch(() => null);
        if (active) setBranding({ name: profile?.brandName || nextPresentation.product.name, accentColor: safeAccent(profile?.accentColor), logoUrl: profile?.logoUrl, tagline: profile?.tagline, profile });
      } catch {
        if (active) setBranding(fallbackBranding(nextPresentation));
      }
    }
    void load();
    return () => { active = false; };
  }, [presentation.mode, presentation.productId, user]);

  useEffect(() => { applyBranding(branding, presentation); return () => { document.documentElement.style.removeProperty("--tt-workspace-accent"); document.documentElement.style.removeProperty("--tt-workspace-logo"); document.documentElement.style.removeProperty("--tt-workspace-name"); delete document.documentElement.dataset.ttWorkspaceBrandName; }; }, [branding, presentation]);

  const value = useMemo(() => branding, [branding]);
  return <WorkspaceBrandingContext.Provider value={value}>{children}</WorkspaceBrandingContext.Provider>;
}

export function useWorkspaceBranding(): WorkspaceBranding { return useContext(WorkspaceBrandingContext); }
