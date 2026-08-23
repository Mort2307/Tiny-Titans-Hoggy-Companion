import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { getGlobalStats, type GlobalStats } from "../services/creatorService";

type UserRecord = Record<string, unknown>;
type TileKey = "users" | "snakes" | "husbandry" | "community" | "mentorship" | "learning" | "genetics" | "operations" | "data" | "growth";
type DrillRecord = { id: string; source: string; kind: string; ownerId?: string; ownerName?: string; title: string; status?: string; category?: string; date?: string; summary?: string; meta: string[] };
type Snapshot = {
  stats: GlobalStats;
  users: UserRecord[];
  userIds: string[];
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

async function safeCollection(name: string, unavailableSources: string[]): Promise<QuerySnapshot<DocumentData> | null> {
  try { return await getDocs(collection(db, name)); }
  catch { unavailableSources.push(name); return null; }
}

function docs(snapshot: QuerySnapshot<DocumentData> | null): Array<{ id: string; data: UserRecord }> {
  return snapshot?.docs.map((item) => ({ id: item.id, data: item.data() as UserRecord })) ?? [];
}

function displayName(user: UserRecord | undefined, fallback = "Community contributor") {
  return text(user?.displayName ?? user?.name ?? user?.username, fallback);
}

function ownerId(data: UserRecord) {
  const candidate = data.userId ?? data.uid ?? data.ownerUid ?? data.authorUid ?? data.submittedBy ?? data.createdBy;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

function makeRecord(id: string, source: string, kind: string, data: UserRecord, usersById: Map<string, UserRecord>): DrillRecord {
  const owner = ownerId(data);
  const user = owner ? usersById.get(owner) : undefined;
  const status = text(data.status, "Recorded");
  const category = data.category ?? data.source ?? data.type;
  const date = dateText(data.createdAt ?? data.submittedAt ?? data.updatedAt ?? data.date ?? data.timestamp);
  const title = text(data.title ?? data.name ?? data.morphName ?? data.subject, `${kind} record`);
  const summary = text(data.summary ?? data.description ?? data.message, "No public summary recorded");
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

  let accepted = 0, declined = 0, unset = 0, location = 0, analytics = 0;
  await Promise.all(userIds.map(async (uid) => {
    try {
      const privacySnapshot = await getDoc(doc(db, "users", uid, "settings", "privacy"));
      if (!privacySnapshot.exists()) { unset += 1; return; }
      const privacy = privacySnapshot.data() as UserRecord;
      if (privacy.communityHusbandryData === true) accepted += 1; else declined += 1;
      if (privacy.communityLocation === true) location += 1;
      if (privacy.anonymousAnalytics === true) analytics += 1;
    } catch { unset += 1; }
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

  const records: Record<TileKey, DrillRecord[]> = {
    users: userDocs.map(({ id, data }) => makeRecord(id, "users", "Account", data, usersById)),
    snakes: [],
    husbandry: [],
    community: [
      ...postRecords.map(({ id, data }) => makeRecord(id, "communityPosts", "Community post", data, usersById)),
      ...feedbackRecords.map(({ id, data }) => makeRecord(id, "feedback", "Feedback", data, usersById)),
    ],
    mentorship: [
      ...mentorRecords.map(({ id, data }) => makeRecord(id, "mentors", "Mentor", data, usersById)),
      ...applicationRecords.map(({ id, data }) => makeRecord(id, "mentorApplications", "Mentor application", data, usersById)),
      ...requestRecords.map(({ id, data }) => makeRecord(id, "mentorshipRequests", "Mentorship request", data, usersById)),
      ...workspaceRecords.map(({ id, data }) => makeRecord(id, "mentorshipWorkspaces", "Mentorship workspace", data, usersById)),
    ],
    learning: [],
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
    data: [],
    growth: userDocs.map(({ id, data }) => makeRecord(id, "users", "Account activity", data, usersById)),
  };

  const mentorData = mentorRecords.map((item) => item.data);
  const applicationData = applicationRecords.map((item) => item.data);
  const requestData = requestRecords.map((item) => item.data);
  const workspaceData = workspaceRecords.map((item) => item.data);
  const issueData = issueRecords.map((item) => item.data);
  const morphData = morphRecords.map((item) => item.data);

  return {
    stats: { ...stats, geneticsCalculations: geneticsRecords.length || stats.geneticsCalculations },
    users,
    userIds,
    consent: { accepted, declined, unset, location, analytics },
    mentors: {
      published: mentorData.length,
      accepting: mentorData.filter((item) => item.acceptingNewMentees === true).length,
      applications: applicationData.length,
      pending: applicationData.filter((item) => ["pending", "Pending"].includes(text(item.status, ""))).length,
      requests: requestData.length,
      activeRequests: requestData.filter((item) => ["sent", "accepted", "active"].includes(text(item.status, ""))).length,
      workspaces: workspaceData.length,
      activeWorkspaces: workspaceData.filter((item) => text(item.status, "") === "active").length,
    },
    community: {
      posts: postRecords.length,
      feedback: feedbackRecords.length,
      issues: issueData.length,
      activeIssues: issueData.filter((item) => !["Resolved", "Closed", "Archived"].includes(text(item.status, ""))).length,
      morphSubmissions: morphData.length,
      pendingMorphs: morphData.filter((item) => ["Pending", "NeedsInfo"].includes(text(item.status, ""))).length,
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
  const [error, setError] = useState("");

  const reload = () => {
    setError("");
    setSelectedRecord(null);
    void loadSnapshot().then(setSnapshot).catch((err) => setError(err instanceof Error ? err.message : "Creator intelligence could not be loaded."));
  };
  useEffect(() => { reload(); }, []);

  const usersByExperience = useMemo(() => snapshot ? topEntries(countBy(snapshot.users, "experienceLevel")) : [], [snapshot]);
  const usersByLearning = useMemo(() => snapshot ? topEntries(countBy(snapshot.users, "learningLevel")) : [], [snapshot]);
  const activeGrowth = snapshot ? { day: snapshot.stats.activeTodayUsers ?? 0, week: snapshot.stats.activeWeekUsers ?? 0, month: snapshot.stats.activeMonthUsers ?? 0 } : null;

  if (!snapshot) return <div className="creator-snapshot-intelligence"><div className="creator-loading">Loading expanded Creator intelligence…</div>{error && <div className="creator-error" role="alert">{error}</div>}</div>;
  const { stats, consent, mentors, community, genetics } = snapshot;
  const tiles = [
    { key: "users" as const, icon: "👥", value: stats.registeredUsers, label: "Users & Consent", detail: `${consent.accepted} contributors · ${consent.declined} declined · ${consent.unset} not established` },
    { key: "snakes" as const, icon: "🐍", value: stats.snakeProfiles, label: "Snake Population", detail: `${stats.usersWithData ?? 0} contributing keepers · ${stats.engagedUsers ?? 0} keepers with snakes` },
    { key: "husbandry" as const, icon: "📊", value: stats.mealsFed + stats.weightLogs + stats.shedsLogged, label: "Husbandry Activity", detail: `${fmt(stats.mealsFed)} feeds · ${fmt(stats.weightLogs)} weights · ${fmt(stats.shedsLogged)} sheds` },
    { key: "community" as const, icon: "🌍", value: stats.communityContributors ?? 0, label: "Community & Geography", detail: `${consent.location} location-sharing accounts · consent gated` },
    { key: "mentorship" as const, icon: "🤝", value: mentors.published, label: "Mentor Network", detail: `${mentors.accepting} accepting · ${mentors.activeWorkspaces} active workspaces` },
    { key: "learning" as const, icon: "🎓", value: stats.activatedUsers ?? 0, label: "Learning & Experience", detail: `${usersByLearning.length} learning levels · ${usersByExperience.length} experience groups` },
    { key: "genetics" as const, icon: "🧬", value: genetics.calculations, label: "Genetics & Morphs", detail: `${genetics.approvedMorphImages} approved images · ${community.pendingMorphs} pending submissions` },
    { key: "operations" as const, icon: "🛠️", value: community.issues + community.feedback, label: "Community Operations", detail: `${community.activeIssues} active issues · ${community.feedback} feedback records` },
    { key: "data" as const, icon: "🔎", value: stats.dataQualityIssues ?? 0, label: "Data Quality", detail: `${stats.invalidWeightLogs ?? 0} invalid weights · ${stats.invalidShedLogs ?? 0} invalid sheds` },
    { key: "growth" as const, icon: "📈", value: activeGrowth?.month ?? 0, label: "Adoption & Activity", detail: `${activeGrowth?.day ?? 0} today · ${activeGrowth?.week ?? 0} week · ${activeGrowth?.month ?? 0} month` },
  ];

  const openTile = (key: TileKey) => { setSelected((current) => current === key ? null : key); setSelectedRecord(null); setSelectedUserId(null); };
  const tileRecords = selected ? snapshot.records[selected] : [];
  const openRecord = (record: DrillRecord) => { setSelectedRecord(record); setSelectedUserId(record.ownerId ?? null); };
  const selectedUser = selectedUserId ? snapshot.users[snapshot.userIds.indexOf(selectedUserId)] : undefined;

  const renderDetails = () => {
    switch (selected) {
      case "users": return <>
        <DetailLine label="Registered accounts" value={stats.registeredUsers} />
        <DetailLine label="With snake profiles" value={stats.engagedUsers ?? 0} />
        <DetailLine label="Community consent ON" value={consent.accepted} note={pct(consent.accepted, stats.registeredUsers)} />
        <DetailLine label="Explicitly declined" value={consent.declined} />
        <DetailLine label="Preference not established" value={consent.unset} />
        <DetailLine label="Location sharing ON" value={consent.location} />
        <DetailLine label="Anonymous analytics ON" value={consent.analytics} />
      </>;
      case "snakes": return <><DetailLine label="Snake profiles" value={stats.snakeProfiles} /><DetailLine label="Keepers with snakes" value={stats.engagedUsers ?? 0} /><DetailLine label="Contributing keepers" value={stats.communityContributors ?? 0} /><DetailLine label="Feeds recorded" value={stats.mealsFed} /><DetailLine label="Weight records" value={stats.weightLogs} /><DetailLine label="Shed cycles" value={stats.shedsLogged} /></>;
      case "husbandry": return <><DetailLine label="Meals fed" value={stats.mealsFed} /><DetailLine label="Weight records" value={stats.weightLogs} /><DetailLine label="Valid weight records" value={stats.validWeightLogs ?? stats.weightLogs} /><DetailLine label="Shed cycles" value={stats.shedsLogged} /><DetailLine label="Valid shed measurements" value={stats.validShedLogs ?? stats.shedsLogged} /><DetailLine label="Recorded shed length" value={`${(stats.totalShedLengthCm / 100).toFixed(2)} m`} /></>;
      case "community": return <><DetailLine label="Consent-eligible contributors" value={stats.communityContributors ?? 0} /><DetailLine label="Location sharing enabled" value={consent.location} /><DetailLine label="Community posts" value={community.posts} /><DetailLine label="Community feedback" value={community.feedback} /><DetailLine label="Bug / issue reports" value={community.issues} /><DetailLine label="Morph submissions" value={community.morphSubmissions} /><DetailLine label="Privacy model" value="Explicit consent + city-level" /></>;
      case "mentorship": return <><DetailLine label="Published mentors" value={mentors.published} /><DetailLine label="Accepting new mentees" value={mentors.accepting} /><DetailLine label="Mentor applications" value={mentors.applications} /><DetailLine label="Applications pending" value={mentors.pending} /><DetailLine label="Mentorship requests" value={mentors.requests} /><DetailLine label="Active requests" value={mentors.activeRequests} /><DetailLine label="Workspaces" value={mentors.workspaces} /><DetailLine label="Active workspaces" value={mentors.activeWorkspaces} /></>;
      case "learning": return <><DetailLine label="Activated profiles" value={stats.activatedUsers ?? 0} /><DetailLine label="Incomplete profiles" value={stats.incompleteUserProfiles ?? 0} /><div className="creator-snapshot-subheading">Learning levels</div>{usersByLearning.map(([name, count]) => <DetailLine key={name} label={name} value={count} note={pct(count, stats.registeredUsers)} />)}<div className="creator-snapshot-subheading">Experience</div>{usersByExperience.map(([name, count]) => <DetailLine key={name} label={name} value={count} note={pct(count, stats.registeredUsers)} />)}</>;
      case "genetics": return <><DetailLine label="Persisted genetics calculations" value={genetics.calculations} /><DetailLine label="Approved morph images" value={genetics.approvedMorphImages} /><DetailLine label="Morph submissions" value={community.morphSubmissions} /><DetailLine label="Pending morph submissions" value={community.pendingMorphs} /></>;
      case "operations": return <><DetailLine label="Community posts" value={community.posts} /><DetailLine label="Feedback records" value={community.feedback} /><DetailLine label="Bug / issue reports" value={community.issues} /><DetailLine label="Active issues" value={community.activeIssues} /><DetailLine label="Morph submissions" value={community.morphSubmissions} /></>;
      case "data": return <><DetailLine label="Data-quality candidates" value={stats.dataQualityIssues ?? 0} /><DetailLine label="Invalid weight records" value={stats.invalidWeightLogs ?? 0} /><DetailLine label="Invalid shed records" value={stats.invalidShedLogs ?? 0} /><DetailLine label="Legacy weight candidates" value={stats.legacyWeightCandidates ?? 0} /><DetailLine label="Valid weight coverage" value={pct(stats.validWeightLogs ?? 0, stats.weightLogs)} /></>;
      case "growth": return <><DetailLine label="Active today" value={activeGrowth?.day ?? 0} /><DetailLine label="Active this week" value={activeGrowth?.week ?? 0} /><DetailLine label="Active this month" value={activeGrowth?.month ?? 0} /><DetailLine label="Activated accounts" value={stats.activatedUsers ?? 0} /><DetailLine label="Engaged keepers" value={stats.engagedUsers ?? 0} /></>;
      default: return null;
    }
  };

  return <section className="creator-snapshot-intelligence" aria-label="Expanded live creator snapshot">
    <div className="creator-intelligence-toolbar"><div><span className="creator-admin-kicker">LIVE TILE INTELLIGENCE</span><p>Every aggregate can be explored down to creator-safe records. Private identifiers, email addresses, exact locations and private husbandry/health data are not displayed.</p></div><button type="button" onClick={reload}>↻ Refresh intelligence</button></div>
    {snapshot.unavailableSources.length > 0 && <div className="creator-intelligence-source-note" role="status">Unavailable sources: {snapshot.unavailableSources.join(", ")}. These are shown as unavailable rather than silently counted as zero.</div>}
    <div className="creator-snapshot-grid">{tiles.map((tile) => <button key={tile.key} type="button" className={`creator-global-card creator-snapshot-tile ${selected === tile.key ? "is-selected" : ""}`} onClick={() => openTile(tile.key)}><span>{tile.icon}</span><strong>{fmt(tile.value)}</strong><label>{tile.label}</label><small>{tile.detail}</small><em>{selected === tile.key ? "Hide intelligence ↑" : "Tap for intelligence →"}</em></button>)}</div>
    {selected && <article className="creator-snapshot-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">EXPLORABLE INTELLIGENCE</span><h3>{tiles.find((tile) => tile.key === selected)?.icon} {tiles.find((tile) => tile.key === selected)?.label}</h3><p>Calculated from the current Creator Centre dataset. Tap a record below to inspect its creator-safe provenance.</p></div><button type="button" onClick={() => openTile(selected)}>✕</button></div>
      <div className="creator-snapshot-detail-grid">{renderDetails()}</div>
      {tileRecords.length > 0 && <div className="creator-snapshot-record-section"><div className="creator-snapshot-subheading">Source records · {fmt(tileRecords.length)}</div><div className="creator-snapshot-record-grid">{tileRecords.slice(0, 100).map((record) => <RecordCard key={`${record.source}-${record.id}`} record={record} onOpen={() => openRecord(record)} />)}</div>{tileRecords.length > 100 && <small>Showing the first 100 records. The aggregate count remains the authoritative total.</small>}</div>}
      {tileRecords.length === 0 && <div className="creator-snapshot-empty">No directly drillable records are available for this tile. The aggregate remains available from the canonical Creator statistics service.</div>}
    </article>}
    {selectedRecord && <article className="creator-snapshot-record-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">RECORD PROVENANCE</span><h3>{selectedRecord.kind}: {selectedRecord.title}</h3><p>This view deliberately exposes only Creator-safe application information.</p></div><button type="button" onClick={() => setSelectedRecord(null)}>✕</button></div>
      <div className="creator-snapshot-detail-grid">
        <DetailLine label="Contributor" value={selectedRecord.ownerName ?? "Community contributor"} onClick={selectedRecord.ownerId ? () => setSelectedUserId(selectedRecord.ownerId!) : undefined} />
        <DetailLine label="Source" value={selectedRecord.source} />
        <DetailLine label="Status" value={selectedRecord.status ?? "Recorded"} />
        {selectedRecord.category && <DetailLine label="Category" value={selectedRecord.category} />}
        {selectedRecord.date && <DetailLine label="Recorded" value={selectedRecord.date} />}
        {selectedRecord.meta.map((item) => <DetailLine key={item} label="Context" value={item} />)}
      </div>
      <div className="creator-snapshot-safe-note"><strong>Privacy boundary</strong><span>No UID, email address, exact GPS/address, private health data or private husbandry notes are rendered here.</span></div>
    </article>}
    {selectedUser && selectedUserId && <article className="creator-snapshot-record-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">CREATOR-SAFE ACCOUNT INTELLIGENCE</span><h3>{displayName(selectedUser)}</h3><p>Public application profile and contribution signals only.</p></div><button type="button" onClick={() => setSelectedUserId(null)}>✕</button></div>
      <div className="creator-snapshot-detail-grid">
        <DetailLine label="Experience" value={displayName({ displayName: selectedUser.experienceLevel }, "Not recorded")} />
        <DetailLine label="Learning level" value={displayName({ displayName: selectedUser.learningLevel }, "Not recorded")} />
        <DetailLine label="Account activity" value={text(selectedUser.lastActiveAt ?? selectedUser.lastActive, "Not recorded")} />
        <DetailLine label="Snake profile signal" value={text(selectedUser.snakeCount ?? selectedUser.numberOfSnakes, "Not recorded")} />
        <DetailLine label="Community role" value={text(selectedUser.role, "User")} />
        <DetailLine label="Community contribution" value={consent.accepted > 0 ? "Controlled by current privacy preference" : "Not established"} />
      </div>
      <div className="creator-snapshot-safe-note"><strong>Privacy boundary</strong><span>The Creator Centre never needs the account email or Firebase UID to understand engagement and contribution patterns.</span></div>
    </article>}
  </section>;
}
