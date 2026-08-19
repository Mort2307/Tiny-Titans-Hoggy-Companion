import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import TinyTitansDateInput from "../components/TinyTitansDateInput";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getFeedingSchedule, saveFeedingSchedule } from "../services/feedingScheduleService";
import type { FeedingSchedule, Snake } from "../types/Snake";
import { getNotificationPermissionState, getNotificationSettings } from "../services/notificationService";
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from "../types/Notifications";

const defaultNotifications: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;

export default function FeedingPreparation() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]); const [selectedSnakeId, setSelectedSnakeId] = useState(""); const [schedule, setSchedule] = useState<FeedingSchedule | null>(null); const [loadedScheduleKey, setLoadedScheduleKey] = useState<string | null>(null); const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications); const [permission, setPermission] = useState(getNotificationPermissionState()); const [saving, setSaving] = useState(false); const [loadingPage, setLoadingPage] = useState(true); const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    void Promise.all([getUserSnakes(user.uid), getNotificationSettings(user.uid)]).then(([loadedSnakes, loadedNotifications]) => { const valid = loadedSnakes.filter((snake) => Boolean(snake?.id)); setSnakes(valid); setSelectedSnakeId((current) => valid.some((snake) => snake.id === current) ? current : valid[0]?.id ?? ""); setNotifications(loadedNotifications); setPermission(getNotificationPermissionState()); }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load feeding preparation settings.")).finally(() => setLoadingPage(false));
  }, [user, loading, profileLoading]);

  const scheduleKey = user && selectedSnakeId ? `${user.uid}:${selectedSnakeId}` : null;
