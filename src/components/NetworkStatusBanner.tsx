import { useEffect, useState } from "react";
import TinyTitansFeedback from "./TinyTitansFeedback";

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <TinyTitansFeedback kind="offline" className="tt-network-status">
      You are offline. Keep Tiny Titans open until important changes show as saved, then reconnect before closing the app.
    </TinyTitansFeedback>
  );
}
