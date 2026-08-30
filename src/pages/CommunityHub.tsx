import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCommunityPosts } from "../services/communityService";
import { markCommunityAsRead } from "../services/communityReadStateService";
import type { CommunityCategory, CommunityPost } from "../types/community";
import { communityCategoryIcon, communityCategoryLabel } from "../types/community";
import "../styles/CommunityHub.css";

const sections: { category: CommunityCategory; description: string }[] = [
  { category: "update", description: "News, important announcements and what is changing in Tiny Titans." },
  { category: "known_issue", description: "Current problems, affected versions, workarounds and fixes." },
  { category: "tester", description: "Builds and focused testing requests for approved testers." },
  { category: "release", description: "A clear history of releases, fixes and improvements." },
];

const communityActions = [
  { icon: "💡", title: "Feature Voting", description: "Suggest ideas, vote on priorities and help shape what Tiny Titans builds next.", route: "/community/features", action: "View and vote" },
  { icon: "🏆", title: "Wall of Titans", description: "Meet the keepers supporting Tiny Titans and explore recognised community contributions.", route: "/community/wall-of-titans", action: "Visit the wall" },
  { icon: "🧭", title: "Find a Mentor", description: "Connect with experienced keepers through the dedicated mentorship workspace.", route: "/community/mentorship", action: "Explore mentorship" },
  { icon: "🧬", title: "Morph Contributions", description: "Explore the Morph Library and submit reviewed reference images or missing terminology.", route: "/morph-library", action: "Open Morph Library" },
  { icon: "💬", title: "Conversations", description: "Jump into your existing community conversations and keep the discussion moving.", route: "/conversations", action: "Open conversations" },
  { icon: "🛠️", title: "Report and Improve", description: "Report bugs, share feedback and help make the app better for every keeper.", route: "/report-bug", action: "Send feedback" },
];

function formatDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ActionCard({ action, onOpen }: { action: typeof communityActions[number]; onOpen: (route: string) => void }) {
  return (
    <button type="button" className="community-action-card" onClick={() => onOpen(action.route)}>
      <span className="community-action-icon" aria-hidden="true">{action.icon}</span>
      <span className="community-action-content">
        <strong>{action.title}</strong>
        <small>{action.description}</small>
        <span className="community-action-link">{action.action} <span aria-hidden="true">→</span></span>
      </span>
    </button>
  );
}

function PostCard({ post }: { post: CommunityPost }) {
  return (
    <article className={`community-post community-post-${post.priority}`}>
      <div className="community-post-top">
        <span className="community-post-icon" aria-hidden="true">{communityCategoryIcon(post.category)}</span>
        <div className="community-post-meta">
          <span className="community-post-category">{communityCategoryLabel(post.category)}</span>
          {post.priority !== "normal" && <span className={`community-priority community-priority-${post.priority}`}>{post.priority}</span>}
        </div>
        <time>{formatDate(post.publishedAt)}</time>
      </div>
      <h3>{post.title}</h3>
      {post.imageUrl && <img className="community-post-image" src={post.imageUrl} alt="" loading="lazy" />}
      <p>{post.message}</p>
      {post.category === "known_issue" && (
        <div className="community-issue-meta">
          {post.status && <span>🛠️ {post.status}</span>}
          {post.affectedVersion && <span>📱 {post.affectedVersion}</span>}
          {post.affectedPlatform && <span>💻 {post.affectedPlatform}</span>}
          {post.severity && <span>⚠️ {post.severity}</span>}
        </div>
      )}
      {post.workaround && (
        <div className="community-workaround">
          <strong>Workaround.</strong>
          <p>{post.workaround}</p>
        </div>
      )}
      {post.resolvedVersion && <div className="community-resolved">🟢 Resolved in {post.resolvedVersion}.</div>}
    </article>
  );
}

