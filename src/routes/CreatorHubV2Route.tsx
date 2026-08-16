import CreatorRouteGuard from "../components/CreatorRouteGuard";
import CreatorHubV2 from "../pages/CreatorHubV2";

export default function CreatorHubV2Route() {
  return (
    <CreatorRouteGuard>
      <CreatorHubV2 />
    </CreatorRouteGuard>
  );
}
