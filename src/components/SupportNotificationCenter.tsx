import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";
import "../styles/SupportNotificationCenter.css";

type SupportNotification = { id: string; title?: string; body?: string; url?: string; createdAt?: unknown; read?: boolean; status?: string; type?: string };
function eventTime(value: unknown) { if (!value) return 0; if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return Number(value.toMillis()) || 0; const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : 0; }

export default function SupportNotificationCenter() {
  const { user } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [items, setItems] = useState<SupportNotification[]>([]);
  useEffect(() => {
    if (!user) { setItems([]); return; }
    const q = query(collection(db, "users", user.uid, "notificationEvents"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (snap) => {
      const unread = snap.docs
        .map((item) => ({ id: item.id, ...(item.data() as Omit<SupportNotification, "id">) }))
        .filter((item) => item.read !== true && item.status !== "sending")
        .sort((a, b) => eventTime(b.createdAt) - eventTime(a.createdAt));
      setItems(unread);
    }, (error) => { console.warn("Tiny Titans: support notification subscription failed", error); setItems([]); });
  }, [user]);
  if (!user || items.length === 0) return null;
  const currentUserId = user.uid; const item = items[0];
  const href = item.url || "/conversations";
  async function markRead(userId: string, notificationId: string) {
    try { await updateDoc(doc(db, "users", userId, "notificationEvents", notificationId), { read: true, readAt: new Date() }); }
    catch (error) { console.warn("Tiny Titans: notification could not be marked read", error); }
    setItems((current) => current.filter((entry) => entry.id !== notificationId));
  }
  async function open() {
    // Navigate first so a slow Firestore write can never make the View button
    // appear dead. The read marker is best-effort and happens after routing.
    if (href !== `${location.pathname}${location.search}`) navigate(href);
    else window.scrollTo({ top: 0, behavior: "smooth" });
    void markRead(currentUserId, item.id);
  }
  return <aside className="tt-support-notification" role="status" aria-live="polite"><div className="tt-support-notification-icon">{item.type === "feeding" || item.type === "feeding-preparation" ? "🍽️" : item.type === "weight" ? "⚖️" : item.type === "shed" ? "🐍" : item.type === "medication" || item.type === "medication-followup" || item.type === "health-followup" ? "🩺" : "💬"}</div><div className="tt-support-notification-copy"><strong>{item.title || "Tiny Titans reminder"}</strong><p>{item.body || "You have a new Tiny Titans notification."}</p></div><button type="button" onClick={() => void open()}>View</button><button type="button" className="secondary" aria-label="Dismiss notification" onClick={() => void markRead(currentUserId, item.id)}>✕</button></aside>;
}
