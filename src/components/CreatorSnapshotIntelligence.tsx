import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getPrivacyPreferences } from "../services/privacyService";
import { getGlobalStats, type GlobalStats } from "../services/creatorService";

type UserRecord = Record<string, unknown>;
type TileKey = "users" | "snakes" | "husbandry" | "community" | "mentorship" | "learning" | "genetics" | "operations" | "data" | "growth";
type Snapshot = { stats: GlobalStats; users: UserRecord[]; consent: { accepted: number; declined: number; unset: number; location: number; analytics: number }; mentors: { published: number; accepting: number; applications: number; pending: number; requests: number; activeRequests: number; workspaces: number; activeWorkspaces: number }; community: { posts: number; feedback: number; issues: number; activeIssues: number; morphSubmissions: number; pendingMorphs: number }; genetics: { calculations: number; approvedMorphImages: number } };
const fmt = (value: number) => new Intl.NumberFormat("en-GB").format(value);
const pct = (value: number, total: number) => total > 0 ? `${Math.round((value / total) * 100)}%` : "—";
const countBy = (items: UserRecord[], key: string) => items.reduce<Record<string, number>>((acc, item) => { const value = String(item[key] ?? "Unknown").trim() || "Unknown"; acc[value] = (acc[value] ?? 0) + 1; return acc; }, {});
const topEntries = (record: Record<string, number>, limit = 5) => Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, limit);

async function countCollection(name: string) { try { return (await getDocs(collection(db, name))).size; } catch { return 0; } }

async function loadSnapshot(): Promise<Snapshot> {
  const [stats, usersSnapshot, mentorsSnapshot, mentorApplications, mentorshipRequests, workspaces, posts, feedback, issues, morphSubmissions, approvedMorphImages, geneticsCalculations] = await Promise.all([
    getGlobalStats(), getDocs(collection(db, "users")), getDocs(collection(db, "mentors")), getDocs(collection(db, "mentorApplications")), getDocs(collection(db, "mentorshipRequests")), getDocs(collection(db, "mentorshipWorkspaces")), countCollection("communityPosts"), countCollection("feedback"), getDocs(collection(db, "issueReports")), getDocs(collection(db, "morphImageSubmissions")), countCollection("approvedMorphImages"), countCollection("geneticsCalculations"),
  ]);
  const users = usersSnapshot.docs.map((doc) => doc.data() as UserRecord);
  let accepted = 0, declined = 0, unset = 0, location = 0, analytics = 0;
  await Promise.all(usersSnapshot.docs.map(async (doc) => {
    try {
      const privacy = await getPrivacyPreferences(doc.id);
      if (privacy.communityHusbandryData === true) accepted += 1; else if (privacy.communityHusbandryData === false) declined += 1; else unset += 1;
      if (privacy.communityLocation === true) location += 1;
      if (privacy.anonymousAnalytics === true) analytics += 1;
    } catch { unset += 1; }
  }));
  const mentorRecords = mentorsSnapshot.docs.map((doc) => doc.data() as UserRecord);
  const applicationRecords = mentorApplications.docs.map((doc) => doc.data() as UserRecord);
  const requestRecords = mentorshipRequests.docs.map((doc) => doc.data() as UserRecord);
  const workspaceRecords = workspaces.docs.map((doc) => doc.data() as UserRecord);
  const issueRecords = issues.docs.map((doc) => doc.data() as UserRecord);
  const morphRecords = morphSubmissions.docs.map((doc) => doc.data() as UserRecord);
  return {
    stats, users, consent: { accepted, declined, unset, location, analytics },
    mentors: { published: mentorRecords.length, accepting: mentorRecords.filter((item) => item.acceptingNewMentees === true).length, applications: applicationRecords.length, pending: applicationRecords.filter((item) => ["pending", "Pending"].includes(String(item.status))).length, requests: requestRecords.length, activeRequests: requestRecords.filter((item) => ["sent", "accepted", "active"].includes(String(item.status))).length, workspaces: workspaceRecords.length, activeWorkspaces: workspaceRecords.filter((item) => String(item.status) === "active").length },
    community: { posts, feedback, issues: issueRecords.length, activeIssues: issueRecords.filter((item) => !["Resolved", "Closed", "Archived"].includes(String(item.status))).length, morphSubmissions: morphRecords.length, pendingMorphs: morphRecords.filter((item) => ["Pending", "NeedsInfo"].includes(String(item.status))).length },
    genetics: { calculations: geneticsCalculations, approvedMorphImages },
  };
}

function DetailLine({ label, value, note }: { label: string; value: string | number; note?: string }) { return <div className="creator-snapshot-detail-line"><span><strong>{label}</strong>{note && <small>{note}</small>}</span><strong>{typeof value === "number" ? fmt(value) : value}</strong></div>; }

