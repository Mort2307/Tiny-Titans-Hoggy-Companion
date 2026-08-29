import "./data/expandMorphDatabase";
import "./tinyTitansModern.css";
import "./styles/mobileNavigation.css";
import AppRouter from "./routes/AppRouter";
import ExplainThis from "./components/ExplainThis/ExplainThis";
import NotificationBridge from "./components/NotificationBridge";

function App() {
  return (
    <>
      <AppRouter />
      <ExplainThis />
      <NotificationBridge />
    </>
  );
}

export default App;
