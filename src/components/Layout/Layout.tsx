import { Outlet } from "react-router-dom";
import Header from "./Header";
import Navigation from "./Navigation";
import AdaptiveGuideBar from "../AdaptiveGuideBar";
import CreatorTesterInvitationBanner from "../CreatorTesterInvitationBanner";

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
          <div className="tt-page-frame">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Layout;
