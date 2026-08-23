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

function fmt(value: number) { return new Intl.NumberFormat("en-GB").format(value); }
function text(value: unknown, fallback = "Unknown") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function isClosedIssue(record: DrillRecord) { return ["resolved", "closed", "archived"].includes(text(record.status, "").toLowerCase()); }

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

  const reload = async () => {
    setError("");
    setSelectedRecord(null);
    try {
      const nextSnapshot = await loadSnapshot();
      setSnapshot(nextSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creator intelligence could not be loaded.");
    }
  };
  useEffect(() => { reload(); }, []);

  const usersByExperience = useMemo(() => snapshot ? topEntries(countBy(snapshot.users, "experienceLevel")) : [], [snapshot]);
  const tiles = useMemo(() => snapshot ? buildTiles(snapshot, usersByExperience) : [], [snapshot, usersByExperience]);
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("all");
  const tileRecords = useMemo(() => {
    if (!selected || !snapshot) return [];
    const base = snapshot.records[selected];
    if (!detailFilter || detailFilter === "all") return base;
    if (selected === "users") {
      const userRecords = snapshot.records.users;
      const userRecordForIndex = (index: number) => userRecords.find((record) => record.id === snapshot.userIds[index]);
      switch (detailFilter as UserDetailFilter) {
        case "snakes": return snapshot.users.map((user, index) => ({ user, index })).filter(({ user }) => Number(user.snakeCount ?? user.numberOfSnakes ?? 0) > 0).map(({ index }) => userRecordForIndex(index)).filter((record): record is DrillRecord => Boolean(record));
        case "community": return snapshot.users.map((_, index) => index).filter((index) => snapshot.consentByUser[snapshot.userIds[index]]?.community).map(userRecordForIndex).filter((record): record is DrillRecord => Boolean(record));
        case "declined": return snapshot.users.map((_, index) => index).filter((index) => snapshot.consentByUser[snapshot.userIds[index]]?.established && !snapshot.consentByUser[snapshot.userIds[index]]?.community).map(userRecordForIndex).filter((record): record is DrillRecord => Boolean(record));
        case "unset": return snapshot.users.map((_, index) => index).filter((index) => !snapshot.consentByUser[snapshot.userIds[index]]?.established).map(userRecordForIndex).filter((record): record is DrillRecord => Boolean(record));
        case "location": return snapshot.users.map((_, index) => index).filter((index) => snapshot.consentByUser[snapshot.userIds[index]]?.location).map(userRecordForIndex).filter((record): record is DrillRecord => Boolean(record));
        case "analytics": return snapshot.users.map((_, index) => index).filter((index) => snapshot.consentByUser[snapshot.userIds[index]]?.analytics).map(userRecordForIndex).filter((record): record is DrillRecord => Boolean(record));
        default: return base;
      }
    }
    if (selected === "operations") {
      switch (detailFilter as OperationsDetailFilter) {
        case "posts": return base.filter((record) => record.source === "communityPosts");
        case "feedback": return base.filter((record) => record.source === "feedback");
        case "issues": return base.filter((record) => record.source === "issueReports");
        case "activeIssues": return base.filter((record) => record.source === "issueReports" && !isClosedIssue(record));
        case "morphs": return base.filter((record) => record.source === "morphSubmissions");
        default: return base;
      }
    }
    return base;
  }, [selected, snapshot, detailFilter]);

  const openTile = (key: TileKey) => { setSelected(key); setDetailFilter("all"); setSelectedRecord(null); setSelectedUserId(null); };
  const openUserFilter = (filter: UserDetailFilter) => { setSelected("users"); setDetailFilter(filter); setSelectedRecord(null); };
  const openOperationsFilter = (filter: OperationsDetailFilter) => { setSelected("operations"); setDetailFilter(filter); setSelectedRecord(null); };
  const renderDetails = () => {
    if (!snapshot || !selected) return null;
    const stats = snapshot.stats;
    const pct = (value: number, total: number) => total ? `${Math.round((value / total) * 100)}%` : "0%";
    switch (selected) {
      case "users": return <><DetailLine label="Registered accounts" value={stats.registeredUsers} onClick={() => openUserFilter("all")} /><DetailLine label="With snake profiles" value={stats.usersWithSnakes} onClick={() => openUserFilter("snakes")} /><DetailLine label="Community consent ON" value={snapshot.consent.accepted} onClick={() => openUserFilter("community")} /><DetailLine label="Explicitly declined" value={snapshot.consent.declined} onClick={() => openUserFilter("declined")} /><DetailLine label="Preference not established" value={snapshot.consent.unset} onClick={() => openUserFilter("unset")} /><DetailLine label="Location sharing ON" value={snapshot.consent.location} onClick={() => openUserFilter("location")} /><DetailLine label="Anonymous analytics ON" value={snapshot.consent.analytics} onClick={() => openUserFilter("analytics")} /></>;
      case "operations": return <><DetailLine label="Community posts" value={snapshot.community.posts} onClick={() => openOperationsFilter("posts")} /><DetailLine label="Feedback records" value={snapshot.community.feedback} onClick={() => openOperationsFilter("feedback")} /><DetailLine label="Bug / issue reports" value={snapshot.community.issues} onClick={() => openOperationsFilter("issues")} /><DetailLine label="Active issues" value={snapshot.community.activeIssues} onClick={() => openOperationsFilter("activeIssues")} /><DetailLine label="Morph submissions" value={snapshot.community.morphSubmissions} onClick={() => openOperationsFilter("morphs")} /></>;
      case "data": return <><DetailLine label="Data-quality candidates" value={stats.dataQualityIssues ?? 0} /><DetailLine label="Invalid weight records" value={stats.invalidWeightLogs ?? 0} /><DetailLine label="Invalid shed records" value={stats.invalidShedLogs ?? 0} /><DetailLine label="Legacy weight candidates" value={stats.legacyWeightCandidates ?? 0} /><DetailLine label="Valid weight coverage" value={pct(stats.validWeightLogs ?? 0, stats.weightLogs)} /></>;
      case "growth": return <><DetailLine label="Active today" value={activeGrowth?.day ?? 0} /><DetailLine label="Active this week" value={activeGrowth?.week ?? 0} /><DetailLine label="Active this month" value={activeGrowth?.month ?? 0} /><DetailLine label="Activated accounts" value={stats.activatedUsers ?? 0} /><DetailLine label="Engaged keepers" value={stats.engagedUsers ?? 0} /></>;
      default: return null;
    }
  };

  return <section className="creator-snapshot-intelligence" aria-label="Expanded live creator snapshot">
    <div className="creator-intelligence-toolbar"><div><span className="creator-admin-kicker">LIVE TILE INTELLIGENCE</span><p>Every aggregate can be explored down to creator-safe records. Private identifiers, email addresses, exact locations and private husbandry/health data are not displayed.</p></div><button type="button" onClick={reload}>↻ Refresh intelligence</button></div>
    {snapshot?.unavailableSources.length ? <div className="creator-intelligence-source-note" role="status">Unavailable sources: {snapshot.unavailableSources.join(", ")}. These are shown as unavailable rather than silently counted as zero.</div> : null}
    {error ? <div className="creator-intelligence-source-note" role="alert">{error}</div> : null}
    {selected && detailFilter !== "all" ? <div className="creator-intelligence-source-note" role="status">Showing filtered intelligence: <strong>{detailFilter}</strong> · {fmt(tileRecords.length)} matching records <button type="button" onClick={() => setDetailFilter("all")}>Clear filter</button></div> : null}
    <div className="creator-snapshot-grid">{tiles.map((tile) => <button key={tile.key} type="button" className={`creator-global-card creator-snapshot-tile ${selected === tile.key ? "is-selected" : ""}`} onClick={() => openTile(tile.key)}><span>{tile.icon}</span><strong>{fmt(tile.value)}</strong><label>{tile.label}</label><small>{tile.detail}</small><em>{selected === tile.key ? "Hide intelligence ↑" : "Tap for intelligence →"}</em></button>)}</div>
    {selected && <article className="creator-snapshot-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">EXPLORABLE INTELLIGENCE</span><h3>{tiles.find((tile) => tile.key === selected)?.icon} {tiles.find((tile) => tile.key === selected)?.label}</h3><p>Calculated from the current Creator Centre dataset. Tap a record below to inspect its creator-safe provenance.</p></div><button type="button" onClick={() => openTile(selected)}>✕</button></div>
      <div className="creator-snapshot-detail-grid">{renderDetails()}</div>
      {tileRecords.length > 0 && <div className="creator-snapshot-record-section"><div className="creator-snapshot-subheading">Source records · {fmt(tileRecords.length)}</div><div className="creator-snapshot-record-grid">{tileRecords.slice(0, 100).map((record) => <RecordCard key={`${record.source}-${record.id}`} record={record} onOpen={() => { setSelectedRecord(record); setSelectedUserId(record.ownerId ?? null); }} />)}</div>{tileRecords.length > 100 && <small>Showing the first 100 records. The aggregate count remains the authoritative total.</small>}</div>}
      {tileRecords.length === 0 && <div className="creator-snapshot-empty">No directly drillable records are available for this tile. The aggregate remains available from the canonical Creator statistics service.</div>}
    </article>}
    {selectedRecord && <article className="creator-snapshot-record-detail">
      <div className="creator-snapshot-detail-heading"><div><span className="creator-admin-kicker">RECORD PROVENANCE</span><h3>{selectedRecord.kind}: {selectedRecord.title}</h3><p>This view deliberately exposes only Creator-safe application information.</p></div><button type="button" onClick={() => setSelectedRecord(null)}>✕</button></div>
      <div className="creator-snapshot-detail-grid">
        <DetailLine label="Contributor" value={selectedRecord.ownerName ?? "Community contributor"} onClick={selectedRecord.ownerId ? () => setSelectedUserId(selectedRecord.ownerId!) : undefined} />
        <DetailLine label="Type" value={selectedRecord.kind} />
        <DetailLine label="Status" value={selectedRecord.status ?? "Unknown"} />
        <DetailLine label="Category" value={selectedRecord.category ?? "Uncategorised"} />
        <DetailLine label="Date" value={selectedRecord.date ?? "Not recorded"} />
        <DetailLine label="Summary" value={selectedRecord.summary ?? "No summary available."} />
      </div>
    </article>}
  </section>;
}

