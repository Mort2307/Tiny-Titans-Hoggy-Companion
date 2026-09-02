import { collection, doc, limit, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";
import "../styles/SupportNotificationCenter.css";

type SupportNotification = { id: string; title?: string; body?: string; url?: string; createdAt?: unknown };
function eventTime(value: unknown) { if (!value) return 0; if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return Number(value.toMillis()) || 0; const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : 0; }

export default function SupportNotificationCenter() {
  const { user } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [items, setItems] = useState<SupportNotification[]>([]);
  useEffect(() => { if (!user) { setItems([]); return; } const q = query(collection(db, "users", user.uid, "notificationEvents"), where("read", "==", false), limit(20)); return onSnapshot(q, (snap) => setItems(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SupportNotification, "id">) })).sort((a, b) => eventTime(b.createdAt) - eventTime(a.createdAt))), () => setItems([])); }, [user]);
  if (!user || items.length === 0) return null;
  const item = items[0]; const href = item.url || "/conversations";
  async function markRead() { try { await updateDoc(doc(db, "users", user.uid, "notificationEvents", item.id), { read: true, readAt: new Date() }); } catch {} setItems((current) => current.filter((entry) => entry.id !== item.id)); }
  async function open() { await markRead(); if (href !== location.pathname + location.search) navigate(href); }
  return <aside className="tt-support-notification" role="status" aria-live="polite"><div className="tt-support-notification-icon">💬</div><div className="tt-support-notification-copy"><strong>{item.title || "Tiny Titans message"}</strong><p>{item.body || "You have a new message."}</p></div><button type="button" onClick={() => void open()}>View</button><button type="button" className="secondary" aria-label="Dismiss notification" onClick={() => void markRead()}>✕</button></aside>;
}
