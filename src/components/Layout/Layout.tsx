import { SpeciesContextProvider } from "../../context/SpeciesContext";
import SpeciesContextRouteSync from "../SpeciesContextRouteSync";
import { EasyNavProvider } from "../../context/EasyNavContext";
import LayoutChrome from "./LayoutChrome";

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