export default function CreatorSnapshotIntelligence() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null); const [selected, setSelected] = useState<TileKey | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; void loadSnapshot().then((data) => { if (active) setSnapshot(data); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Creator snapshot could not be loaded."); }); return () => { active = false; }; }, []);
  const usersByExperience = useMemo(() => snapshot ? topEntries(countBy(snapshot.users, "experienceLevel")) : [], [snapshot]);
  const usersByLearning = useMemo(() => snapshot ? topEntries(countBy(snapshot.users, "learningLevel")) : [], [snapshot]);
  const activeGrowth = snapshot ? { day: snapshot.stats.activeTodayUsers ?? 0, week: snapshot.stats.activeWeekUsers ?? 0, month: snapshot.stats.activeMonthUsers ?? 0 } : null;
  if (!snapshot) return <div className="creator-snapshot-intelligence"><div className="creator-loading">Loading expanded Creator intelligence…</div>{error && <div className="creator-error">{error}</div>}</div>;
  const { stats, consent, mentors, community, genetics } = snapshot;
  const tiles: Array<{ key: TileKey; icon: string; value: string | number; label: string; detail: string }> = [
    { key: "users", icon: "👥", value: stats.registeredUsers, label: "Users & Consent", detail: `${consent.accepted} community contributors · ${consent.declined} declined · ${consent.unset} not established` },
    { key: "snakes", icon: "🐍", value: stats.snakeProfiles, label: "Snake Population", detail: `${stats.usersWithData ?? 0} contributing keepers · ${stats.engagedUsers ?? 0} keepers with snakes` },
    { key: "husbandry", icon: "📊", value: stats.mealsFed + stats.weightLogs + stats.shedsLogged, label: "Husbandry Activity", detail: `${fmt(stats.mealsFed)} feeds · ${fmt(stats.weightLogs)} weights · ${fmt(stats.shedsLogged)} sheds` },
    { key: "community", icon: "🌍", value: stats.communityContributors ?? 0, label: "Community & Geography", detail: `${consent.location} location-sharing accounts · consent gated` },
    { key: "mentorship", icon: "🤝", value: mentors.published, label: "Mentor Network", detail: `${mentors.accepting} accepting mentees · ${mentors.activeWorkspaces} active workspaces` },
    { key: "learning", icon: "🎓", value: stats.activatedUsers ?? 0, label: "Learning & Experience", detail: `${usersByLearning.length} learning levels · ${usersByExperience.length} experience groups` },
    { key: "genetics", icon: "🧬", value: genetics.calculations, label: "Genetics & Morphs", detail: `${genetics.approvedMorphImages} approved images · ${community.pendingMorphs} pending submissions` },
    { key: "operations", icon: "🛠️", value: community.issues + community.feedback, label: "Community Operations", detail: `${community.activeIssues} active issues · ${community.feedback} feedback records` },
    { key: "data", icon: "🔎", value: stats.dataQualityIssues ?? 0, label: "Data Quality", detail: `${stats.invalidWeightLogs ?? 0} invalid weights · ${stats.invalidShedLogs ?? 0} invalid sheds` },
    { key: "growth", icon: "📈", value: activeGrowth?.month ?? 0, label: "Adoption & Activity", detail: `${activeGrowth?.day ?? 0} today · ${activeGrowth?.week ?? 0} week · ${activeGrowth?.month ?? 0} month` },
  ];
  const renderDetails = () => { switch (selected) {
    case "users": return <><DetailLine label="Registered accounts" value={stats.registeredUsers} /><DetailLine label="With snake profiles" value={stats.engagedUsers ?? 0} /><DetailLine label="Community consent ON" value={consent.accepted} note={pct(consent.accepted, stats.registeredUsers)} /><DetailLine label="Explicitly declined" value={consent.declined} /><DetailLine label="Preference not established" value={consent.unset} /><DetailLine label="Location sharing ON" value={consent.location} /><DetailLine label="Anonymous analytics ON" value={consent.analytics} /></>;
    case "snakes": return <><DetailLine label="Contributing snake profiles" value={stats.snakeProfiles} /><DetailLine label="Contributing keepers" value={stats.communityContributors ?? 0} /><DetailLine label="All keepers with snakes" value={stats.engagedUsers ?? 0} /><DetailLine label="Feeds recorded" value={stats.mealsFed} /><DetailLine label="Weight records" value={stats.weightLogs} /><DetailLine label="Shed cycles" value={stats.shedsLogged} /><DetailLine label="Average snakes / contributor" value={stats.communityContributors ? (stats.snakeProfiles / stats.communityContributors).toFixed(1) : "—"} /></>;
    case "husbandry": return <><DetailLine label="Meals fed" value={stats.mealsFed} /><DetailLine label="Weight records" value={stats.weightLogs} /><DetailLine label="Valid weight records" value={stats.validWeightLogs ?? stats.weightLogs} /><DetailLine label="Shed cycles" value={stats.shedsLogged} /><DetailLine label="Valid shed measurements" value={stats.validShedLogs ?? stats.shedsLogged} /><DetailLine label="Recorded shed length" value={`${(stats.totalShedLengthCm / 100).toFixed(2)} m`} /></>;
    case "community": return <><DetailLine label="Consent-eligible contributors" value={stats.communityContributors ?? 0} /><DetailLine label="Location sharing enabled" value={consent.location} /><DetailLine label="Community posts" value={community.posts} /><DetailLine label="Community feedback" value={community.feedback} /><DetailLine label="Privacy model" value="Explicit consent + city-level" /></>;
    case "mentorship": return <><DetailLine label="Published mentors" value={mentors.published} /><DetailLine label="Accepting new mentees" value={mentors.accepting} /><DetailLine label="Mentor applications" value={mentors.applications} /><DetailLine label="Applications pending" value={mentors.pending} /><DetailLine label="Mentorship requests" value={mentors.requests} /><DetailLine label="Active requests" value={mentors.activeRequests} /><DetailLine label="Workspaces" value={mentors.workspaces} /><DetailLine label="Active workspaces" value={mentors.activeWorkspaces} /></>;
    case "learning": return <><DetailLine label="Activated profiles" value={stats.activatedUsers ?? 0} /><DetailLine label="Incomplete profiles" value={stats.incompleteUserProfiles ?? 0} /><div className="creator-snapshot-subheading">Learning levels</div>{usersByLearning.map(([name, count]) => <DetailLine key={name} label={name} value={count} note={pct(count, stats.registeredUsers)} />)}<div className="creator-snapshot-subheading">Experience</div>{usersByExperience.map(([name, count]) => <DetailLine key={name} label={name} value={count} note={pct(count, stats.registeredUsers)} />)}</>;
    case "genetics": return <><DetailLine label="Persisted genetics calculations" value={genetics.calculations} /><DetailLine label="Approved morph images" value={genetics.approvedMorphImages} /><DetailLine label="Morph submissions" value={community.morphSubmissions} /><DetailLine label="Pending morph submissions" value={community.pendingMorphs} /></>;
    case "operations": return <><DetailLine label="Community posts" value={community.posts} /><DetailLine label="Feedback records" value={community.feedback} /><DetailLine label="Bug / issue reports" value={community.issues} /><DetailLine label="Active issues" value={community.activeIssues} /><DetailLine label="Morph submissions" value={community.morphSubmissions} /></>;
    case "data": return <><DetailLine label="Data-quality candidates" value={stats.dataQualityIssues ?? 0} /><DetailLine label="Invalid weight records" value={stats.invalidWeightLogs ?? 0} /><DetailLine label="Invalid shed records" value={stats.invalidShedLogs ?? 0} /><DetailLine label="Legacy weight candidates" value={stats.legacyWeightCandidates ?? 0} /><DetailLine label="Valid weight coverage" value={pct(stats.validWeightLogs ?? 0, stats.weightLogs)} /></>;
    case "growth": return <><DetailLine label="Active today" value={activeGrowth?.day ?? 0} /><DetailLine label="Active this week" value={activeGrowth?.week ?? 0} /><DetailLine label="Active this month" value={activeGrowth?.month ?? 0} /><DetailLine label="Activated accounts" value={stats.activatedUsers ?? 0} /><DetailLine label="Engaged keepers" value={stats.engagedUsers ?? 0} /></>;
    default: return null;
  } };
  return <section className="creator-snapshot-intelligence" aria-label="Expanded live creator snapshot"><div className="creator-snapshot-grid">{tiles.map((tile) => <button key={tile.key} type="button" className={`creator-global-card creator-snapshot-tile ${selected === tile.key ? "is-selected" : ""}`} onClick={() => setSelected((current) => current === tile.key ? null : tile.key)}><span>{tile.icon}</span><strong>{typeof tile.value === "number" ? fmt(tile.value) : tile.value}</strong><label>{tile.label}</label><small>{tile.detail}</small><em>{selected === tile.key ? "Hide intelligence ↑" : "Tap for intelligence →"}</em></button>)}</div>{selected && <article className="creator-snapshot-detail"><div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">LIVE TILE INTELLIGENCE</span><h3>{tiles.find((tile) => tile.key === selected)?.icon} {tiles.find((tile) => tile.key === selected)?.label}</h3><p>Calculated from current Creator Centre data. Privacy-controlled records are excluded from community metrics unless the required permission is explicitly enabled.</p></div><button type="button" onClick={() => setSelected(null)}>✕</button></div><div className="creator-snapshot-detail-grid">{renderDetails()}</div></article>}</section>;
}