async function loadSnapshot(): Promise<Snapshot> {
  const stats = await getGlobalStats();
  const readCollection = async (name: string) => { try { return await getDocs(collection(db, name)); } catch { return null; } };
  const [userSnap, mentorSnap, applicationSnap, requestSnap, workspaceSnap, postSnap, feedbackSnap, issueSnap, morphSnap, approvedSnap] = await Promise.all([readCollection("users"), readCollection("mentors"), readCollection("mentorApplications"), readCollection("mentorshipRequests"), readCollection("mentorshipWorkspaces"), readCollection("communityPosts"), readCollection("feedback"), readCollection("issueReports"), readCollection("morphSubmissions"), readCollection("approvedMorphImages")]);
  const unavailableSources: string[] = [];
  const rows = (snap: QuerySnapshot<DocumentData> | null, source: string) => { if (!snap) unavailableSources.push(source); return snap?.docs.map((item) => ({ id: item.id, ...item.data() })) ?? []; };
  const userRows = rows(userSnap, "users");
  const mentorRows = rows(mentorSnap, "mentors");
  const applicationRows = rows(applicationSnap, "mentorApplications");
  const requestRows = rows(requestSnap, "mentorshipRequests");
  const workspaceRows = rows(workspaceSnap, "mentorshipWorkspaces");
  const postRows = rows(postSnap, "communityPosts");
  const feedbackRows = rows(feedbackSnap, "feedback");
  const issueRows = rows(issueSnap, "issueReports");
  const morphRows = rows(morphSnap, "morphSubmissions");
  const approvedRows = rows(approvedSnap, "approvedMorphImages");
  const userIds = userRows.map((row) => row.id);
  const consentByUser = Object.fromEntries(userRows.map((row) => [row.id, { community: row.communityConsent === true, location: row.locationSharing === true, analytics: row.anonymousAnalytics === true, established: typeof row.communityConsent === "boolean" }]));
  const toDate = (value: unknown) => { if (!value) return ""; if (typeof value === "string") return value.slice(0, 10); if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return ((value as { toDate: () => Date }).toDate()).toISOString().slice(0, 10); return ""; };
  const userRecords: DrillRecord[] = userRows.map((row) => ({ id: row.id, source: "users", kind: "User", ownerId: row.id, ownerName: text(row.firstName ?? row.displayName, "Keeper"), title: text(row.firstName ?? row.displayName, "Keeper"), status: text(row.status, "Active"), category: text(row.experienceLevel, "Keeper"), date: toDate(row.createdAt), summary: "Creator-safe account record", meta: [] }));
  const userById = new Map(userRows.map((row) => [row.id, row]));
  const snakeRecords: DrillRecord[] = [];
  userRows.forEach((user) => { const count = Number(user.snakeCount ?? user.numberOfSnakes ?? 0); if (count > 0) snakeRecords.push({ id: user.id, source: "users", kind: "Snake keeper", ownerId: user.id, ownerName: text(user.firstName ?? user.displayName, "Keeper"), title: `${text(user.firstName ?? user.displayName, "Keeper")} · ${fmt(count)} snake${count === 1 ? "" : "s"}`, status: "Active", category: "Snake profile", date: toDate(user.updatedAt ?? user.createdAt), summary: "Creator-safe snake profile aggregate", meta: [] }); });
  const userRecordsById = new Map(userRecords.map((record) => [record.id, record]));
  const issueRecords: DrillRecord[] = issueRows.map((row) => ({ id: row.id, source: "issueReports", kind: "Issue", ownerId: text(row.userId ?? row.ownerId, "") || undefined, ownerName: text(row.firstName ?? row.displayName ?? row.userName, "Community contributor"), title: text(row.title ?? row.subject, "Issue report"), status: text(row.status, "Open"), category: text(row.category, "General"), date: toDate(row.createdAt ?? row.submittedAt ?? row.updatedAt), summary: text(row.description ?? row.summary, "No summary available."), meta: [] }));
  const feedbackRecords: DrillRecord[] = feedbackRows.map((row) => ({ id: row.id, source: "feedback", kind: "Feedback", ownerId: text(row.userId ?? row.ownerId, "") || undefined, ownerName: text(row.firstName ?? row.displayName ?? row.userName, "Community contributor"), title: text(row.title ?? row.subject, "Feedback"), status: text(row.status, "Submitted"), category: text(row.category, "General"), date: toDate(row.createdAt ?? row.submittedAt), summary: text(row.message ?? row.description, "No summary available."), meta: [] }));
  const postRecords: DrillRecord[] = postRows.map((row) => ({ id: row.id, source: "communityPosts", kind: "Community post", ownerId: text(row.userId ?? row.ownerId, "") || undefined, ownerName: text(row.firstName ?? row.displayName ?? row.userName, "Community contributor"), title: text(row.title ?? row.subject, "Community post"), status: text(row.status, "Published"), category: text(row.category, "Community"), date: toDate(row.createdAt ?? row.updatedAt), summary: text(row.content ?? row.body, "No summary available."), meta: [] }));
  const morphRecords: DrillRecord[] = morphRows.map((row) => ({ id: row.id, source: "morphSubmissions", kind: "Morph submission", ownerId: text(row.userId ?? row.ownerId, "") || undefined, ownerName: text(row.firstName ?? row.displayName ?? row.userName, "Community contributor"), title: text(row.morphName ?? row.title, "Morph submission"), status: text(row.status, "Pending"), category: text(row.category, "Morph"), date: toDate(row.createdAt ?? row.submittedAt), summary: text(row.description ?? row.notes, "No summary available."), meta: [] }));
  const mentorRecords: DrillRecord[] = mentorRows.map((row) => ({ id: row.id, source: "mentors", kind: "Mentor", ownerId: text(row.userId ?? row.ownerId, "") || undefined, ownerName: text(row.firstName ?? row.displayName ?? row.userName, "Mentor"), title: text(row.displayName ?? row.name, "Mentor"), status: text(row.status, "Published"), category: text(row.speciality ?? row.specialities, "Mentorship"), date: toDate(row.createdAt ?? row.updatedAt), summary: "Creator-safe mentor profile", meta: [] }));
  const records: Record<TileKey, DrillRecord[]> = { users: userRecords, snakes: snakeRecords, husbandry: [], community: [...postRecords, ...feedbackRecords, ...issueRecords, ...morphRecords], mentorship: [...mentorRecords], learning: [], genetics: [], operations: [...postRecords, ...feedbackRecords, ...issueRecords, ...morphRecords], data: [], growth: [] };
  const activeGrowth = { day: 0, week: 0, month: 0 };
  return { stats, users: userRows, userIds, consentByUser, consent: { accepted: userRows.filter((row) => row.communityConsent === true).length, declined: userRows.filter((row) => row.communityConsent === false).length, unset: userRows.filter((row) => typeof row.communityConsent !== "boolean").length, location: userRows.filter((row) => row.locationSharing === true).length, analytics: userRows.filter((row) => row.anonymousAnalytics === true).length }, mentors: { published: mentorRows.length, accepting: mentorRows.filter((row) => row.acceptingRequests === true).length, applications: applicationRows.length, pending: applicationRows.filter((row) => ["pending", "Pending"].includes(text(row.status, ""))).length, requests: requestRows.length, activeRequests: requestRows.filter((row) => ["sent", "accepted", "active"].includes(text(row.status, ""))).length, workspaces: workspaceRows.length, activeWorkspaces: workspaceRows.filter((row) => text(row.status, "") === "active").length }, community: { posts: postRecords.length, feedback: feedbackRecords.length, issues: issueRecords.length, activeIssues: issueRecords.filter((record) => !isClosedIssue(record)).length, morphSubmissions: morphRecords.length, pendingMorphs: morphRecords.filter((row) => ["Pending", "NeedsInfo"].includes(text(row.status, ""))).length }, genetics: { calculations: 0, approvedMorphImages: approvedRows.length }, records, unavailableSources: [...new Set(unavailableSources)] };
}

