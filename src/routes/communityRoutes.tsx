import type { RouteObject } from "react-router-dom";
import CommunityHub from "../pages/CommunityHub";
import CommunityContentView from "../pages/CommunityContentView";
import WallOfTitans from "../pages/WallOfTitans";

export const communityRoutes: RouteObject[] = [
  { path: "/community", element: <CommunityHub /> },
  { path: "/community/content/:id", element: <CommunityContentView /> },
  { path: "/community/wall-of-titans", element: <WallOfTitans /> },
  { path: "/wall-of-titans", element: <WallOfTitans /> },
];
