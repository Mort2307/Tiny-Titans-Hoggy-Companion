import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { getGlobalStats, type GlobalStats } from "../services/creatorService";

type UserRecord = Record<string, unknown>;
type TileKey = "users" | "snakes" | "husbandry" | "community" | "mentorship" | "learning" | "genetics" | "operations" | "data" | "growth";
type ConsentState = { community: boolean; location: boolean; analytics: boolean; established: boolean };
type DrillRecord = { id: string; source: string; kind: string; ownerId?: string; ownerName?: string; title: string; status?: string; category?: string; date?: string; summary?: string; meta: string[] };
type UserDetailFilter = "all" | "snakes" | "community" | "declined" | "unset" | "location" | "analytics";
type OperationsDetailFilter = "all" | "posts" | "feedback" | "issues" | "activeIssues" | "morphs";
type DetailFilter = UserDetailFilter | OperationsDetailFilter;
type Snapshot = {
  stats: GlobalStats;
  users: UserRecord[];
  userIds: string[];
  consentByUser: Record<string, ConsentState>;
  consent: { accepted: number; declined: number; unset: number; location: number; analytics: number };
  mentors: { published: number; accepting: number; applications: number; pending: number; requests: number; activeRequests: number; workspaces: number; activeWorkspaces: number };
  community: { posts: number; feedback: number; issues: number; activeIssues: number; morphSubmissions: number; pendingMorphs: number };
  genetics: { calculations: number; approvedMorphImages: number };
  records: Record<TileKey, DrillRecord[]>;
  unavailableSources: string[];
};

const fmt = (value: number) => new Intl.NumberFormat("en-GB").format(value);
const pct = (value: number, total: number) => total > 0 ? `${Math.round((value / total) * 100)}%` : "—";
const text = (value: unknown, fallback = "Not recorded") => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};
const dateText = (value: unknown) => {
  if (!value) return undefined;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString("en-GB");
  }
  return undefined;
};
const countBy = (items: UserRecord[], key: string) => items.reduce<Record<string, number>>((acc, item) => {
  const value = text(item[key], "Unknown");
  acc[value] = (acc[value] ?? 0) + 1;
  return acc;
}, {});
const topEntries = (record: Record<string, number>, limit = 8) => Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, limit);
const normalizedStatus = (value: unknown) => text(value, "").trim().toLowerCase();
const isClosedIssue = (record: DrillRecord) => ["resolved", "closed", "archived", "complete", "completed"].includes(normalizedStatus(record.status));

async function safeCollection(name: string, unavailableSources: string[]): Promise<QuerySnapshot<DocumentData> | null> {
  try { return await getDocs(collection(db, name)); }
  catch { unavailableSources.push(name); return null; }
}

function docs(snapshot: QuerySnapshot<DocumentData> | null): Array<{ id: string; data: UserRecord }> {
  return snapshot?.docs.map((item) => ({ id: item.id, data: item.data() as UserRecord })) ?? [];
}

function displayName(user: UserRecord | undefined, fallback = "Community contributor") {
  return text(user?.displayName ?? user?.name ?? user?.username ?? user?.firstName, fallback);
}

