import CreatorAdmin from "../pages/CreatorAdmin";
import CreatorHub from "../pages/CreatorHub";
import CommunityManager from "../pages/CommunityManager";
import CreatorRouteGuard from "../components/CreatorRouteGuard";

export function CreatorRoutes() {
  return {
    hub: <CreatorRouteGuard><CreatorHub /></CreatorRouteGuard>,
    tools: <CreatorRouteGuard><CreatorAdmin /></CreatorRouteGuard>,
    community: <CreatorRouteGuard><CommunityManager /></CreatorRouteGuard>,
  };
}
