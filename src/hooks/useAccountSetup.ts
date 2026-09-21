import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type ExperienceLevel, type UserCategory } from "../context/useAuth";
import type { AgeBand, EducatorTeachingLevel, LearningLevel, ProfileType } from "../types/Profile";
import { getLearningLevelForAge, type SetupInterest } from "../config/accountSetup";
import { saveAccountSetupProfile, type AccountSetupPayload } from "../services/accountSetupService";

export function useAccountSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [category, setCategory] = useState<UserCategory | "">("");
  const [profileType, setProfileType] = useState<ProfileType | "">("");
  const [ageBand, setAgeBand] = useState<AgeBand | "">("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">("");
  const [learningLevel, setLearningLevel] = useState<LearningLevel | "">("");
  const [interests, setInterests] = useState<SetupInterest[]>([]);
  const [teachingLevel, setTeachingLevel] = useState<EducatorTeachingLevel | "">("");
  const [subjects, setSubjects] = useState("Biology, Science");
  const [studentAgeBands, setStudentAgeBands] = useState<AgeBand[]>(["11-14"]);
  const [reptileExperience, setReptileExperience] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [organisationName, setOrganisationName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [approximateLocationConsent, setApproximateLocationConsent] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [productUpdatesConsent, setProductUpdatesConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleInterest(interest: SetupInterest) {
    setInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest],
    );
  }

  function toggleStudentAge(age: AgeBand) {
    setStudentAgeBands((current) =>
      current.includes(age) ? current.filter((item) => item !== age) : [...current, age],
    );
  }

  function chooseProfile(type: ProfileType) {
    setProfileType(type);
    if (type === "educator") {
      setInterests((current) => current.includes("learner") ? current : [...current, "learner"]);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) return setError("We couldn't find your Tiny Titans account.");
    if (!displayName.trim()) return setError("Please enter your name.");
    if (!category) return setError("Please choose whether you're an adult or child.");
    if (!profileType) return setError("Please choose how you will use Tiny Titans.");
    if (!ageBand) return setError("Please choose your learning age band.");
    if (!experienceLevel) return setError("Please choose your experience level.");
    if (!learningLevel) return setError("Please choose your learning level.");
    if (interests.length === 0) return setError("Please select at least one reason for using Tiny Titans.");
    if (profileType === "educator" && (!teachingLevel || studentAgeBands.length === 0)) {
      return setError("Please choose your teaching environment and student age band.");
    }
    if (approximateLocationConsent && (!city.trim() || !country.trim())) {
      return setError("If you opt into the community map, please enter your city and country.");
    }

    setSaving(true);
    try {
      const payload: AccountSetupPayload = {
        displayName, category: category as UserCategory, profileType: profileType as ProfileType,
        ageBand: ageBand as AgeBand, experienceLevel: experienceLevel as ExperienceLevel,
        learningLevel: learningLevel as LearningLevel, interests, teachingLevel,
        subjects, studentAgeBands, reptileExperience, organisationName, city, country,
        approximateLocationConsent, analyticsConsent, productUpdatesConsent,
      };

      const updatedProfile = await saveAccountSetupProfile(
        user,
        payload,
        refreshProfile,
      );
      if (!updatedProfile?.setupComplete) {
        throw new Error("Your profile was saved, but Tiny Titans could not confirm setup is complete. Please try again.");
      }

      const redirect = searchParams.get("redirect");
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//") && redirect !== "/account-setup"
          ? redirect
          : null;

      navigate(safeRedirect || (profileType === "educator" ? "/educator" : "/"), { replace: true });
    } catch (saveError) {
      console.error("Tiny Titans: account setup failed", saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return {
    user, displayName, setDisplayName, category, setCategory, profileType, setProfileType,
    ageBand, setAgeBand, experienceLevel, setExperienceLevel, learningLevel, setLearningLevel,
    interests, toggleInterest, teachingLevel, setTeachingLevel, subjects, setSubjects,
    studentAgeBands, toggleStudentAge, reptileExperience, setReptileExperience,
    organisationName, setOrganisationName, city, setCity, country, setCountry,
    approximateLocationConsent, setApproximateLocationConsent, analyticsConsent, setAnalyticsConsent,
    productUpdatesConsent, setProductUpdatesConsent, saving, error, chooseProfile, handleSubmit,
  };
}
