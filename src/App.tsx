import "./data/expandMorphDatabase";
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
