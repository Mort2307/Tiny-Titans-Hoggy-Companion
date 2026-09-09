import { useCallback, useEffect, useRef } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";
import { getDetectedTimezone, getTimezoneOffsetMinutes } from "../services/worldTimeService";

export default function LiveWorldTracker() {
  const { user } = useAuth();
  const lastSyncedRef = useRef("");

  const sync = useCallback(async () => {
    if (!user) return;
    const timezone = getDetectedTimezone();
    const offsetMinutes = getTimezoneOffsetMinutes(new Date(), timezone);
    const key = `${timezone}|${offsetMinutes}`;
    if (lastSyncedRef.current === key) return;
    lastSyncedRef.current = key;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        timezone,
        timezoneOffsetMinutes: offsetMinutes,
        timezoneSource: "device",
        timezoneObservedAt: serverTimestamp(),
      });
    } catch (error) {
      // Timezone is an enhancement, never a reason to block authentication or the app.
      console.warn("Tiny Titans: unable to sync live timezone", error);
    }
  }, [user]);

  useEffect(() => {
    lastSyncedRef.current = "";
    void sync();
    const heartbeat = window.setInterval(() => { void sync(); }, 5 * 60 * 1000);
    const onVisibility = () => { if (document.visibilityState === "visible") void sync(); };
    const onFocus = () => { void sync(); };
    const onOnline = () => { void sync(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [sync]);

  return null;
}