function ownerId(data: UserRecord) {
  const candidate = data.userId ?? data.uid ?? data.ownerUid ?? data.authorUid ?? data.submittedBy ?? data.createdBy;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

function makeRecord(id: string, source: string, kind: string, data: UserRecord, usersById: Map<string, UserRecord>, explicitOwnerId?: string): DrillRecord {
  const owner = explicitOwnerId ?? ownerId(data);
  const user = owner ? usersById.get(owner) : undefined;
  const status = data.archived === true ? "Archived" : text(data.status, "Recorded");
  const category = data.category ?? data.source ?? data.type;
  const date = dateText(data.createdAt ?? data.submittedAt ?? data.updatedAt ?? data.date ?? data.timestamp);
  const title = text(data.title ?? data.name ?? data.morphName ?? data.subject, `${kind} record`);
  const summary = text(data.summary ?? data.description ?? data.message ?? data.content, "No public summary recorded");
  const meta = [
    category ? `Category: ${text(category)}` : undefined,
    data.priority ? `Priority: ${text(data.priority)}` : undefined,
    data.source ? `Area: ${text(data.source)}` : undefined,
  ].filter((item): item is string => Boolean(item));
  return { id, source, kind, ownerId: owner, ownerName: displayName(user), title, status, category: category ? text(category) : undefined, date, summary: summary.slice(0, 220), meta };
}

async function loadSnapshot(): Promise<Snapshot> {
  const unavailableSources: string[] = [];
  const stats = await getGlobalStats();
  const [usersSnapshot, mentorsSnapshot, mentorApplications, mentorshipRequests, workspaces, posts, feedback, issues, morphSubmissions, approvedMorphImages, geneticsCalculations] = await Promise.all([
    safeCollection("users", unavailableSources),
    safeCollection("mentors", unavailableSources),
    safeCollection("mentorApplications", unavailableSources),
    safeCollection("mentorshipRequests", unavailableSources),
    safeCollection("mentorshipWorkspaces", unavailableSources),
    safeCollection("communityPosts", unavailableSources),
    safeCollection("feedback", unavailableSources),
    safeCollection("issueReports", unavailableSources),
    safeCollection("morphImageSubmissions", unavailableSources),
    safeCollection("approvedMorphImages", unavailableSources),
    safeCollection("geneticsCalculations", unavailableSources),
  ]);

  const userDocs = docs(usersSnapshot);
  const users = userDocs.map((item) => item.data);
  const userIds = userDocs.map((item) => item.id);
  const usersById = new Map(userDocs.map((item) => [item.id, item.data]));
  const consentByUser: Record<string, ConsentState> = {};
  let accepted = 0;
  let declined = 0;
  let unset = 0;
  let location = 0;
  let analytics = 0;

  await Promise.all(userIds.map(async (uid) => {
    try {
      const privacySnapshot = await getDoc(doc(db, "users", uid, "settings", "privacy"));
      if (!privacySnapshot.exists()) {
        consentByUser[uid] = { community: false, location: false, analytics: false, established: false };
        unset += 1;
        return;
      }
      const privacy = privacySnapshot.data() as UserRecord;
      const state: ConsentState = {
        community: privacy.communityHusbandryData === true,
        location: privacy.communityLocation === true,
        analytics: privacy.anonymousAnalytics === true,
        established: true,
      };
      consentByUser[uid] = state;
      if (state.community) accepted += 1; else declined += 1;
      if (state.location) location += 1;
      if (state.analytics) analytics += 1;
    } catch {
      consentByUser[uid] = { community: false, location: false, analytics: false, established: false };
      unset += 1;
    }
  }));

  const mentorRecords = docs(mentorsSnapshot);
  const applicationRecords = docs(mentorApplications);
  const requestRecords = docs(mentorshipRequests);
  const workspaceRecords = docs(workspaces);
  const postRecords = docs(posts);
  const feedbackRecords = docs(feedback);
  const issueRecords = docs(issues);
  const morphRecords = docs(morphSubmissions);
  const approvedRecords = docs(approvedMorphImages);
  const geneticsRecords = docs(geneticsCalculations);
  const communityEligibleUsers = userDocs.filter(({ id }) => consentByUser[id]?.community);

  const records: Record<TileKey, DrillRecord[]> = {
    users: userDocs.map(({ id, data }) => makeRecord(id, "users", "Account", data, usersById, id)),
    snakes: communityEligibleUsers.map(({ id, data }) => makeRecord(id, "users", "Contributing keeper", data, usersById, id)),
    husbandry: communityEligibleUsers.map(({ id, data }) => makeRecord(id, "users", "Husbandry contributor", data, usersById, id)),
    community: [
      ...postRecords.map(({ id, data }) => makeRecord(id, "communityPosts", "Community post", data, usersById)),
      ...feedbackRecords.map(({ id, data }) => makeRecord(id, "feedback", "Feedback", data, usersById)),
      ...issueRecords.map(({ id, data }) => makeRecord(id, "issueReports", "Bug / issue", data, usersById)),
      ...morphRecords.map(({ id, data }) => makeRecord(id, "morphImageSubmissions", "Morph submission", data, usersById)),
    ],
    mentorship: [
      ...mentorRecords.map(({ id, data }) => makeRecord(id, "mentors", "Mentor", data, usersById)),
      ...applicationRecords.map(({ id, data }) => makeRecord(id, "mentorApplications", "Mentor application", data, usersById)),
      ...requestRecords.map(({ id, data }) => makeRecord(id, "mentorshipRequests", "Mentorship request", data, usersById)),
      ...workspaceRecords.map(({ id, data }) => makeRecord(id, "mentorshipWorkspaces", "Mentorship workspace", data, usersById)),
    ],
    learning: userDocs.map(({ id, data }) => makeRecord(id, "users", "Learning participant", data, usersById, id)),
    genetics: [
      ...geneticsRecords.map(({ id, data }) => makeRecord(id, "geneticsCalculations", "Genetics calculation", data, usersById)),
      ...morphRecords.map(({ id, data }) => makeRecord(id, "morphImageSubmissions", "Morph submission", data, usersById)),
      ...approvedRecords.map(({ id, data }) => makeRecord(id, "approvedMorphImages", "Approved morph image", data, usersById)),
    ],
    operations: [
      ...issueRecords.map(({ id, data }) => makeRecord(id, "issueReports", "Bug / issue", data, usersById)),
      ...feedbackRecords.map(({ id, data }) => makeRecord(id, "feedback", "Feedback", data, usersById)),
      ...postRecords.map(({ id, data }) => makeRecord(id, "communityPosts", "Community post", data, usersById)),
      ...morphRecords.map(({ id, data }) => makeRecord(id, "morphImageSubmissions", "Morph submission", data, usersById)),
    ],
    data: communityEligibleUsers.map(({ id, data }) => makeRecord(id, "users", "Data contributor", data, usersById, id)),
    growth: userDocs.map(({ id, data }) => makeRecord(id, "users", "Account activity", data, usersById, id)),
  };

  const mentorData = mentorRecords.map((item) => item.data);
  const applicationData = applicationRecords.map((item) => item.data);
  const requestData = requestRecords.map((item) => item.data);
  const workspaceData = workspaceRecords.map((item) => item.data);
  const issueData = issueRecords.map((item) => item.data);
  const morphData = morphRecords.map((item) => item.data);
  const issueDrillRecords = records.operations.filter((record) => record.source === "issueReports");

  return {
    stats: { ...stats, geneticsCalculations: geneticsRecords.length || stats.geneticsCalculations },
    users,
    userIds,
    consentByUser,
    consent: { accepted, declined, unset, location, analytics },
    mentors: {
      published: mentorData.length,
      accepting: mentorData.filter((item) => item.acceptingNewMentees === true || item.acceptingRequests === true).length,
      applications: applicationData.length,
      pending: applicationData.filter((item) => ["pending", "Pending"].includes(text(item.status, ""))).length,
      requests: requestData.length,
      activeRequests: requestData.filter((item) => ["sent", "accepted", "active", "Sent", "Accepted", "Active"].includes(text(item.status, ""))).length,
      workspaces: workspaceData.length,
      activeWorkspaces: workspaceData.filter((item) => normalizedStatus(item.status) === "active").length,
    },
    community: {
      posts: postRecords.length,
      feedback: feedbackRecords.length,
      issues: issueData.length,
      activeIssues: issueDrillRecords.filter((record) => !isClosedIssue(record)).length,
      morphSubmissions: morphData.length,
      pendingMorphs: morphData.filter((item) => ["pending", "needsinfo"].includes(normalizedStatus(item.status))).length,
    },
    genetics: { calculations: geneticsRecords.length || stats.geneticsCalculations, approvedMorphImages: approvedRecords.length },
    records,
    unavailableSources: [...new Set(unavailableSources)],
  };
}

function DetailLine({ label, value, note, onClick }: { label: string; value: string | number; note?: string; onClick?: () => void }) {
  const content = <><span><strong>{label}</strong>{note && <small>{note}</small>}</span><strong>{typeof value === "number" ? fmt(value) : value}</strong></>;
  return onClick ? <button type="button" className="creator-snapshot-detail-line creator-snapshot-detail-button" onClick={onClick}>{content}</button> : <div className="creator-snapshot-detail-line">{content}</div>;
}

function RecordCard({ record, onOpen }: { record: DrillRecord; onOpen: () => void }) {
  return <button type="button" className="creator-snapshot-record" onClick={onOpen}>
    <span className="creator-snapshot-record-kind">{record.kind}</span>
    <strong>{record.title}</strong>
    <small>{record.ownerName}{record.date ? ` · ${record.date}` : ""}</small>
    <span>{record.status}{record.category ? ` · ${record.category}` : ""}</span>
  </button>;
}

export default function CreatorSnapshotIntelligence() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<TileKey | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DrillRecord | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("all");
  const [error, setError] = useState("");

  const reload = async () => {
    setError("");
    setSelectedRecord(null);
    setSelectedUserId(null);
    try { setSnapshot(await loadSnapshot()); }
    catch (err) { setError(err instanceof Error ? err.message : "Creator intelligence could not be loaded."); }
  };
  useEffect(() => { void reload(); }, []);

  const usersByExperience = useMemo(() => snapshot ? topEntries(countBy(snapshot.users, "experienceLevel")) : [], [snapshot]);
  const usersByLearning = useMemo(() => snapshot ? topEntries(countBy(snapshot.users, "learningLevel")) : [], [snapshot]);
  const activeGrowth = snapshot ? { day: snapshot.stats.activeTodayUsers ?? 0, week: snapshot.stats.activeWeekUsers ?? 0, month: snapshot.stats.activeMonthUsers ?? 0 } : { day: 0, week: 0, month: 0 };

  const tiles = useMemo(() => snapshot ? [
    { key: "users" as const, icon: "👥", value: snapshot.stats.registeredUsers, label: "Users & Consent", detail: `${snapshot.consent.accepted} contributors · ${snapshot.consent.declined} declined · ${snapshot.consent.unset} not established` },
    { key: "snakes" as const, icon: "🐍", value: snapshot.stats.snakeProfiles, label: "Snake Population", detail: `${snapshot.stats.usersWithData ?? 0} contributing keepers · ${snapshot.stats.engagedUsers ?? 0} engaged keepers` },
    { key: "husbandry" as const, icon: "📊", value: snapshot.stats.mealsFed + snapshot.stats.weightLogs + snapshot.stats.shedsLogged, label: "Husbandry Activity", detail: `${fmt(snapshot.stats.mealsFed)} feeds · ${fmt(snapshot.stats.weightLogs)} weights · ${fmt(snapshot.stats.shedsLogged)} sheds` },
    { key: "community" as const, icon: "🌍", value: snapshot.stats.communityContributors ?? 0, label: "Community & Geography", detail: `${snapshot.consent.location} location-sharing accounts · consent gated` },
    { key: "mentorship" as const, icon: "🤝", value: snapshot.mentors.published, label: "Mentor Network", detail: `${snapshot.mentors.accepting} accepting · ${snapshot.mentors.activeWorkspaces} active workspaces` },
    { key: "learning" as const, icon: "🎓", value: snapshot.stats.activatedUsers ?? 0, label: "Learning & Experience", detail: `${usersByLearning.length} learning levels · ${usersByExperience.length} experience groups` },
    { key: "genetics" as const, icon: "🧬", value: snapshot.genetics.calculations, label: "Genetics & Morphs", detail: `${snapshot.genetics.approvedMorphImages} approved images · ${snapshot.community.pendingMorphs} pending submissions` },
    { key: "operations" as const, icon: "🛠", value: snapshot.community.issues + snapshot.community.feedback, label: "Community Operations", detail: `${snapshot.community.activeIssues} active issues · ${snapshot.community.feedback} feedback records` },
    { key: "data" as const, icon: "🔎", value: snapshot.stats.dataQualityIssues ?? 0, label: "Data Quality", detail: `${snapshot.stats.invalidWeightLogs ?? 0} invalid weights · ${snapshot.stats.invalidShedLogs ?? 0} invalid sheds` },
    { key: "growth" as const, icon: "📈", value: activeGrowth.month, label: "Adoption & Activity", detail: `${activeGrowth.day} today · ${activeGrowth.week} week · ${activeGrowth.month} month` },
  ] : [], [snapshot, usersByLearning.length, usersByExperience.length, activeGrowth.day, activeGrowth.week, activeGrowth.month]);

  const openTile = (key: TileKey) => {
    setSelected(current => current === key ? null : key);
    setSelectedRecord(null);
    setSelectedUserId(null);
    setDetailFilter("all");
  };
  const selectFilter = (filter: DetailFilter) => {
    setDetailFilter(current => current === filter ? "all" : filter);
    setSelectedRecord(null);
    setSelectedUserId(null);
  };

  const tileRecords = useMemo(() => {
    if (!snapshot || !selected) return [];
    const base = snapshot.records[selected];
    if (detailFilter === "all") return base;
    if (selected === "users") {
      const userRecords = snapshot.records.users;
      const userRecordAt = (index: number) => userRecords.find(record => record.id === snapshot.userIds[index]);
      switch (detailFilter as UserDetailFilter) {
        case "snakes": return snapshot.users.map((user, index) => Number(user.snakeCount ?? user.numberOfSnakes ?? 0) > 0 ? userRecordAt(index) : undefined).filter((record): record is DrillRecord => Boolean(record));
        case "community": return snapshot.users.map((_, index) => snapshot.consentByUser[snapshot.userIds[index]]?.community ? userRecordAt(index) : undefined).filter((record): record is DrillRecord => Boolean(record));
        case "declined": return snapshot.users.map((_, index) => { const consent = snapshot.consentByUser[snapshot.userIds[index]]; return consent?.established && !consent.community ? userRecordAt(index) : undefined; }).filter((record): record is DrillRecord => Boolean(record));
        case "unset": return snapshot.users.map((_, index) => !snapshot.consentByUser[snapshot.userIds[index]]?.established ? userRecordAt(index) : undefined).filter((record): record is DrillRecord => Boolean(record));
        case "location": return snapshot.users.map((_, index) => snapshot.consentByUser[snapshot.userIds[index]]?.location ? userRecordAt(index) : undefined).filter((record): record is DrillRecord => Boolean(record));
        case "analytics": return snapshot.users.map((_, index) => snapshot.consentByUser[snapshot.userIds[index]]?.analytics ? userRecordAt(index) : undefined).filter((record): record is DrillRecord => Boolean(record));
        default: return base;
      }
    }
    if (selected === "operations") {
      switch (detailFilter as OperationsDetailFilter) {
        case "posts": return base.filter(record => record.source === "communityPosts");
        case "feedback": return base.filter(record => record.source === "feedback");
        case "issues": return base.filter(record => record.source === "issueReports");
        case "activeIssues": return base.filter(record => record.source === "issueReports" && !isClosedIssue(record));
        case "morphs": return base.filter(record => record.source === "morphImageSubmissions");
        default: return base;
      }
    }
    return base;
  }, [detailFilter, selected, snapshot]);

  const selectedUser = snapshot && selectedUserId ? snapshot.users[snapshot.userIds.indexOf(selectedUserId)] : undefined;
  const selectedTile = tiles.find(tile => tile.key === selected);
  const activeFilterLabel: Record<string, string> = { all: "All records", snakes: "Keepers with snake profiles", community: "Community consent ON", declined: "Explicitly declined", unset: "Preference not established", location: "Location sharing ON", analytics: "Anonymous analytics ON", posts: "Community posts", feedback: "Feedback records", issues: "Bug / issue reports", activeIssues: "Active issues", morphs: "Morph submissions" };

  const renderDetails = () => {
    if (!snapshot || !selected) return null;
    const { stats, consent, mentors, community, genetics } = snapshot;
    const userFilter = (filter: UserDetailFilter) => selectFilter(filter);
    const operationsFilter = (filter: OperationsDetailFilter) => selectFilter(filter);
    switch (selected) {
      case "users": return <><DetailLine label="Registered accounts" value={stats.registeredUsers} onClick={() => userFilter("all")} /><DetailLine label="With snake profiles" value={stats.engagedUsers ?? 0} onClick={() => userFilter("snakes")} /><DetailLine label="Community consent ON" value={consent.accepted} note={pct(consent.accepted, stats.registeredUsers)} onClick={() => userFilter("community")} /><DetailLine label="Explicitly declined" value={consent.declined} onClick={() => userFilter("declined")} /><DetailLine label="Preference not established" value={consent.unset} onClick={() => userFilter("unset")} /><DetailLine label="Location sharing ON" value={consent.location} onClick={() => userFilter("location")} /><DetailLine label="Anonymous analytics ON" value={consent.analytics} onClick={() => userFilter("analytics")} /></>;
      case "snakes": return <><DetailLine label="Snake profiles" value={stats.snakeProfiles} /><DetailLine label="Engaged keepers" value={stats.engagedUsers ?? 0} /><DetailLine label="Consent-eligible keepers" value={consent.accepted} /><DetailLine label="Feeds recorded" value={stats.mealsFed} /><DetailLine label="Weight records" value={stats.weightLogs} /><DetailLine label="Shed cycles" value={stats.shedsLogged} /></>;
      case "husbandry": return <><DetailLine label="Meals fed" value={stats.mealsFed} /><DetailLine label="Weight records" value={stats.weightLogs} /><DetailLine label="Valid weight records" value={stats.validWeightLogs ?? stats.weightLogs} /><DetailLine label="Shed cycles" value={stats.shedsLogged} /><DetailLine label="Valid shed measurements" value={stats.validShedLogs ?? stats.shedsLogged} /><DetailLine label="Recorded shed length" value={`${(stats.totalShedLengthCm / 100).toFixed(2)} m`} /><DetailLine label="Eligible contributors" value={consent.accepted} /></>;
      case "community": return <><DetailLine label="Consent-eligible contributors" value={stats.communityContributors ?? 0} /><DetailLine label="Location sharing enabled" value={consent.location} /><DetailLine label="Community posts" value={community.posts} /><DetailLine label="Community feedback" value={community.feedback} /><DetailLine label="Bug / issue reports" value={community.issues} /><DetailLine label="Morph submissions" value={community.morphSubmissions} /><DetailLine label="Privacy model" value="Explicit consent + city-level" /></>;
      case "mentorship": return <><DetailLine label="Published mentors" value={mentors.published} /><DetailLine label="Accepting new mentees" value={mentors.accepting} /><DetailLine label="Mentor applications" value={mentors.applications} /><DetailLine label="Applications pending" value={mentors.pending} /><DetailLine label="Mentorship requests" value={mentors.requests} /><DetailLine label="Active requests" value={mentors.activeRequests} /><DetailLine label="Workspaces" value={mentors.workspaces} /><DetailLine label="Active workspaces" value={mentors.activeWorkspaces} /></>;
      case "learning": return <><DetailLine label="Activated profiles" value={stats.activatedUsers ?? 0} /><DetailLine label="Incomplete profiles" value={stats.incompleteUserProfiles ?? 0} /><div className="creator-snapshot-subheading">Learning levels</div>{usersByLearning.map(([name, count]) => <DetailLine key={name} label={name} value={count} note={pct(count, stats.registeredUsers)} />)}<div className="creator-snapshot-subheading">Experience</div>{usersByExperience.map(([name, count]) => <DetailLine key={name} label={name} value={count} note={pct(count, stats.registeredUsers)} />)}</>;
      case "genetics": return <><DetailLine label="Persisted genetics calculations" value={genetics.calculations} /><DetailLine label="Approved morph images" value={genetics.approvedMorphImages} /><DetailLine label="Morph submissions" value={community.morphSubmissions} /><DetailLine label="Pending morph submissions" value={community.pendingMorphs} /></>;
      case "operations": return <><DetailLine label="Community posts" value={community.posts} onClick={() => operationsFilter("posts")} /><DetailLine label="Feedback records" value={community.feedback} onClick={() => operationsFilter("feedback")} /><DetailLine label="Bug / issue reports" value={community.issues} onClick={() => operationsFilter("issues")} /><DetailLine label="Active issues" value={community.activeIssues} onClick={() => operationsFilter("activeIssues")} /><DetailLine label="Morph submissions" value={community.morphSubmissions} onClick={() => operationsFilter("morphs")} /></>;
      case "data": return <><DetailLine label="Data-quality candidates" value={stats.dataQualityIssues ?? 0} /><DetailLine label="Invalid weight records" value={stats.invalidWeightLogs ?? 0} /><DetailLine label="Invalid shed records" value={stats.invalidShedLogs ?? 0} /><DetailLine label="Legacy weight candidates" value={stats.legacyWeightCandidates ?? 0} /><DetailLine label="Valid weight coverage" value={pct(stats.validWeightLogs ?? 0, stats.weightLogs)} /></>;
      case "growth": return <><DetailLine label="Active today" value={activeGrowth.day} /><DetailLine label="Active this week" value={activeGrowth.week} /><DetailLine label="Active this month" value={activeGrowth.month} /><DetailLine label="Activated accounts" value={stats.activatedUsers ?? 0} /><DetailLine label="Engaged keepers" value={stats.engagedUsers ?? 0} /></>;
      default: return null;
    }
  };

  return <section className="creator-snapshot-intelligence" aria-label="Expanded live creator snapshot">
    <div className="creator-intelligence-toolbar"><div><span className="creator-admin-kicker">LIVE TILE INTELLIGENCE</span><p>Every aggregate can be explored down to creator-safe records. Private identifiers, email addresses, exact locations and private husbandry/health data are not displayed.</p></div><button type="button" onClick={() => void reload()}>↻ Refresh intelligence</button></div>
    {snapshot?.unavailableSources.length ? <div className="creator-intelligence-source-note" role="status">Unavailable sources: {snapshot.unavailableSources.join(", ")}. These are shown as unavailable rather than silently counted as zero.</div> : null}
    {error ? <div className="creator-intelligence-source-note" role="alert">{error}</div> : null}
    {!snapshot && !error ? <div className="creator-loading">Loading expanded Creator intelligence…</div> : null}
    <div className="creator-snapshot-grid">{tiles.map(tile => <button key={tile.key} type="button" className={`creator-global-card creator-snapshot-tile ${selected === tile.key ? "is-selected" : ""}`} onClick={() => openTile(tile.key)}><span>{tile.icon}</span><strong>{fmt(tile.value)}</strong><label>{tile.label}</label><small>{tile.detail}</small><em>{selected === tile.key ? "Hide intelligence ↑" : "Tap for intelligence →"}</em></button>)}</div>
    {selected && snapshot && <article className="creator-snapshot-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">EXPLORABLE INTELLIGENCE</span><h3>{selectedTile?.icon} {selectedTile?.label}</h3><p>Calculated from the current Creator Centre dataset. Tap a metric to filter its creator-safe source records.</p></div><button type="button" onClick={() => openTile(selected)}>✕</button></div>
      <div className="creator-snapshot-detail-grid">{renderDetails()}</div>
      {detailFilter !== "all" && <div className="creator-snapshot-source-note" role="status"><strong>{activeFilterLabel[detailFilter]}</strong> · {fmt(tileRecords.length)} matching records <button type="button" onClick={() => setDetailFilter("all")}>Clear filter</button></div>}
      {tileRecords.length > 0 && <div className="creator-snapshot-record-section"><div className="creator-snapshot-subheading">Source records · {fmt(tileRecords.length)}</div><div className="creator-snapshot-record-grid">{tileRecords.slice(0, 100).map(record => <RecordCard key={`${record.source}-${record.id}`} record={record} onOpen={() => { setSelectedRecord(record); setSelectedUserId(record.ownerId ?? null); }} />)}</div>{tileRecords.length > 100 && <small>Showing the first 100 records. The aggregate count remains the authoritative total.</small>}</div>}
      {tileRecords.length === 0 && <div className="creator-snapshot-empty">No directly drillable records are available for this filter. The aggregate remains available from the canonical Creator statistics service.</div>}
    </article>}
    {selectedRecord && <article className="creator-snapshot-record-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">RECORD PROVENANCE</span><h3>{selectedRecord.kind}: {selectedRecord.title}</h3><p>This view deliberately exposes only Creator-safe application information.</p></div><button type="button" onClick={() => setSelectedRecord(null)}>✕</button></div>
      <div className="creator-snapshot-detail-grid"><DetailLine label="Contributor" value={selectedRecord.ownerName ?? "Community contributor"} onClick={selectedRecord.ownerId ? () => setSelectedUserId(selectedRecord.ownerId!) : undefined} /><DetailLine label="Source" value={selectedRecord.source} /><DetailLine label="Status" value={selectedRecord.status ?? "Recorded"} />{selectedRecord.category && <DetailLine label="Category" value={selectedRecord.category} />}{selectedRecord.date && <DetailLine label="Recorded" value={selectedRecord.date} />}{selectedRecord.meta.map(item => <DetailLine key={item} label="Context" value={item} />)}</div>
      <div className="creator-snapshot-safe-note"><strong>Privacy boundary</strong><span>No UID, email address, exact GPS/address, private health data or private husbandry notes are rendered here.</span></div>
    </article>}
    {selectedUser && selectedUserId && <article className="creator-snapshot-record-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">CREATOR-SAFE ACCOUNT INTELLIGENCE</span><h3>{displayName(selectedUser)}</h3><p>Public application profile and contribution signals only.</p></div><button type="button" onClick={() => setSelectedUserId(null)}>✕</button></div>
      <div className="creator-snapshot-detail-grid"><DetailLine label="Experience" value={text(selectedUser.experienceLevel)} /><DetailLine label="Learning level" value={text(selectedUser.learningLevel)} /><DetailLine label="Account activity" value={text(selectedUser.lastActiveAt ?? selectedUser.lastActive)} /><DetailLine label="Snake profile signal" value={text(selectedUser.snakeCount ?? selectedUser.numberOfSnakes)} /><DetailLine label="Community role" value={text(selectedUser.role, "User")} /><DetailLine label="Community contribution" value={(snapshot?.consentByUser ?? {})[selectedUserId]?.established ? ((snapshot?.consentByUser ?? {})[selectedUserId]?.community ? "Enabled" : "Disabled") : "Not established"} /><DetailLine label="Location contribution" value={(snapshot?.consentByUser ?? {})[selectedUserId]?.location ? "Enabled" : "Not enabled"} /><DetailLine label="Anonymous analytics" value={(snapshot?.consentByUser ?? {})[selectedUserId]?.analytics ? "Enabled" : "Not enabled"} /></div>
      <div className="creator-snapshot-safe-note"><strong>Privacy boundary</strong><span>The Creator Centre uses account-level provenance without exposing the account email or Firebase UID.</span></div>
    </article>}
  </section>;
}
