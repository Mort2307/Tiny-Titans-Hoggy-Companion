import { Outlet } from "react-router-dom";
import Header from "./Header";
import Navigation from "./Navigation";
import AdaptiveGuideBar from "../AdaptiveGuideBar";
import CreatorTesterInvitationBanner from "../CreatorTesterInvitationBanner";
import TitanQuickActions from "../TitanQuickActions";
import CreatorCommandBar from "../CreatorCommandBar";
import CreatorStatusBar from "../CreatorStatusBar";
import SupportNotificationCenter from "../SupportNotificationCenter";

function Layout() {
  return (
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
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Layout;
