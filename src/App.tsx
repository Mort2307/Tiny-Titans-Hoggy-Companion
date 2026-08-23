import "./data/expandMorphDatabase";
import "./tinyTitansModern.css";
import "./styles/mobileNavigation.css";
import AppRouter from "./routes/AppRouter";
import ExplainThis from "./components/ExplainThis/ExplainThis";

function App() {
  return (
    <>
      <AppRouter />
      <ExplainThis />
    </>
  );
}

export default App;
