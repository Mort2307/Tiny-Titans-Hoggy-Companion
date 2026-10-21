import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./styles/tiny-titans-modern.css";
import "./styles/tiny-titans-design-system.css";
import "./styles/tiny-titans-home-overrides.css";
import "./styles/selector-scroll.css";
import "./styles/husbandry-equipment.css";
import "./styles/tiny-titans-professional-ui.css";
import "./styles/tiny-titans-professional-hardening.css";
import "./styles/tiny-titans-final-polish.css";
import "./styles/tiny-titans-family-professional.css";
import "./styles/tiny-titans-page-consistency.css";
import "./styles/tiny-titans-premium-overhaul.css";
import "./styles/tiny-titans-product-polish.css";
import "./styles/tiny-titans-creator-command.css";
import "./styles/tiny-titans-creator-status.css";
import "./styles/tiny-titans-command.css";
import "./styles/tiny-titans-app-polish-v3.css";
import "./styles/tiny-titans-layout-final.css";
import "./styles/tiny-titans-final-formatting.css";
import "./styles/tiny-titans-enclosure-intelligence-polish.css";
import "./styles/tiny-titans-enclosure-formatting.css";
import "./styles/tiny-titans-brand-theme.css";
import "./styles/tiny-titans-brand-glow.css";
import "./styles/tiny-titans-intelligence-growth.css";
import "./styles/workspace-identity.css";
import "./styles/contributor-thank-you.css";
import "./styles/tiny-titans-paid-room-retirement.css";
import "./styles/mobile-layout-hardening.css";
import "./styles/mobile-product-system.css";
import "./styles/mobile-experience-v2.css";

import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ReleaseCheckGuard from "./components/ReleaseCheckGuard";
import DateDisplayNormalizer from "./components/DateDisplayNormalizer";
import DeferredRuntimeServices from "./components/DeferredRuntimeServices";
import SelectorGrabScrollManager from "./components/SelectorGrabScrollManager";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceBrandingProvider } from "./context/WorkspaceBrandingContext";
import { WorldTimeProvider } from "./context/WorldTimeContext";
import { CopyQualityGuard } from "./utils/copyQuality";
import { clearStaleDevPwaState, initializePwaUpdateService } from "./services/pwaUpdateService";

initializePwaUpdateService();
void clearStaleDevPwaState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <WorkspaceBrandingProvider>
          <WorldTimeProvider>
            <SelectorGrabScrollManager />
            <DateDisplayNormalizer />
            <CopyQualityGuard />
            <ReleaseCheckGuard>
              <DeferredRuntimeServices />
              <App />
            </ReleaseCheckGuard>
          </WorldTimeProvider>
        </WorkspaceBrandingProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
