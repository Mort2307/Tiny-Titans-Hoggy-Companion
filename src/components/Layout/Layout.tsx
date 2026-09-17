import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";
import Header from "./Header";
import Navigation from "./Navigation";
import AdaptiveGuideBar from "../AdaptiveGuideBar";
import CreatorTesterInvitationBanner from "../CreatorTesterInvitationBanner";
import TitanQuickActions from "../TitanQuickActions";
import CreatorCommandBar from "../CreatorCommandBar";
import CreatorStatusBar from "../CreatorStatusBar";
import SupportNotificationCenter from "../SupportNotificationCenter";
import CreatorPaidTierOperations from "../CreatorPaidTierOperations";
import SpeciesContextBar from "../SpeciesContextBar";
import SpeciesContextRouteSync from "../SpeciesContextRouteSync";
import TinyTitansEvidenceNotice from "../TinyTitansEvidenceNotice";
import SpeciesAwareMorphLibrary from "../../pages/SpeciesAwareMorphLibrary";
import SpeciesMorphDetail from "../../pages/SpeciesMorphDetail";
import SpeciesMorphGallery from "../../pages/SpeciesMorphGallery";
import SpeciesSafeEnclosureIntelligence from "../../pages/SpeciesSafeEnclosureIntelligence";
import TitanWeekCommandCentre from "../../pages/TitanWeekCommandCentre";
import PaidPlans from "../../pages/PaidPlans";
import AccountBilling from "../../pages/AccountBilling";
import PaidFeatureWorkspace from "../../pages/PaidFeatureWorkspace";
import PaidTimelineFeature from "../../pages/PaidTimelineFeature";
import PaidMarketplaceFeature from "../../pages/PaidMarketplaceFeature";
import PaidSupportFeature from "../../pages/PaidSupportFeature";
import PaidTierGate from "../PaidTierGate";
import RescueDirectory from "../../pages/RescueDirectory";
import RescueDirectoryProfile from "../../pages/RescueDirectoryProfile";
import { RescueCentre } from "../../pages/RescuePages";
import { EasyNavProvider, useEasyNav } from "../../context/EasyNavContext";
import { SpeciesContextProvider } from "../../context/SpeciesContext";
import WorkspaceIdentityStrip from "../WorkspaceIdentityStrip";

const speciesAwarePrefixes = [
  "/snakes", "/reminders", "/husbandry", "/weights", "/feeding", "/shedding", "/behaviour", "/health",
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
  const isTitanWeekPage = location.pathname === "/titan-intelligence/feature/this-week";
  const isPaidPlansPage = location.pathname === "/plans";
  const isBillingPage = location.pathname === "/account/billing";
  const isPaidMarketplacePage = location.pathname === "/paid/marketplace";
  const isPaidSupportPage = location.pathname === "/paid/support";
  const isPaidTimelinePage = location.pathname === "/paid/timeline";
  const isPaidFeaturePage = location.pathname === "/paid" || (location.pathname.startsWith("/paid/") && !isPaidMarketplacePage && !isPaidSupportPage && !isPaidTimelinePage);
  const isRescueDirectoryPage = location.pathname === "/rescue" && !location.search.includes("manage=");
  const isRescueSetupPage = location.pathname === "/rescue" && location.search.includes("manage=1");
  const isRescueDirectoryProfilePage = location.pathname === "/rescue" && location.search.includes("manage=directory");
  const isRetiredReptileRoom = location.pathname === "/reptile-room" || location.pathname.startsWith("/reptile-room/");

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const historyWithRestoration = window.history as History & { scrollRestoration?: "auto" | "manual" };
    if (historyWithRestoration.scrollRestoration) historyWithRestoration.scrollRestoration = "manual";
    const resetScroll = () => { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; };
    resetScroll();
    const firstFrame = window.requestAnimationFrame(() => { resetScroll(); window.requestAnimationFrame(resetScroll); });
    const timeout = window.setTimeout(resetScroll, 80);
    return () => { window.cancelAnimationFrame(firstFrame); window.clearTimeout(timeout); };
  }, [location.pathname, location.search, location.hash, location.key]);

  if (isRetiredReptileRoom) return <Navigate to="/snakes" replace />;

  const specialPage = isRescueDirectoryPage ? <RescueDirectory /> : isRescueDirectoryProfilePage ? <RescueDirectoryProfile /> : isRescueSetupPage ? <RescueCentre /> : isPaidPlansPage ? <PaidPlans /> : isBillingPage ? <AccountBilling /> : isPaidMarketplacePage ? <PaidMarketplaceFeature /> : isPaidSupportPage ? <PaidSupportFeature /> : isPaidTimelinePage ? <PaidTimelineFeature /> : isPaidFeaturePage ? <PaidFeatureWorkspace /> : null;
  const outletEntitlement = location.pathname === "/reminders" || location.pathname.startsWith("/reminders/") ? "smart_reminders"
    : /^\/snakes\/[^/]+\/timeline\/?$/.test(location.pathname) ? "advanced_timeline"
      : ["/breeding/readiness", "/breeding/timeline", "/breeding/cycle", "/breeding/production"].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`)) ? "breeding_suite"
        : location.pathname === "/morph-library/evidence" ? "morph_intelligence" : null;
  const outlet = <Outlet />;
  const gatedOutlet = outletEntitlement ? <PaidTierGate entitlement={outletEntitlement}>{outlet}</PaidTierGate> : outlet;
  const pageContent = specialPage ?? (isTitanWeekPage ? <TitanWeekCommandCentre/> : isSpeciesAwareMorphLibrary ? <SpeciesAwareMorphLibrary/> : morphGalleryMatch ? <SpeciesMorphGallery/> : morphDetailMatch ? <SpeciesMorphDetail/> : isEnclosureIntelligence ? <SpeciesSafeEnclosureIntelligence/> : gatedOutlet);

  return <div className={`app-shell${isEasyNav ? " easy-nav-active quick-mode-active" : ""}`} data-navigation-mode={isEasyNav ? "quick" : "classic"} data-quick-mode={isEasyNav ? "true" : "false"} data-workspace-surface="false">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <Header/>
    <Navigation/>
    <main id="main-content" className="app-main" tabIndex={-1}><div className="app-content">
      {!isEasyNav && <AdaptiveGuideBar/>}{!isEasyNav && <CreatorTesterInvitationBanner/>}{!isEasyNav && <CreatorCommandBar/>}{!isEasyNav && <CreatorStatusBar/>}{!isEasyNav && <TitanQuickActions/>}{!isEasyNav && <SupportNotificationCenter/>}
      <div className="tt-page-frame"><WorkspaceIdentityStrip/>{speciesAware && <SpeciesContextBar/>}
        {pageContent}
        <TinyTitansEvidenceNotice/>
      </div>
    </main>
    <CreatorPaidTierOperations />
  </div>;
}

function Layout() { return <SpeciesContextProvider><SpeciesContextRouteSync/><EasyNavProvider><LayoutChrome/></EasyNavProvider></SpeciesContextProvider>; }
export default Layout;
