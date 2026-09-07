import { Outlet, useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";
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
import TitanAtAGlance from "../TitanAtAGlance/TitanAtAGlance";
import { EasyNavProvider, useEasyNav } from "../../context/EasyNavContext";
import { SpeciesContextProvider } from "../../context/SpeciesContext";

const speciesAwarePrefixes = [
  "/snakes", "/reptile-room", "/reminders", "/husbandry", "/weights", "/feeding", "/shedding", "/behaviour", "/health",
  "/enclosure-intelligence", "/morph-library", "/calculator", "/breeding", "/keeper-handbook", "/behaviour-observatory",
  "/make-contribution", "/knowledge-base", "/challenge", "/community", "/account", "/become-a-titan", "/educator", "/creator",
];

function LayoutChrome() {
  const location = useLocation();
  const { isEasyNav } = useEasyNav();
  const speciesAware = location.pathname === "/" || speciesAwarePrefixes.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));
  const isSpeciesAwareMorphLibrary = location.pathname === "/morph-library";
  const morphGalleryMatch = location.pathname.match(/^\/morph-library\/([^/]+)\/gallery\/?$/);
  const morphDetailMatch = location.pathname.match(/^\/morph-library\/([^/]+)\/?$/);
  const isEnclosureIntelligence = location.pathname === "/enclosure-intelligence" || location.pathname.startsWith("/enclosure-intelligence/");

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const historyWithRestoration = window.history as History & { scrollRestoration?: "auto" | "manual" };
    if (historyWithRestoration.scrollRestoration) historyWithRestoration.scrollRestoration = "manual";

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll();
      window.requestAnimationFrame(resetScroll);
    });
    const timeout = window.setTimeout(resetScroll, 80);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(timeout);
    };
  }, [location.pathname, location.search, location.hash, location.key]);

  return (
    <div className={`app-shell${isEasyNav ? " easy-nav-active" : ""}`} data-navigation-mode={isEasyNav ? "easy" : "standard"}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header />
      <Navigation />
      <main id="main-content" className="app-main" tabIndex={-1}>
        <div className="app-content">
          {!isEasyNav && <AdaptiveGuideBar />}
          {!isEasyNav && <CreatorTesterInvitationBanner />}
          {!isEasyNav && <CreatorCommandBar />}
          {!isEasyNav && <CreatorStatusBar />}
          {!isEasyNav && <TitanQuickActions />}
          {!isEasyNav && <SupportNotificationCenter />}
          <div className="tt-page-frame">
            {speciesAware && <SpeciesContextBar />}
            <TitanAtAGlance />
            <div className={isEasyNav ? "tt-easy-intelligence" : undefined}>
              <TitanGlobalNextAction />
            </div>
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
  );
}

function Layout() {
  return (
    <SpeciesContextProvider>
      <SpeciesContextRouteSync />
      <EasyNavProvider>
        <LayoutChrome />
      </EasyNavProvider>
    </SpeciesContextProvider>
  );
}

export default Layout;
