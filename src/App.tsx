import "./data/expandMorphDatabase";
import "./tinyTitansModern.css";
import "./styles/mobileNavigation.css";
import AppRouter from "./routes/AppRouter";
import ExplainThis from "./components/ExplainThis/ExplainThis";
import MobileNavigation from "./components/MobileNavigation";

function App() {
  return (
    <>
      <MobileNavigation />
      <AppRouter />
      <ExplainThis />
    </>
  );
}

export default App;
