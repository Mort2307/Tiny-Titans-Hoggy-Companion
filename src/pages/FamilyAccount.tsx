import { Navigate } from "react-router-dom";

/**
 * Legacy family-management route.
 *
 * Tiny Titans now uses the universal Start a Family / Join a Family code-first
 * experience at /account/family. Keep this route as a compatibility redirect
 * so old bookmarks cannot expose the retired email invitation workflow.
 */
export default function FamilyAccount() {
  return <Navigate to="/account/family" replace />;
}
