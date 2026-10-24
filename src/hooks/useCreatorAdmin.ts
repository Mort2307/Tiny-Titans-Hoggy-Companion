import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { fetchCreatorDashboardData, fetchCreatorUsers, grantCreatorTesterAccess } from "../services/creatorAdminService";
import { buildCreatorUserInsights, filterCreatorUsers } from "../lib/creatorAdminAnalytics";
import type { CreatorUser } from "../types/creatorAdmin";
import type { GlobalStats } from "../services/creatorService";

const EMPTY_STATS: GlobalStats = {
  registeredUsers: 0, activeUsers: 0, snakeProfiles: 0, mealsFed: 0, weightLogs: 0, totalWeightKg: 0,
  totalWeightLb: 0, shedsLogged: 0, totalShedLengthCm: 0, totalShedLengthIn: 0, geneticsCalculations: 0,
};

export function useCreatorAdmin() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<GlobalStats>(EMPTY_STATS);
  const [users, setUsers] = useState<CreatorUser[]>([]);
  const [morphPending, setMorphPending] = useState(0);
  const [bugPending, setBugPending] = useState(0);
  const [feedbackNew, setFeedbackNew] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"users" | "snakes" | "trackers" | "morph-editor" | null>(() =>
    new URLSearchParams(window.location.search).get("tool") === "morph-editor" ? "morph-editor" : null,
  );
  const [selectedUser, setSelectedUser] = useState<CreatorUser | null>(null);
  const [search, setSearch] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => { setNow(Date.now()); }, []);

  async function loadDashboard() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchCreatorDashboardData();
      setStats(data.canonicalStats);
      setMorphPending(data.morphPending);
      setBugPending(data.bugPending);
      setFeedbackNew(data.feedbackNew);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Creator data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    if (!user) return;
    setUsersLoading(true);
    setError("");
    try { setUsers(await fetchCreatorUsers()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "User overview could not be loaded."); }
    finally { setUsersLoading(false); }
  }

  async function grantCreatorTesterClaim(target: CreatorUser) {
    if (!target.uid) return;
    setClaimBusy(true);
    setClaimMessage("");
    setError("");
    try {
      await grantCreatorTesterAccess(target.uid);
      setClaimMessage("Creator authorization granted to " + (target.displayName || "the selected account") + ". Refresh that account ID token before running Creator Tester.");
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Creator authorization could not be granted.");
    } finally {
      setClaimBusy(false);
    }
  }

  useEffect(() => {
    if (profile?.role !== "admin" || !user) return;
    let active = true;
    void Promise.allSettled([fetchCreatorDashboardData(), fetchCreatorUsers()])
      .then(([dashboard, directory]) => {
        if (!active) return;
        const errors: string[] = [];
        if (dashboard.status === "fulfilled") {
          const data = dashboard.value;
          setStats(data.canonicalStats);
          setMorphPending(data.morphPending);
          setBugPending(data.bugPending);
          setFeedbackNew(data.feedbackNew);
        } else {
          errors.push("Creator dashboard could not be loaded.");
        }
        if (directory.status === "fulfilled") {
          setUsers(directory.value);
        } else {
          errors.push("User overview could not be loaded.");
        }
        setError(errors.join(" "));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile?.role, user]);

  useEffect(() => {
    if (panel !== "users" || !user) return;
    let active = true;
    void fetchCreatorUsers()
      .then((nextUsers) => { if (active) setUsers(nextUsers); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "User overview could not be loaded."); })
      .finally(() => { if (active) setUsersLoading(false); });
    return () => { active = false; };
  }, [panel, user]);

  const filteredUsers = useMemo(() => filterCreatorUsers(users, search), [users, search]);
  const userInsights = useMemo(() => buildCreatorUserInsights(users, now), [users, now]);

  return {
    profile, user, stats, users, morphPending, bugPending, feedbackNew, loading, usersLoading, error,
    panel, setPanel, selectedUser, setSelectedUser, search, setSearch, claimBusy, claimMessage, setClaimMessage, now,
    filteredUsers, userInsights, loadDashboard, loadUsers, grantCreatorTesterClaim,
  };
}