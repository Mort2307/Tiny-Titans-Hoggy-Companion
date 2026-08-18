import "./data/expandMorphDatabase";
import "./tinyTitansModern.css";
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
