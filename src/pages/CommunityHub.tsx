import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCommunityPosts } from "../services/communityService";
import { getCommunityContent } from "../services/communityEcosystemService";
import { markCommunityAsRead } from "../services/communityReadStateService";
import type { CommunityCategory, CommunityPost } from "../types/community";
import type { CommunityBoardKey, CommunityContent } from "../types/communityEcosystem";
import { communityCategoryIcon, communityCategoryLabel } from "../types/community";
import FeaturedTitans from "../components/community/FeaturedTitans";
import CommunityBoardGrid from "../components/community/CommunityBoardGrid";
import "../styles/CommunityHub.css";

const sections: { category: CommunityCategory; description: string }[] = [
  { category: "update", description: "News, important announcements and what is changing in Tiny Titans." },
  { category: "known_issue", description: "Current problems, affected versions, workarounds and fixes." },
  { category: "tester", description: "Builds and focused testing requests for approved testers." },
  { category: "release", description: "A clear history of releases, fixes and improvements." },
];

function formatDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleDateString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function PostCard({ post }: { post: CommunityPost }) {
  return <article className={`community-post community-post-${post.priority}`}>
    <div className="community-post-top"><span className="community-post-icon">{communityCategoryIcon(post.category)}</span><div><span className="community-post-category">{communityCategoryLabel(post.category)}</span>{post.priority !== "normal" && <span className="community-priority">{post.priority}</span>}</div><time>{formatDate(post.publishedAt)}</time></div>
    <h3>{post.title}</h3>{post.imageUrl && <img className="community-post-image" src={post.imageUrl} alt="" loading="lazy" />}<p>{post.message}</p>
    {post.category === "known_issue" && <div className="community-issue-meta">{post.status && <span>🛠️ {post.status}</span>}{post.affectedVersion && <span>📱 {post.affectedVersion}</span>}{post.affectedPlatform && <span>💻 {post.affectedPlatform}</span>}{post.severity && <span>⚠️ {post.severity}</span>}</div>}
    {post.workaround && <div className="community-workaround"><strong>Workaround</strong><p>{post.workaround}</p></div>}{post.resolvedVersion && <div className="community-resolved">🟢 Resolved in {post.resolvedVersion}</div>}
  </article>;
}

function ContentCard({ item }: { item: CommunityContent }) {
  const icon = item.type === "showcase" ? "🐍" : item.type === "project" ? "🧬" : item.type === "marketplace" ? "🏪" : item.type === "knowledge" ? "🧠" : "💬";
  return <article className="community-content-card">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="community-content-placeholder">{icon}</div>}<div className="community-content-body"><span className="community-content-type">{icon} {item.type}</span><h3>{item.title}</h3><p>{item.summary || item.body || "Community contribution"}</p><small>{item.authorDisplayName ? `Shared by ${item.authorDisplayName}` : "Tiny Titans community"}</small></div></article>;
}