function topEntries(counts: Record<string, number>) { return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5); }
function countBy(rows: UserRecord[], key: string) { return rows.reduce<Record<string, number>>((acc, row) => { const value = text(row[key], "Unknown"); acc[value] = (acc[value] ?? 0) + 1; return acc; }, {}); }
function buildTiles(snapshot: Snapshot, usersByExperience: [string, number][]) { const stats = snapshot.stats; return [{ key: "users" as TileKey, icon: "👥", value: stats.registeredUsers, label: "Users", detail: `${fmt(stats.usersWithSnakes)} with snake profiles · ${fmt(snapshot.consent.accepted)} community consented` }, { key: "snakes" as TileKey, icon: "🐍", value: stats.snakes, label: "Snakes", detail: `${fmt(stats.snakes)} tracked across the current dataset` }, { key: "husbandry" as TileKey, icon: "🌡️", value: stats.feedingLogs + stats.shedLogs + stats.weightLogs, label: "Husbandry", detail: `${fmt(stats.feedingLogs)} feeds · ${fmt(stats.shedLogs)} sheds · ${fmt(stats.weightLogs)} weights` }, { key: "community" as TileKey, icon: "💬", value: snapshot.community.posts + snapshot.community.feedback + snapshot.community.issues + snapshot.community.morphSubmissions, label: "Community", detail: `${fmt(snapshot.community.posts)} posts · ${fmt(snapshot.community.issues)} issues · ${fmt(snapshot.community.morphSubmissions)} morph submissions` }, { key: "mentorship" as TileKey, icon: "🧭", value: snapshot.mentors.published, label: "Mentorship", detail: `${fmt(snapshot.mentors.accepting)} accepting requests · ${fmt(snapshot.mentors.pending)} applications pending` }, { key: "learning" as TileKey, icon: "📚", value: stats.learningEvents, label: "Learning", detail: `${fmt(stats.learningEvents)} learning events recorded` }, { key: "genetics" as TileKey, icon: "🧬", value: snapshot.genetics.calculations + snapshot.genetics.approvedMorphImages, label: "Genetics", detail: `${fmt(snapshot.genetics.approvedMorphImages)} approved morph images` }, { key: "operations" as TileKey, icon: "🛠️", value: snapshot.community.posts + snapshot.community.feedback + snapshot.community.issues + snapshot.community.morphSubmissions, label: "Community Operations", detail: `${fmt(snapshot.community.activeIssues)} active issues · ${fmt(snapshot.community.pendingMorphs)} pending morphs` }, { key: "data" as TileKey, icon: "🧪", value: stats.dataQualityIssues ?? 0, label: "Data Quality", detail: `${fmt(stats.invalidWeightLogs ?? 0)} invalid weights · ${fmt(stats.invalidShedLogs ?? 0)} invalid sheds` }, { key: "growth" as TileKey, icon: "📈", value: stats.activatedUsers ?? 0, label: "Growth", detail: `${fmt(stats.engagedUsers ?? 0)} engaged keepers` }]; }
