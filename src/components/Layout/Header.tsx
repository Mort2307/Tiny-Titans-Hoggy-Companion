import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/TinyTitans-Logo.jpg";
import { useAuth } from "../../context/useAuth";
import { getCreatorSubmissionConversations, getUserSubmissionConversations } from "../../services/submissionConversationService";
import { getDashboardIntelligence, type SnakeIntelligence } from "../../services/snakeIntelligenceService";
import { hasFullIntelligenceAccess } from "../../services/intelligenceAccessService";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";

function Header() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [proactive, setProactive] = useState<SnakeIntelligence | null>(null);
  const creatorMode = profile?.role === "admin";
  const mailboxPath = creatorMode ? "/creator/submission-conversations" : "/conversations/submissions";

  useEffect(() => {
    let active = true;
    if (!user) { setUnread(0); return () => { active = false; }; }
    void (creatorMode ? getCreatorSubmissionConversations() : getUserSubmissionConversations(user.uid))
      .then((threads) => {
        if (!active) return;
        setUnread(threads.reduce((sum, thread) => sum + (creatorMode ? thread.unreadForCreator : thread.unreadForSubmitter), 0));
      })
      .catch(() => { if (active) setUnread(0); });
    return () => { active = false; };
  }, [user, creatorMode, location.pathname]);

  useEffect(() => {
    if (!user || creatorMode) { setProactive(null); return () => undefined; }
    let active = true;
    const refresh = async () => {
      try {
        const hasAccess = await hasFullIntelligenceAccess(user.uid);
        if (!active) return;
        if (!hasAccess) { setProactive(null); return; }
        const snakes = await getDashboardIntelligence(user.uid, undefined);
        if (!active) return;
        const candidate = snakes
          .filter((item) => item.priority?.tone === "attention")
          .sort((a, b) => (b.priority?.confidence === "High" ? 2 : 1) - (a.priority?.confidence === "High" ? 2 : 1))[0] ?? null;
        setProactive(candidate);
      } catch {
        if (active) setProactive(null);
      }
    };
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, creatorMode, location.pathname]);

  return (
    <header className="app-header">
      <Link to="/" className="logo-link" aria-label="Tiny Titans Reptile Companion home">
        <img src={logo} alt="Tiny Titans Reptile Companion" className="tiny-titans-logo" />
      </Link>
      <div className="app-brand-lockup">
        <span className="app-brand-name" aria-label="Tiny Titans Reptile Companion">Tiny Titans Reptile Companion</span>
      </div>
      <div className="app-header-actions">
        {!creatorMode && proactive?.priority && (
          <Link
            className="titan-proactive-header-link"
            to={`/snakes/${proactive.snakeId}/master-record`}
            aria-label={`Tiny Titans noticed something for ${proactive.snakeName}: ${proactive.priority.title}`}
            title={proactive.priority.why}
          >
            <span aria-hidden="true">⚡</span>
            <span className="titan-proactive-header-copy">
              <strong>{proactive.snakeName}</strong>
              <small>{proactive.priority.title}</small>
            </span>
          </Link>
        )}
        <Link className="submission-mailbox-link" to={mailboxPath} aria-label={unread > 0 ? `Submission messages, ${unread} unread` : "Submission messages"} title={unread > 0 ? `${unread} unread submission message${unread === 1 ? "" : "s"}` : "Submission messages"}>
          <span aria-hidden="true">💬</span>
          {unread > 0 && <span className="submission-mailbox-badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
        </Link>
        <TitanCommandPalette />
      </div>
    </header>
  );
}

export default Header;
