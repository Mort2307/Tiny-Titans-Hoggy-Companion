import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import {
  createKeeperObservation,
  finaliseKeeperObservation,
  getApprovedKeeperObservations,
  resolveObservationMediaUrl,
  uploadObservationMedia,
  validateObservationMedia,
} from "../services/keeperObservationService";
import type {
  KeeperObservation,
  KeeperObservationCategory,
  KeeperObservationConfidence,
} from "../types/keeperObservation";
import type { Snake } from "../types/Snake";
import { BEHAVIOUR_CATEGORIES, getBehaviourCategory } from "../data/behaviourTaxonomy";
import { searchTinyTitans, type UniversalSearchItem } from "../services/universalSearchService";
import {
  BEHAVIOUR_CONTEXTS,
  behaviourCategoryLabel,
} from "../lib/behaviourObservatory";

const EMPTY_FORM = () => ({
  snakeId: "",
  title: "",
  category: "movement" as KeeperObservationCategory,
  subcategory: "",
  observedBehaviour: "",
  description: "",
  interpretation: "",
  beforeEvent: [] as string[],
  afterEvent: "",
  observedAt: new Date().toISOString().slice(0, 10),
  confidence: "unsure" as KeeperObservationConfidence,
  feedingMethod: "",
  temperatureC: "",
  humidityPercent: "",
  handlingRecently: false,
  shedStage: "",
  enclosureChangeRecently: false,
  credit: "credited" as "credited" | "anonymous",
  educationalConsent: false,
});

export function useBehaviourObservatory() {
  const { user, profile } = useAuth();
  const [observations, setObservations] = useState<KeeperObservation[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KeeperObservationCategory | "all">("all");
  const [subcategory, setSubcategory] = useState("");
  const [mode, setMode] = useState<"explore" | "submit">("explore");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(0);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, ownSnakes] = await Promise.all([
        getApprovedKeeperObservations(),
        user ? getUserSnakes(user.uid) : Promise.resolve([]),
      ]);
      setObservations(items);
      setSnakes(ownSnakes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load the Behaviour Observatory.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      observations.flatMap((item) =>
        item.media.map(async (media) =>
          [media.id, await resolveObservationMediaUrl(media.path).catch(() => "")] as const,
        ),
      ),
    ).then((entries) => {
      if (!cancelled) setMediaUrls(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [observations]);

  const searchItems = useMemo<UniversalSearchItem[]>(
    () => [
      ...BEHAVIOUR_CATEGORIES.map((cat) => ({
        id: `topic-${cat.value}`,
        kind: "learning" as const,
        title: cat.label.replace(/^\S+\s/, ""),
        subtitle: "Behaviour topic",
        description: cat.description,
        keywords: cat.subcategories.map((item) => item.label),
        route: `/behaviour-observatory?category=${cat.value}`,
      })),
      ...observations.map((item) => ({
        id: item.id,
        kind: "community" as const,
        title: item.title,
        subtitle: behaviourCategoryLabel(item.category),
        description: item.observedBehaviour,
        keywords: [item.description, item.subcategory ?? ""],
        route: `/behaviour-observatory?observation=${item.id}`,
      })),
    ],
    [observations],
  );

  const searchResults = useMemo(
    () => (query.trim() ? searchTinyTitans(searchItems, query, { limit: 8 }) : []),
    [query, searchItems],
  );

  const visible = useMemo(() => {
    let list =
      category === "all"
        ? observations
        : observations.filter((item) => item.category === category);

    if (subcategory) {
      list = list.filter((item) => item.subcategory === subcategory);
    }

    if (query.trim()) {
      const ids = new Set(
        searchResults.filter((item) => item.kind === "community").map((item) => item.id),
      );
      if (ids.size) list = list.filter((item) => ids.has(item.id));
    }

    return list;
  }, [observations, category, subcategory, query, searchResults]);

  const formCategory = getBehaviourCategory(form.category);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggle(value: string) {
    setForm((current) => ({
      ...current,
      beforeEvent: current.beforeEvent.includes(value)
        ? current.beforeEvent.filter((item) => item !== value)
        : [...current.beforeEvent, value],
    }));
  }

  function chooseCategory(value: KeeperObservationCategory) {
    setCategory(value);
    setSubcategory("");
    setQuery("");
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    try {
      validateObservationMedia(selected);
      setFiles(selected);
      setError("");
    } catch (reason) {
      setFiles([]);
      setError(reason instanceof Error ? reason.message : "Invalid media.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return setError("Sign in to contribute an observation.");
    if (!form.educationalConsent) return setError("Explicit educational-use permission is required.");
    if (!files.length) return setError("Add at least one photo or short video.");

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const snake = snakes.find((item) => item.id === form.snakeId);
      const id = await createKeeperObservation({
        userId: user.uid,
        snakeId: form.snakeId || undefined,
        snakeName: snake?.name,
        species: "Western Hognose",
        title: form.title,
        category: form.category,
        subcategory: form.subcategory || undefined,
        observedBehaviour: form.observedBehaviour,
        description: form.description,
        observedAt: new Date(form.observedAt).toISOString(),
        confidence: form.confidence,
        context: {
          beforeEvent: form.beforeEvent,
          afterEvent: form.afterEvent || undefined,
          interpretation: form.interpretation || undefined,
          feedingMethod: form.feedingMethod || undefined,
          temperatureC: form.temperatureC ? Number(form.temperatureC) : undefined,
          humidityPercent: form.humidityPercent ? Number(form.humidityPercent) : undefined,
          handlingRecently: form.handlingRecently,
          shedStage: form.shedStage || undefined,
          enclosureChangeRecently: form.enclosureChangeRecently,
        },
        educationalConsent: true,
        anonymousDisplay: form.credit === "anonymous",
        contributorCreditMode: form.credit,
        contributorDisplayName:
          profile?.displayName || user.displayName || undefined,
      });

      const media = await uploadObservationMedia(user.uid, id, files, setProgress);
      await finaliseKeeperObservation(id, media);
      setSuccess("Observation submitted for Creator review. It cannot become canonical guidance automatically.");
      setFiles([]);
      setProgress(0);
      setMode("explore");
      setForm((current) => ({
        ...current,
        title: "",
        observedBehaviour: "",
        description: "",
        interpretation: "",
        afterEvent: "",
        educationalConsent: false,
        beforeEvent: [],
      }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit this observation.");
    } finally {
      setWorking(false);
    }
  }

  return {
    user,
    profile,
    observations,
    snakes,
    query,
    setQuery,
    category,
    setCategory,
    subcategory,
    setSubcategory,
    mode,
    setMode,
    loading,
    working,
    error,
    success,
    progress,
    mediaUrls,
    files,
    form,
    update,
    toggle,
    chooseCategory,
    handleFiles,
    submit,
    searchResults,
    visible,
    formCategory,
    confidenceLabels: CONFIDENCE_LABELS,
    contexts: BEHAVIOUR_CONTEXTS,
    categoryLabel: behaviourCategoryLabel,
  };
}
