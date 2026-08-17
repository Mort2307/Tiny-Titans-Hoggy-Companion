import type { ReactNode } from "react";
import RequireCapability from "./RequireCapability";

/**
 * Backwards-compatible wrapper for existing Creator routes.
 * New privileged routes should use RequireCapability directly.
 */
export default function CreatorRouteGuard({ children }: { children: ReactNode }) {
  return <RequireCapability capability="creator">{children}</RequireCapability>;
}
