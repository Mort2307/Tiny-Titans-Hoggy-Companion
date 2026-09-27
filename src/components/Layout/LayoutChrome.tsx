import { lazy } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Navigation from "./Navigation";
import CreatorPaidTierOperations from "../CreatorPaidTierOperations";
import SpeciesContextBar from "../SpeciesContextBar";
import TinyTitansEvidenceNotice from "../TinyTitansEvidenceNotice";
import PaidTierGate from "../PaidTierGate";
import NotificationOnboarding from "../NotificationOnboarding";
import NetworkStatusBanner from "../NetworkStatusBanner";
import WorkspaceIdentityStrip from "../WorkspaceIdentityStrip";
import TitanAtAGlance from "../TitanAtAGlance/TitanAtAGlance";
import { useLayoutScrollRestoration } from "../../hooks/useLayoutScrollRestoration";

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
  "/snakes", "/reminders", "/husbandry", "/weights", "/feeding", "/shedding",
  "/behaviour", "/health", "/enclosure-intelligence", "/morph-library", "/calculator",
  "/breeding", "/keeper-handbook", "/behaviour-observatory", "/make-contribution",
  "/knowledge-base", "/challenge", "/community", "/account", "/become-a-titan",
  "/educator", "/creator",
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function LayoutChrome() {
  const location = useLocation();
  const { pathname, search, hash, key } = location;

  useLayoutScrollRestoration(`${pathname}${search}${hash}${key}`);

  const speciesAware = speciesAwarePrefixes.some((prefix) => matchesPrefix(pathname, prefix));
  const isSpeciesAwareMorphLibrary = pathname === "/morph-library";
  const morphGalleryMatch = pathname.match(/^\/morph-library\/([^/]+)\/gallery\/?$/);
  const morphDetailMatch = pathname.match(/^\/morph-library\/([^/]+)\/?$/);
  const isEnclosureIntelligence =
    pathname === "/enclosure-intelligence" || pathname.startsWith("/enclosure-intelligence/");
  const isTitanWeekPage = pathname === "/titan-intelligence/feature/this-week";
  const isHomeOrRecordLogPage =
    pathname === "/" ||
    ["/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry"].some((prefix) =>
      matchesPrefix(pathname, prefix),
    );
  const isPaidPlansPage = pathname === "/plans";
  const isBillingPage = pathname === "/account/billing";
  const isPaidMarketplacePage = pathname === "/paid/marketplace";
  const isPaidSupportPage = pathname === "/paid/support";
  const isPaidTimelinePage = pathname === "/paid/timeline";
  const isPaidFeaturePage =
    pathname === "/paid" ||
    (pathname.startsWith("/paid/") &&
      !isPaidMarketplacePage &&
      !isPaidSupportPage &&
      !isPaidTimelinePage);
  const isRescueDirectoryPage = pathname === "/rescue" && !search.includes("manage=");
  const isRescueSetupPage = pathname === "/rescue" && search.includes("manage=1");
  const isRescueDirectoryProfilePage = pathname === "/rescue" && search.includes("manage=directory");
  const isRescueQuickLogPage = pathname === "/rescue/log";
  const isRetiredReptileRoom =
    pathname === "/reptile-room" || pathname.startsWith("/reptile-room/");

  if (isRetiredReptileRoom) return <Navigate to="/animals" replace />;

  const specialPage =
    isRescueDirectoryPage ? <RescueDirectory /> :
    isRescueDirectoryProfilePage ? <RescueDirectoryProfile /> :
    isRescueSetupPage ? <RescueCentre /> :
    isRescueQuickLogPage ? <RescueQuickLog /> :
    isPaidPlansPage ? <PaidPlans /> :
    isBillingPage ? <AccountBilling /> :
    isPaidMarketplacePage ? <PaidMarketplaceFeature /> :
    isPaidSupportPage ? <PaidSupportFeature /> :
    isPaidTimelinePage ? <PaidTimelineFeature /> :
    isPaidFeaturePage ? <PaidFeatureWorkspace /> :
    null;

  const outletEntitlement =
    /^\/snakes\/[^/]+\/timeline\/?$/.test(pathname)
      ? "advanced_timeline"
      : ["/breeding/readiness", "/breeding/timeline", "/breeding/cycle", "/breeding/production"].some(
          (path) => pathname === path || pathname.startsWith(`${path}/`),
        )
        ? "breeding_suite"
        : pathname === "/morph-library/evidence"
          ? "morph_intelligence"
          : null;

  const outlet = <Outlet />;
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
      (outletEntitlement ? <PaidTierGate entitlement={outletEntitlement}>{outlet}</PaidTierGate> : outlet)
    ));

  return (
    <div
      className="app-shell easy-nav-active quick-mode-active"
      data-navigation-mode="quick"
      data-quick-mode="true"
      data-workspace-surface="false"
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header />
      <Navigation />
      <main id="main-content" className="app-main" tabIndex={-1}>
        <div className="app-content">
          <div className="tt-page-frame">
            <WorkspaceIdentityStrip />
            <NotificationOnboarding />
            <NetworkStatusBanner />
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

export default LayoutChrome;
