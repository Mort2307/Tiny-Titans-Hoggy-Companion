import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { hasCapability } from "../services/capabilityService";
import { getCommunityUnreadCount } from "../services/communityReadStateService";
import { getWorkspacePresentation, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../services/workspacePresentationService";
import communityUpdates from "../data/communityUpdates.json";

const latestProductUpdateId =
  [...communityUpdates].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))[0]?.id ?? null;

function hasUnseenProductUpdate() {
  if (!latestProductUpdateId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("tinytitans:community-product-update:last-seen") !== latestProductUpdateId;
  } catch {
    return false;
  }
}

export function useNavigationAccess() {
  const { profile, user, loading, profileLoading } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(() => getWorkspacePresentation());
  const [creatorAuthorized, setCreatorAuthorized] = useState(false);
  const [testerAuthorized, setTesterAuthorized] = useState(false);
  const [educatorAuthorized, setEducatorAuthorized] = useState(false);
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0);
  const [unseenProductUpdate, setUnseenProductUpdate] = useState(hasUnseenProductUpdate);

  const userId = user?.uid;
  const authReady = !loading && !profileLoading && Boolean(userId);

  useEffect(() => subscribeToWorkspacePresentation(setWorkspace), []);

  useEffect(() => {
    if (!authReady) return;
    let active = true;

    void Promise.all([
      hasCapability("creator", profile),
      hasCapability("tester", profile),
      hasCapability("educator", profile),
    ])
      .then(([creator, tester, educator]) => {
        if (!active) return;
        setCreatorAuthorized(creator);
        setTesterAuthorized(tester);
        setEducatorAuthorized(educator);
      })
      .catch(() => {
        if (!active) return;
        setCreatorAuthorized(false);
        setTesterAuthorized(false);
        setEducatorAuthorized(false);
      });

    return () => {
      active = false;
    };
  }, [authReady, profile]);

  useEffect(() => {
    if (!authReady || !userId) return;
    let active = true;

    const refresh = () => {
      void getCommunityUnreadCount(userId, {
        isTester: profile?.isTester === true,
        isAdmin: profile?.role === "admin",
      })
        .then((count) => {
          if (active) setCommunityUnreadCount(count);
        })
        .catch(() => {
          if (active) setCommunityUnreadCount(0);
        });

      setUnseenProductUpdate(hasUnseenProductUpdate());
    };

    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("community-read-state-changed", refresh);
    window.addEventListener("community-product-update-read", refresh);

    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("community-read-state-changed", refresh);
      window.removeEventListener("community-product-update-read", refresh);
    };
  }, [authReady, userId, profile?.isTester, profile?.role]);

  return {
    workspace,
    creatorAuthorized,
    testerAuthorized,
    educatorAuthorized,
    communityUnreadCount,
    unseenProductUpdate,
  };
}
