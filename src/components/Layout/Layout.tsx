import { Outlet } from "react-router-dom";

import Header from "./Header";
import Navigation from "./Navigation";

function Layout() {
  return (
    <div className="app-shell">
      <Header />

      <Navigation />

      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;