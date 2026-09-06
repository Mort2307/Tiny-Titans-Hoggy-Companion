import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/TinyTitans-Logo.jpg";
import { useAuth } from "../../context/useAuth";
import { getCreatorSubmissionConversations, getUserSubmissionConversations } from "../../services/submissionConversationService";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";

function Header() {
  const { user, profile } = useAuth();
  const [unread, setUnread] = useState(0);
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
  }, [user, creatorMode]);

  return (
    <header className="app-header">
      <Link to="/" className="logo-link" aria-label="Tiny Titans Reptile Companion home">
        <img src={logo} alt="Tiny Titans Reptile Companion" className="tiny-titans-logo" />
      </Link>
      <div className="app-brand-lockup">
        <span className="app-brand-name" aria-label="Tiny Titans Reptile Companion">Tiny Titans Reptile Companion</span>
      </div>
      <div className="app-header-actions">
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
