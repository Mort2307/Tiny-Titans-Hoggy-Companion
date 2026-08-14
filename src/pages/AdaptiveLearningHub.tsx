import { Navigate } from "react-router-dom";

/**
 * Legacy compatibility route.
 * Titans Challenge is now the single learning entry point.
 */
export default function AdaptiveLearningHub() {
  return <Navigate to="/challenge" replace />;
}
