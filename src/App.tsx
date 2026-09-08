import "./data/expandMorphDatabase";
import "./data/expandGeneticsComboRegistry";
import "./tinyTitansModern.css";
import "./styles/species-layout-hardening.css";
import "./styles/mobileNavigation.css";
import AppRouter from "./routes/AppRouter";
import ExplainThis from "./components/ExplainThis/ExplainThis";
import NotificationOnboarding from "./components/NotificationOnboarding";
import { RouteGuideProvider } from "./context/RouteGuideContext";

function App() {
  return (
    <>
      <RouteGuideProvider>
        <AppRouter />
      </RouteGuideProvider>
      <ExplainThis />
      <NotificationOnboarding />
    </>
  );
}

export default App;