export default function CommunityHub() {
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [active, setActive] = useState<CommunityCategory | "all">("all");
  const userId = user?.uid;
  const loading = authLoading || profileLoading || Boolean(userId && loadedUserId !== userId);
  const effectiveError = !authLoading && !profileLoading && !userId ? "Please sign in to view the Community Hub." : loadError;

  useEffect(() => {
    if (authLoading || profileLoading || !userId) return;
    let mounted = true;
    getCommunityPosts({ isTester: profile?.isTester, isAdmin: profile?.role === "admin" })
      .then((items) => {
        if (!mounted) return;
        setPosts(items);
        setLoadError("");
      })
      .catch((error) => {
        if (mounted) setLoadError(error instanceof Error ? error.message : "Unable to load the Community Hub.");
      })
      .finally(() => {
        if (mounted) setLoadedUserId(userId);
      });
    return () => {
      mounted = false;
    };
  }, [authLoading, profileLoading, userId, profile?.isTester, profile?.role]);

  useEffect(() => {
    if (authLoading || profileLoading || !userId || loading || effectiveError) return;
    void markCommunityAsRead(userId)
      .then(() => window.dispatchEvent(new Event("community-read-state-changed")))
      .catch(() => undefined);
  }, [authLoading, profileLoading, userId, loading, effectiveError]);

  const visiblePosts = useMemo(
    () => active === "all" ? posts : posts.filter((post) => post.category === active),
    [active, posts],
  );
  const importantCount = posts.filter((post) => post.priority !== "normal" && post.category !== "release").length;
  const testerCount = posts.filter((post) => post.category === "tester").length;
  const releaseCount = posts.filter((post) => post.category === "release").length;
  const isAdmin = profile?.role === "admin";

  return (
    <section className="community-page">
      <header className="community-hero">
        <div className="community-hero-icon" aria-hidden="true">🌿</div>
        <div className="community-hero-copy">
          <p className="community-eyebrow">TINY TITANS · COMMUNITY</p>
          <h1>Community Hub</h1>
          <p>A single place for keeper news, shared knowledge, feature voting, mentorship, contributions and official Tiny Titans updates.</p>
        </div>
        {importantCount > 0 && <span className="community-live-badge">● {importantCount} important</span>}
      </header>

      <section className="community-pulse" aria-label="Community pulse">
        <div><strong>{posts.length}</strong><span>Published updates</span></div>
        <div><strong>{importantCount}</strong><span>Important items</span></div>
        <div><strong>{testerCount}</strong><span>Tester notices</span></div>
        <div><strong>{releaseCount}</strong><span>Release notes</span></div>
      </section>

      <section className="community-section-heading">
        <div>
          <p className="community-eyebrow">GET INVOLVED</p>
          <h2>Help shape Tiny Titans.</h2>
          <p>There are several ways to learn, contribute, share ideas and connect with other keepers.</p>
        </div>
      </section>

      <section className="community-action-grid" aria-label="Community actions">
        {communityActions.map((action) => <ActionCard key={action.route} action={action} onOpen={navigate} />)}
      </section>

      <section className="community-standard">
        <div className="community-standard-icon" aria-hidden="true">🤝</div>
        <div>
          <h2>Keeper-first community.</h2>
          <p>Share knowledge from evidence, ask questions without fear of judgement, protect keeper privacy and help each other learn.</p>
        </div>
      </section>

      <section className="community-section-heading community-updates-heading">
        <div>
          <p className="community-eyebrow">OFFICIAL FEED</p>
          <h2>{active === "all" ? "Latest from Tiny Titans" : communityCategoryLabel(active)}</h2>
          <p>{active === "all" ? "Official updates, known issues, tester notices and release information." : sections.find((item) => item.category === active)?.description}</p>
        </div>
        {active !== "all" && <button type="button" className="community-filter-button" onClick={() => setActive("all")}>Show all</button>}
      </section>

      <div className="community-section-grid">
        {sections.map((section) => (
          <button
            key={section.category}
            type="button"
            className={`community-section-card ${active === section.category ? "active" : ""}`}
            onClick={() => setActive(section.category)}
          >
            <span className="community-section-icon" aria-hidden="true">{communityCategoryIcon(section.category)}</span>
            <span>
              <strong>{communityCategoryLabel(section.category)}</strong>
              <small>{section.description}</small>
              {section.category === "tester" && testerCount > 0 && <small className="community-section-count">{testerCount} current tester update{testerCount === 1 ? "" : "s"}.</small>}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="community-empty">
          <span aria-hidden="true">🐍</span>
          <h3>Loading the Hub…</h3>
          <p>Checking for the latest Tiny Titans updates.</p>
        </div>
      )}
      {!loading && effectiveError && (
        <div className="community-empty community-error">
          <span aria-hidden="true">⚠️</span>
          <h3>We couldn't load the updates.</h3>
          <p>{effectiveError}</p>
          {user && <button type="button" onClick={() => window.location.reload()}>Try again</button>}
        </div>
      )}
      {!loading && !effectiveError && visiblePosts.length === 0 && (
        <div className="community-empty">
          <span aria-hidden="true">🌱</span>
          <h3>No published updates here yet.</h3>
          <p>When Tiny Titans has something to share, it will appear in this feed.</p>
        </div>
      )}
      {!loading && !effectiveError && visiblePosts.length > 0 && (
        <div className="community-post-list">
          {visiblePosts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {isAdmin && (
        <section className="community-feedback-card community-admin-card">
          <div>
            <span className="community-feedback-icon" aria-hidden="true">📢</span>
            <div>
              <h2>Creator publishing.</h2>
              <p>Publish official updates, known issues, tester notices and release notes for the community.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/creator/community")}>Open Community Manager →</button>
        </section>
      )}

      <section className="community-feedback-card">
        <div>
          <span className="community-feedback-icon" aria-hidden="true">💬</span>
          <div>
            <h2>Have something to tell us?</h2>
            <p>Report a problem, share feedback or help us make the next release better.</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(user ? "/report-bug" : "/report-issue")}>{user ? "Send feedback" : "Report an issue"} →</button>
      </section>
    </section>
  );
}
