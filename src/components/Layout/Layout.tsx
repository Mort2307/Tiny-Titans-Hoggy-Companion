import { Outlet } from "react-router-dom";
import Header from "./Header";
import Navigation from "./Navigation";
import AdaptiveGuideBar from "../AdaptiveGuideBar";

function Layout() {
  return <div className="app-shell"><Header /><Navigation /><main className="app-main"><div className="app-content"><AdaptiveGuideBar /><Outlet /></div></main></div>;
}
export default Layout;
