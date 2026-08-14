import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./context/AuthContext";
import ExplainThis from "./components/ExplainThis/ExplainThis";

function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <ExplainThis />
    </AuthProvider>
  );
}

export default App;
