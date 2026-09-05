import "./data/expandMorphDatabase";
import "./data/expandGeneticsComboRegistry";
import "./tinyTitansModern.css";
import "./styles/species-layout-hardening.css";
import "./styles/mobileNavigation.css";
import AppRouter from "./routes/AppRouter";
import ExplainThis from "./components/ExplainThis/ExplainThis";
import NotificationBridge from "./components/NotificationBridge";
import NotificationOnboarding from "./components/NotificationOnboarding";

function App() {
  return (
    <>
      <AppRouter />
      <ExplainThis />
      <NotificationBridge />
      <NotificationOnboarding />
    </>
  );
}

export default App;