export default function CommunityHub() {
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [content, setContent] = useState<CommunityContent[]>([]);
  const [active, setActive] = useState<CommunityCategory | "all">("all");
  const [activeBoard, setActiveBoard] = useState<CommunityBoardKey | "all">("all");
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const userId = user?.uid;
  const loading = authLoading || profileLoading || Boolean(userId && loadedUserId !== userId);
  const effectiveError = !authLoading && !profileLoading && !userId ? "Please sign in to view the Community Hub." : loadError;

  useEffect(() => {
    if (authLoading || profileLoading || !userId) return;
    let mounted = true;
    void Promise.allSettled([
      getCommunityPosts({ isTester: profile?.isTester, isAdmin: profile?.role === "admin" }),
      getCommunityContent({ limitCount: 24 }),
    ]).then(([officialResult, communityResult]) => {
      if (!mounted) return;
      if (officialResult.status === "rejected") {
        setLoadError(officialResult.reason instanceof Error ? officialResult.reason.message : "Unable to load Tiny Titans updates.");
        return;
      }
      setPosts(officialResult.value);
      setContent(communityResult.status === "fulfilled" ? communityResult.value : []);
      setLoadError("");
    }).finally(() => { if (mounted) setLoadedUserId(userId); });
    return () => { mounted = false; };
  }, [authLoading, profileLoading, userId, profile?.isTester, profile?.role]);

  useEffect(() => {
    if (authLoading || profileLoading || !userId || loading || effectiveError) return;
    void markCommunityAsRead(userId).then(() => window.dispatchEvent(new Event("community-read-state-changed"))).catch(() => undefined);
  }, [authLoading, profileLoading, userId, loading, effectiveError]);

  const visiblePosts = useMemo(() => active === "all" ? posts : posts.filter((post) => post.category === active), [active, posts]);
  const visibleContent = useMemo(() => activeBoard === "all" ? content : content.filter((item) => item.board === activeBoard), [activeBoard, content]);
  const importantCount = posts.filter((post) => post.priority !== "normal" && post.category !== "release").length;
  const isAdmin = profile?.role === "admin";

  return <section className="community-page">
    <header className="community-hero"><div className="community-hero-icon">🌿</div><div><p className="community-eyebrow">TINY TITANS · COMMUNITY</p><h1>Community Hub</h1><p>A keeper-driven space to share snakes, solve problems, build projects and learn together.</p></div>{importantCount > 0 && <span className="community-live-badge">● {importantCount} important</span>}</header>

    <FeaturedTitans onOpen={(item) => { if (item.type === "marketplace") navigate("/community?view=marketplace"); }} />

    <section className="community-ecosystem-grid">
      <button type="button" onClick={() => setActiveBoard("all")}><span>🐍</span><div><strong>Snake Showcase</strong><small>Show off your Titans with explicit sharing permission.</small></div></button>
      <button type="button" onClick={() => setActiveBoard("breeding")}><span>🧬</span><div><strong>Project Partnerships</strong><small>Find keepers working towards compatible breeding goals.</small></div></button>
      <button type="button" onClick={() => navigate("/community?view=marketplace")}><span>🏪</span><div><strong>Marketplace</strong><small>Structured listings for animals, clutches and future community services.</small></div></button>
      <button type="button" onClick={() => setActiveBoard("community")}><span>🤝</span><div><strong>Mentorship & Knowledge</strong><small>Turn real keeper experience into useful community knowledge.</small></div></button>
    </section>

    <CommunityBoardGrid activeBoard={activeBoard} onSelect={setActiveBoard} />

    {!loading && !effectiveError && visibleContent.length > 0 && <section className="community-content-section"><div className="community-subheading"><div><span className="community-eyebrow">COMMUNITY ACTIVITY</span><h2>{activeBoard === "all" ? "What's happening" : "Board activity"}</h2><p>Relevant community content is surfaced here without mixing it into official Tiny Titans notices.</p></div></div><div className="community-content-grid">{visibleContent.map((item) => <ContentCard key={item.id} item={item} />)}</div></section>}

    <section className="community-official"><div className="community-subheading"><div><span className="community-eyebrow">OFFICIAL TINY TITANS</span><h2>{active === "all" ? "Latest from Tiny Titans" : communityCategoryLabel(active)}</h2><p>{active === "all" ? "Official updates remain clearly separated from community opinions and experiences." : sections.find((item) => item.category === active)?.description}</p></div>{active !== "all" && <button type="button" className="community-filter-button" onClick={() => setActive("all")}>Show all</button>}</div>
      {loading && <div className="community-empty"><span>🐍</span><h3>Loading the Hub…</h3><p>Checking community activity and official Tiny Titans updates.</p></div>}
      {!loading && effectiveError && <div className="community-empty community-error"><span>⚠️</span><h3>Couldn't load updates</h3><p>{effectiveError}</p>{user && <button type="button" onClick={() => window.location.reload()}>Try again</button>}</div>}
      {!loading && !effectiveError && visiblePosts.length === 0 && <div className="community-empty"><span>🌱</span><h3>The community is ready</h3><p>Official updates will appear here. Community content is kept separate so experience and announcements never get confused.</p></div>}
      {!loading && !effectiveError && visiblePosts.length > 0 && <div className="community-post-list">{visiblePosts.map((post) => <PostCard key={post.id} post={post} />)}</div>}
    </section>

    <section className="community-feedback-card community-wall-card"><div><span className="community-feedback-icon">🏆</span><div><h2>Wall of Titans</h2><p>Meet the people supporting Tiny Titans and see the Founder recognised at the top of the wall.</p></div></div><button type="button" onClick={() => navigate("/community/wall-of-titans")}>Open Wall of Titans →</button></section>
    {isAdmin && <section className="community-feedback-card"><div><span className="community-feedback-icon">📢</span><div><h2>Creator publishing</h2><p>Publish official updates, known issues, tester notices and release notes.</p></div></div><button type="button" onClick={() => navigate("/creator/community")}>Open Community Manager →</button></section>}
    <section className="community-feedback-card"><div><span className="community-feedback-icon">💬</span><div><h2>Help shape the community</h2><p>Found something broken or have an idea for a board, project or community feature?</p></div></div><button type="button" onClick={() => navigate("/report-issue")}>{user ? "Send feedback" : "Report an issue"} →</button></section>
  </section>;
}
