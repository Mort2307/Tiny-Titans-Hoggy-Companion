import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Navigation from "./Navigation";
import AdaptiveGuideBar from "../AdaptiveGuideBar";
import CreatorTesterInvitationBanner from "../CreatorTesterInvitationBanner";
import TitanQuickActions from "../TitanQuickActions";
import CreatorCommandBar from "../CreatorCommandBar";
import CreatorStatusBar from "../CreatorStatusBar";
import SupportNotificationCenter from "../SupportNotificationCenter";
import SpeciesContextBar from "../SpeciesContextBar";
import SpeciesContextRouteSync from "../SpeciesContextRouteSync";
import TinyTitansEvidenceNotice from "../TinyTitansEvidenceNotice";
import TitanGlobalNextAction from "../TitanIntelligence/TitanGlobalNextAction";
import SpeciesAwareMorphLibrary from "../../pages/SpeciesAwareMorphLibrary";
import SpeciesMorphDetail from "../../pages/SpeciesMorphDetail";
import SpeciesMorphGallery from "../../pages/SpeciesMorphGallery";
import SpeciesSafeEnclosureIntelligence from "../../pages/SpeciesSafeEnclosureIntelligence";
import { SpeciesContextProvider } from "../../context/SpeciesContext";

const speciesAwarePrefixes = [
  "/snakes", "/reptile-room", "/reminders", "/husbandry", "/weights", "/feeding", "/shedding", "/behaviour", "/health",
  "/enclosure-intelligence", "/morph-library", "/calculator", "/breeding", "/keeper-handbook", "/behaviour-observatory",
  "/make-contribution", "/knowledge-base", "/challenge", "/community", "/account", "/become-a-titan", "/educator", "/creator",
];

function Layout() {
  const location = useLocation();
  const speciesAware = location.pathname === "/" || speciesAwarePrefixes.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));
  const isSpeciesAwareMorphLibrary = location.pathname === "/morph-library";
  const morphGalleryMatch = location.pathname.match(/^\/morph-library\/([^/]+)\/gallery\/?$/);
  const morphDetailMatch = location.pathname.match(/^\/morph-library\/([^/]+)\/?$/);
  const isEnclosureIntelligence = location.pathname === "/enclosure-intelligence" || location.pathname.startsWith("/enclosure-intelligence/");

  return (
    <SpeciesContextProvider>
      <SpeciesContextRouteSync />
      <div className="app-shell">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Header />
        <Navigation />
        <main id="main-content" className="app-main" tabIndex={-1}>
          <div className="app-content">
            <AdaptiveGuideBar />
            <CreatorTesterInvitationBanner />
            <CreatorCommandBar />
            <CreatorStatusBar />
            <TitanQuickActions />
            <SupportNotificationCenter />
            <div className="tt-page-frame">
              {speciesAware && <SpeciesContextBar />}
              <TitanGlobalNextAction />
              {isSpeciesAwareMorphLibrary ? <SpeciesAwareMorphLibrary />
                : morphGalleryMatch ? <SpeciesMorphGallery />
                  : morphDetailMatch ? <SpeciesMorphDetail />
                    : isEnclosureIntelligence ? <SpeciesSafeEnclosureIntelligence />
                      : <Outlet />}
              <TinyTitansEvidenceNotice />
            </div>
          </div>
        </main>
      </div>
    </SpeciesContextProvider>
  );
}

export default Layout;
