import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCreatorCommunityIntelligence,
  type CreatorCommunityIntelligence,
} from "../services/creatorCommunityIntelligenceService";
import {
  buildCommunityDetail,
  buildCommunityTiles,
  COMMUNITY_QUEUE_ROUTES,
  type CommunityTileKey,
} from "../lib/creatorCommunityIntelligence";

export function useCreatorCommunityIntelligence() {
  const [data, setData] = useState<CreatorCommunityIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTile, setOpenTile] = useState<CommunityTileKey | null>(null);
  const [showThankYous, setShowThankYous] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getCreatorCommunityIntelligence());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Community intelligence could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);

  useEffect(() => {
    if (!openTile && !showThankYous) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenTile(null);
        setShowThankYous(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openTile, showThankYous]);

  const tiles = useMemo(() => (data ? buildCommunityTiles(data) : []), [data]);
  const detail = useMemo(
    () => (data && openTile ? buildCommunityDetail(data, openTile) : null),
    [data, openTile],
  );

  return {
    data, loading, error, openTile, setOpenTile, showThankYous, setShowThankYous,
    refresh, tiles, detail,
    selectedQueueRoute: openTile ? COMMUNITY_QUEUE_ROUTES[openTile] : undefined,
  };
}
