import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type UserCategory } from "../context/useAuth";
import {
  MAX_SLICES,
  MIN_SLICES,
  MAX_WEEKLY_METRICS,
  MIN_WEEKLY_METRICS,
  TITAN_AT_A_GLANCE_OPTIONS,
  TITAN_WEEKLY_METRIC_OPTIONS,
  WEEK_START_OPTIONS,
  useEasyNav,
} from "../context/EasyNavContext";
import type { AgeBand, EducatorTeachingLevel, LearningLevel, ProfileType } from "../types/Profile";
import type { TitanAtAGlanceSliceId, TitanWeeklyMetricId, WeekStartDay } from "../types/easyNav";
import { savePersonalisationProfile } from "../services/personalisationService";
import { buildPersonalisationProfileData, moveId, parseWeekStart, toggleOrderedId } from "../lib/personalisation";

const profileTypes: Array<[ProfileType, import("../types/tinyTitansIcon").TinyTitansIconName, string]> = [
  ["keeper", "reptile", "Keeper"],
  ["learner", "academy", "Learner"],
  ["educator", "educator", "Educator"],
  ["professional", "knowledge", "Professional"],
];

const levels: Array<[AgeBand, LearningLevel, string]> = [
  ["7-10", "explorer", "Explorer"],
  ["11-14", "learner", "Learner"],
  ["15-18", "student", "Student"],
  ["adult", "adult" as import("../types/Profile").LearningLevel, "Adult"],
];

const teachingLevels: Array<[EducatorTeachingLevel, string]> = [
  ["primary", "Primary"], ["secondary", "Secondary"], ["college", "College"],
  ["university", "University"], ["homeschool", "Homeschool"], ["club", "Club / Group"], ["other", "Other"],
];

export function usePersonalisation() {
  const { user, profile, refreshProfile } = useAuth();
  const easyNav = useEasyNav();
  const navigate = useNavigate();
  const [profileType, setProfileType] = useState<ProfileType>(profile?.profileType === "creator" ? "professional" : profile?.profileType ?? "keeper");
  const [category, setCategory] = useState<UserCategory>(profile?.category ?? "adult");
  const [ageBand, setAgeBand] = useState<AgeBand>(profile?.ageBand ?? "adult");
  const [learningLevel, setLearningLevel] = useState<LearningLevel>(profile?.learningLevel ?? "adult");
  const [experience, setExperience] = useState(profile?.experienceLevel ?? "beginner");
  const [teachingLevel, setTeachingLevel] = useState<EducatorTeachingLevel>(profile?.educatorProfile?.teachingLevel ?? "other");
  const [subjects, setSubjects] = useState(profile?.educatorProfile?.subjects?.join(", ") ?? "Biology, Science");
  const [organisationName, setOrganisationName] = useState(profile?.educatorProfile?.organisationName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await savePersonalisationProfile(
        user.uid,
        buildPersonalisationProfileData(
          { profileType, category, ageBand, learningLevel, experience, teachingLevel, subjects, organisationName },
          profile?.educatorProfile,
        ),
      );
      await refreshProfile();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function chooseMode(nextMode: "standard" | "easy") {
    await easyNav.setMode(nextMode);
  }

  async function toggleSlice(id: TitanAtAGlanceSliceId) {
    await easyNav.setSlices(toggleOrderedId(easyNav.slices, id, MIN_SLICES, MAX_SLICES));
  }

  async function moveSlice(index: number, direction: -1 | 1) {
    await easyNav.setSlices(moveId(easyNav.slices, index, direction));
  }

  async function toggleWeeklyMetric(id: TitanWeeklyMetricId) {
    await easyNav.setWeeklyMetrics(toggleOrderedId(easyNav.weeklyMetrics, id, MIN_WEEKLY_METRICS, MAX_WEEKLY_METRICS));
  }

  async function chooseWeekStart(value: string) {
    const parsed = parseWeekStart(value);
    if (parsed !== null) await easyNav.setWeekStartDay(parsed);
  }

  return {
    user, profile, navigate, ...easyNav,
    profileType, setProfileType, category, setCategory, ageBand, setAgeBand,
    learningLevel, setLearningLevel, experience, setExperience, teachingLevel, setTeachingLevel,
    subjects, setSubjects, organisationName, setOrganisationName, saving, saved,
    profileTypes, levels, teachingLevels, chooseMode, toggleSlice, moveSlice, toggleWeeklyMetric, chooseWeekStart,
  };
}
