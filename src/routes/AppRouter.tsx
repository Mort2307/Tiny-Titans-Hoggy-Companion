import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import Login from "../pages/Login";
import AccountSetup from "../pages/AccountSetup";
import PartnerLanding from "../pages/PartnerLanding";
import DeleteAccountRequest from "../pages/DeleteAccountRequest";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import RescuePublicProfile from "../pages/RescuePublicProfile";
import RescueAnimalRoute from "../pages/RescueAnimalRoute";
import SpeciesExplorer from "../pages/SpeciesExplorer";
import UniversalSpeciesProfile from "../pages/UniversalSpeciesProfile";
import Marketplace from "../pages/Marketplace";
import CreatorTesterInvitation from "../components/CreatorTesterInvitation";
import DataPrivacyConsentModal, { CONSENT_VERSION } from "../components/DataPrivacyConsentModal";
import { useAuth } from "../context/useAuth";
import { UnitProvider } from "../context/UnitContext";
import { getPrivacyPreferences, PRIVACY_CONSENT_VERSION } from "../services/privacyService";
import AuthenticatedRoutes, { RouteLoadingFallback } from "./AuthenticatedRoutes";

function hasLocalPrivacyConsent(userId: string) {
  try {
    return window.localStorage.getItem(`tinytitans:privacy-consent:${userId}`) === CONSENT_VERSION;
  } catch {
    return false;
  }
}

function AppRouterGate() {
  const location = useLocation();
  const { user, profile, loading, profileLoading } = useAuth();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [privacyConsentVersion, setPrivacyConsentVersion] = useState<string | null>(null);

  const currentDestination = `${location.pathname}${location.search}`;
  const loginRedirect = `/login?redirect=${encodeURIComponent(currentDestination)}`;
  const setupRedirect = `/account-setup?redirect=${encodeURIComponent(currentDestination)}`;
  const rescuePublicProfileRoute = <Route path="/rescue/public/:organisationId" element={<RescuePublicProfile />} />;

  useEffect(() => {
    let active = true;
    setPrivacyConsentVersion(null);

    if (!user) {
      return () => {
        active = false;
      };
    }

    void getPrivacyPreferences(user.uid)
      .then((preferences) => {
        if (!active) return;
        setPrivacyConsentVersion(
          preferences.consentVersion ||
          profile?.privacyConsentVersion ||
          profile?.dataCollectionPreferences?.consentVersion ||
          "",
        );
      })
      .catch(() => {
        if (!active) return;
        setPrivacyConsentVersion(
          profile?.privacyConsentVersion ||
          profile?.dataCollectionPreferences?.consentVersion ||
          "",
        );
      });

    return () => {
      active = false;
    };
  }, [user, profile?.privacyConsentVersion, profile?.dataCollectionPreferences?.consentVersion]);

  if (location.pathname.startsWith("/partner/")) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/partner/:slug" element={<PartnerLanding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (location.pathname === "/delete-account") {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/delete-account" element={<DeleteAccountRequest />} />
          <Route path="*" element={<Navigate to="/delete-account" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (location.pathname === "/privacy") {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="*" element={<Navigate to="/privacy" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (loading || profileLoading) {
    return (
      <div className="page-container">
        <div className="welcome-card">
          <h1>Loading Tiny Titans...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/rescue/public/:organisationId" element={<RescuePublicProfile />} />
          <Route path="/species" element={<SpeciesExplorer />} />
          <Route path="/species/:id" element={<UniversalSpeciesProfile />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/rescue/animals/:animalId" element={<RescueAnimalRoute />} />
          <Route path="*" element={<Navigate to={loginRedirect} replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!profile || !profile.setupComplete) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/account-setup" element={<AccountSetup />} />
          <Route path="/rescue/public/:organisationId" element={<RescuePublicProfile />} />
          <Route path="/species" element={<SpeciesExplorer />} />
          <Route path="/species/:id" element={<UniversalSpeciesProfile />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/rescue/animals/:animalId" element={<RescueAnimalRoute />} />
          <Route path="*" element={<Navigate to={setupRedirect} replace />} />
        </Routes>
      </Suspense>
    );
  }

  const consentAlreadyStored =
    privacyConsentVersion === PRIVACY_CONSENT_VERSION ||
    profile.privacyConsentVersion === CONSENT_VERSION ||
    profile.dataCollectionPreferences?.consentVersion === CONSENT_VERSION ||
    hasLocalPrivacyConsent(user.uid);

  const consentRequired =
    privacyConsentVersion !== null &&
    !consentAccepted &&
    !consentAlreadyStored;

  return (
    <UnitProvider>
      <AuthenticatedRoutes />
      {consentRequired && (
        <DataPrivacyConsentModal
          onAccepted={() => {
            setConsentAccepted(true);
            setPrivacyConsentVersion(PRIVACY_CONSENT_VERSION);
          }}
        />
      )}
      {!consentRequired && <CreatorTesterInvitation />}
    </UnitProvider>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppRouterGate />
    </BrowserRouter>
  );
}
