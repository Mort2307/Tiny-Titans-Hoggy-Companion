import { Navigate, Outlet, useLocation } from "react-router-dom";
import { lazy, useLayoutEffect } from "react";
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
import PaidTierGate from "../PaidTierGate";
import NotificationOnboarding from "../NotificationOnboarding";
import { EasyNavProvider, useEasyNav } from "../../context/EasyNavContext";
import { SpeciesContextProvider } from "../../context/SpeciesContext";
import WorkspaceIdentityStrip from "../WorkspaceIdentityStrip";
import TitanAtAGlance from "../TitanAtAGlance/TitanAtAGlance";

const SpeciesAwareMorphLibrary = lazy(() => import("../../pages/SpeciesAwareMorphLibrary"));
const SpeciesMorphDetail = lazy(() => import("../../pages/SpeciesMorphDetail"));
const SpeciesMorphGallery = lazy(() => import("../../pages/SpeciesMorphGallery"));
const SpeciesSafeEnclosureIntelligence = lazy(() => import("../../pages/SpeciesSafeEnclosureIntelligence"));
const TitanWeekCommandCentre = lazy(() => import("../../pages/TitanWeekCommandCentre"));
const PaidPlans = lazy(() => import("../../pages/PaidPlans"));
const AccountBilling = lazy(() => import("../../pages/AccountBilling"));
const PaidFeatureWorkspace = lazy(() => import("../../pages/PaidFeatureWorkspace"));
const PaidTimelineFeature = lazy(() => import("../../pages/PaidTimelineFeature"));
const PaidMarketplaceFeature = lazy(() => import("../../pages/PaidMarketplaceFeature"));
const PaidSupportFeature = lazy(() => import("../../pages/PaidSupportFeature"));
const RescueDirectory = lazy(() => import("../../pages/RescueDirectory"));
const RescueDirectoryProfile = lazy(() => import("../../pages/RescueDirectoryProfile"));
const RescueCentre = lazy(() => import("../../pages/RescuePages").then((module) => ({ default: module.RescueCentre })));
const RescueQuickLog = lazy(() => import("../../pages/RescueQuickLog"));

const speciesAwarePrefixes = [
  "/snakes",
  "/reminders",
  "/husbandry",
  "/weights",
  "/feeding",
  "/shedding",
  "/behaviour",
  "/health",
  "/enclosure-intelligence",
  "/morph-library",
  "/calculator",
  "/breeding",
  "/keeper-handbook",
  "/behaviour-observatory",
  "/make-contribution",
  "/knowledge-base",
  "/challenge",
  "/community",
  "/account",
  "/become-a-titan",
  "/educator",
  "/creator",
];

function LayoutChrome() {
  const location = useLocation();
  const { isEasyNav } = useEasyNav();
  const speciesAware =
    location.pathname === "/" ||
    speciesAwarePrefixes.some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`),
    );
  const isSpeciesAwareMorphLibrary = location.pathname === "/morph-library";
  const morphGalleryMatch = location.pathname.match(/^\/morph-library\/([^/]+)\/gallery\/?$/);
  const morphDetailMatch = location.pathname.match(/^\/morph-library\/([^/]+)\/?$/);
  const isEnclosureIntelligence =
    location.pathname === "/enclosure-intelligence" ||
    location.pathname.startsWith("/enclosure-intelligence/");
  const isTitanWeekPage = location.pathname === "/titan-intelligence/feature/this-week";
  const isHomeOrRecordLogPage =
    location.pathname === "/" ||
    ["/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry"].some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`),
    );
  const isPaidPlansPage = location.pathname === "/plans";
  const isBillingPage = location.pathname === "/account/billing";
  const isPaidMarketplacePage = location.pathname === "/paid/marketplace";
  const isPaidSupportPage = location.pathname === "/paid/support";
  const isPaidTimelinePage = location.pathname === "/paid/timeline";
  const isPaidFeaturePage =
    location.pathname === "/paid" ||
    (location.pathname.startsWith("/paid/") &&
      !isPaidMarketplacePage &&
      !isPaidSupportPage &&
      !isPaidTimelinePage);
  const isRescueDirectoryPage =
    location.pathname === "/rescue" && !location.search.includes("manage=");
  const isRescueSetupPage =
    location.pathname === "/rescue" && location.search.includes("manage=1");
  const isRescueDirectoryProfilePage =
    location.pathname === "/rescue" && location.search.includes("manage=directory");
  const isRescueQuickLogPage = location.pathname === "/rescue/log";
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const historyWithRestoration = window.history as History & {
      scrollRestoration?: "auto" | "manual";
    };
    if (historyWithRestoration.scrollRestoration) {
      historyWithRestoration.scrollRestoration = "manual";
    }
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

  const specialPage = isRescueDirectoryPage
    ? <RescueDirectory />
    : isRescueDirectoryProfilePage
      ? <RescueDirectoryProfile />
      : isRescueSetupPage
        ? <RescueCentre />
        : isRescueQuickLogPage
          ? <RescueQuickLog />
          : isPaidPlansPage
            ? <PaidPlans />
            : isBillingPage
              ? <AccountBilling />
              : isPaidMarketplacePage
                ? <PaidMarketplaceFeature />
                : isPaidSupportPage
                  ? <PaidSupportFeature />
                  : isPaidTimelinePage
                    ? <PaidTimelineFeature />
                    : isPaidFeaturePage
                      ? <PaidFeatureWorkspace />
                      : null;

  const outletEntitlement =
    /^\/snakes\/[^/]+\/timeline\/?$/.test(location.pathname)
        ? "advanced_timeline"
        : ["/breeding/readiness", "/breeding/timeline", "/breeding/cycle", "/breeding/production"].some(
            (path) =>
              location.pathname === path || location.pathname.startsWith(`${path}/`),
          )
          ? "breeding_suite"
          : location.pathname === "/morph-library/evidence"
            ? "morph_intelligence"
            : null;
  const outlet = <Outlet />;
  const gatedOutlet = outletEntitlement ? (
    <PaidTierGate entitlement={outletEntitlement}>{outlet}</PaidTierGate>
  ) : (
    outlet
  );
  const pageContent =
    specialPage ??
    (isTitanWeekPage ? (
      <TitanWeekCommandCentre />
    ) : isSpeciesAwareMorphLibrary ? (
      <SpeciesAwareMorphLibrary />
    ) : morphGalleryMatch ? (
      <SpeciesMorphGallery />
    ) : morphDetailMatch ? (
      <SpeciesMorphDetail />
    ) : isEnclosureIntelligence ? (
      <SpeciesSafeEnclosureIntelligence />
    ) : (
      gatedOutlet
    ));

  return (
    <div
      className={`app-shell${isEasyNav ? " easy-nav-active quick-mode-active" : ""}`}
      data-navigation-mode={isEasyNav ? "quick" : "classic"}
      data-quick-mode={isEasyNav ? "true" : "false"}
      data-workspace-surface="false"
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
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
            <WorkspaceIdentityStrip />
            <NotificationOnboarding />
            {speciesAware && <SpeciesContextBar />}
            {isHomeOrRecordLogPage && <TitanAtAGlance />}
            {pageContent}
            <TinyTitansEvidenceNotice />
          </div>
        </div>
      </main>
      <CreatorPaidTierOperations />
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
