import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageBackButton from "./PageBackButton";
import { useAuth } from "../context/useAuth";
import { enableNotifications } from "../services/notificationService";
import {
  finishSubmissionNotificationTest,
  getSubmissionNotificationTestRun,
  getSubmissionNotificationTestTargets,
  markSubmissionNotificationTestAccepted,
  markSubmissionNotificationTestOpened,
  sendNextSubmissionNotificationTest,
  startSubmissionNotificationTest,
  type SubmissionNotificationTestKind,
  type SubmissionNotificationTestRun,
} from "../services/submissionNotificationTestService";
import type { NotificationTestTarget } from "../services/notificationService";
import "./SubmissionNotificationTestBot.css";

const TESTS: Array<{ kind: SubmissionNotificationTestKind; icon: string; label: string; description: string }> = [
  { kind: "bug", icon: "🐛", label: "Bug report", description: "Creator bug/error notification." },
  { kind: "feedback", icon: "💬", label: "Feedback", description: "General feedback notification." },
  { kind: "morph-image", icon: "🧬", label: "Morph image submission", description: "Morph image/evidence review notification." },
  { kind: "morph-terminology", icon: "🌎", label: "Morph terminology", description: "User terminology contribution notification." },
  { kind: "behaviour", icon: "🐍", label: "Behaviour observation", description: "Behaviour Observatory review notification." },
  { kind: "mentor", icon: "🛡️", label: "Mentor application", description: "Mentor application notification." },
  { kind: "founder", icon: "🏆", label: "Founder application", description: "Founder application notification." },
  { kind: "community", icon: "🌍", label: "Community contribution", description: "Community contribution notification." },
  { kind: "feature", icon: "💡", label: "Feature request", description: "Feature request notification." },
];

function formatStatus(status: string) {
  if (status === "accepted") return "✅ Accepted";
  if (status === "opened") return "👁️ Opened / read";
  if (status === "sent") return "📨 Sent";
  if (status === "failed") return "❌ Failed";
  return "⏳ Waiting";
}

function sleep(ms: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, ms)); }

export default function SubmissionNotificationTestBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [targets, setTargets] = useState<NotificationTestTarget[]>([]);
  const [targetUid, setTargetUid] = useState(user?.uid || "");
  const [selectedKinds, setSelectedKinds] = useState<SubmissionNotificationTestKind[]>(TESTS.map((item) => item.kind));
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [run, setRun] = useState<SubmissionNotificationTestRun | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const runId = searchParams.get("submissionNotificationRun") || "";
  const itemId = searchParams.get("submissionNotificationItem") || "";
  const currentItem = useMemo(() => run?.items.find((item) => item.id === itemId) || null, [run, itemId]);
  const acceptedCount = run?.summary?.accepted ?? run?.items.filter((item) => item.acceptedAt).length ?? 0;
  const sentCount = run?.summary?.sent ?? run?.items.filter((item) => (item.sentCount ?? 0) > 0).length ?? 0;
  const openedCount = run?.summary?.opened ?? run?.items.filter((item) => item.openedAt).length ?? 0;
  const lastItemAccepted = Boolean(run && run.items.length && run.items[run.items.length - 1].acceptedAt);
  const selectedTarget = targets.find((target) => target.uid === targetUid);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingTargets(true);
    void getSubmissionNotificationTestTargets().then((items) => {
      if (!active) return;
      setTargets(items);
      if (!targetUid) setTargetUid(items.find((item) => item.uid === user.uid)?.uid || items[0]?.uid || user.uid);
    }).catch((loadError) => {
      console.warn("Tiny Titans submission tester targets could not be loaded", loadError);
      if (active) setTargets([]);
    }).finally(() => { if (active) setLoadingTargets(false); });
    return () => { active = false; };
  }, [user, targetUid]);

  useEffect(() => {
    if (!user || !runId) return;
    let cancelled = false;
    const loadRun = async () => {
      try {
        const next = itemId ? await markSubmissionNotificationTestOpened(runId, itemId) : await getSubmissionNotificationTestRun(runId);
        if (cancelled) return;
        setRun(next);
        setDelayMinutes(next.delayMinutes);
        setTargetUid(next.targetUid);
        setSelectedKinds(next.selectedKinds);
        if (itemId) setMessage("Notification opened/read recorded. Press ACCEPT NOTIFICATION to continue the run.");
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load the notification test run.");
      }
    };
    void loadRun();
    return () => { cancelled = true; };
  }, [user, runId, itemId]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  function toggleKind(kind: SubmissionNotificationTestKind) {
    setSelectedKinds((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]);
  }

  function selectAllKinds() { setSelectedKinds(TESTS.map((item) => item.kind)); }

  async function ensureSelfDevice() {
    if (!user || targetUid !== user.uid) return;
    const result = await enableNotifications(user.uid);
