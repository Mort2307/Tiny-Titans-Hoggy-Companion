import type { ReactNode } from "react";
import RequireCapability from "./RequireCapability";
import CreatorWorkspaceCompat from "./CreatorWorkspaceCompat";

/**
 * Creator routes are protected by the capability model. The compatibility
 * wrapper keeps legacy Creator pages that still inspect profile.role from
 * incorrectly bouncing an authorized Creator-profile owner back to Home.
 */
export default function CreatorRouteGuard({ children }: { children: ReactNode }) {
  return (
    <RequireCapability capability="creator">
      <CreatorWorkspaceCompat>{children}</CreatorWorkspaceCompat>
    </RequireCapability>
  );
}
