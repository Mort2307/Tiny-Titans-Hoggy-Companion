import { useEffect } from "react";
import "./data/expandMorphDatabase";
import "./data/expandGeneticsComboRegistry";
import "./tinyTitansModern.css";
import "./styles/species-layout-hardening.css";
import "./styles/mobileNavigation.css";
import "./styles/creatorPaidTierOperations.css";
import "./styles/workspaceShell.css";
import "./styles/ui-viewport-hardening.css";
import AppRouter from "./routes/AppRouter";
import ExplainThis from "./components/ExplainThis/ExplainThis";
import NotificationOnboarding from "./components/NotificationOnboarding";
import { RouteGuideProvider } from "./context/RouteGuideContext";
import { startWorkspacePresentation } from "./services/workspacePresentationService";

function WorkspacePresentationBootstrap() {
  useEffect(() => {
    startWorkspacePresentation();
  }, []);
  return null;
}

function App() {
  return (
    <>
      <WorkspacePresentationBootstrap />
      <RouteGuideProvider>
        <AppRouter />
      </RouteGuideProvider>
      <ExplainThis />
      <NotificationOnboarding />
    </>
  );
}

export default App;
