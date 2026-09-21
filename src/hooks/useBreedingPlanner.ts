import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, saveUserSnake } from "../services/snakeService";
import {
  getBreedingProjects,
  getBreedingPairings,
  getEggClutches,
  getHatchlings,
  saveBreedingProject,
  saveBreedingPairing,
  saveEggClutch,
  saveHatchling,
} from "../services/breedingService";
import type { Snake } from "../types/Snake";
import type { BreedingProject, BreedingPairing, EggClutch, HatchlingRecord } from "../types/Breeding";
import { createBreedingGeneticsSnapshot, type BreedingGeneticsSnapshot } from "../utils/breedingGenetics";
import { migrateSnake } from "../utils/snakeMigration";

const today = () => new Date().toISOString().slice(0, 10);
const makeId = (prefix: string) => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : prefix + "-" + Date.now();

export const traitsFor = (snake?: Snake) => snake?.morphs?.filter(Boolean) ?? [];
export const outcomeLabel = (outcome: { visualMorphs: string[]; hets: { name: string }[] }) => outcome.visualMorphs.length ? outcome.visualMorphs.join(" + ") : "Wild Type";

export function useBreedingPlanner() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();

  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [pairings, setPairings] = useState<BreedingPairing[]>([]);
  const [clutches, setClutches] = useState<EggClutch[]>([]);
  const [hatchlings, setHatchlings] = useState<HatchlingRecord[]>([]);

  const [maleId, setMaleId] = useState("");
  const [femaleId, setFemaleId] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [targetTraits, setTargetTraits] = useState("");
  const [priority, setPriority] = useState<BreedingProject["priority"]>("Normal");
  const [holdbackStrategy, setHoldbackStrategy] = useState("");
  const [futurePairingNotes, setFuturePairingNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [pairingDate, setPairingDate] = useState(today());
  const [clutchDate, setClutchDate] = useState(today());
  const [eggCount, setEggCount] = useState(1);
  const [hatchDate, setHatchDate] = useState(today());

  const [hatchlingName, setHatchlingName] = useState("");
  const [hatchlingSex, setHatchlingSex] = useState<HatchlingRecord["sex"]>("Unknown");
  const [hatchlingMorph, setHatchlingMorph] = useState("");
  const [hatchlingWeight, setHatchlingWeight] = useState("");

  const [futureMaleId, setFutureMaleId] = useState("");
  const [futureFemaleId, setFutureFemaleId] = useState("");
  const [futureTarget, setFutureTarget] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let active = true;
    void Promise.all([getUserSnakes(user.uid), getBreedingProjects(user.uid)])
      .then(([loadedSnakes, loadedProjects]) => {
        if (!active) return;
        const valid = loadedSnakes.filter((snake) => Boolean(snake?.id));
        setSnakes(valid);
        setProjects(loadedProjects);
        setError("");
        setSelectedProjectId((current) => current || loadedProjects[0]?.id || "");
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load breeding projects.");
      });
    return () => { active = false; };
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (!user || !selectedProjectId) return;
    let active = true;
    void Promise.all([
      getBreedingPairings(user.uid, selectedProjectId),
      getEggClutches(user.uid, selectedProjectId),
      getHatchlings(user.uid, selectedProjectId),
    ])
      .then(([nextPairings, nextClutches, nextHatchlings]) => {
        if (!active) return;
        setPairings(nextPairings);
        setClutches(nextClutches);
        setHatchlings(nextHatchlings);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this breeding project.");
      });
    return () => { active = false; };
  }, [selectedProjectId, user]);

  const males = useMemo(() => snakes.filter((snake) => snake.sex === "Male"), [snakes]);
  const females = useMemo(() => snakes.filter((snake) => snake.sex === "Female"), [snakes]);
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedMale = selectedProject ? snakes.find((snake) => snake.id === selectedProject.maleId) : undefined;
  const selectedFemale = selectedProject ? snakes.find((snake) => snake.id === selectedProject.femaleId) : undefined;

  const geneticsSnapshot = useMemo<BreedingGeneticsSnapshot | null>(() => {
    if (!selectedMale || !selectedFemale) return null;
    try { return createBreedingGeneticsSnapshot(selectedFemale, selectedMale); }
    catch { return null; }
  }, [selectedMale, selectedFemale]);

  const forecast = geneticsSnapshot?.outcomes ?? [];
  const targetList = useMemo(() => (selectedProject?.targetTraits ?? []).map((item) => item.toLowerCase()), [selectedProject]);
  const targetMatches = forecast.filter((outcome) => {
    const haystack = (outcome.visualMorphs.join(" ") + " " + outcome.hets.map((het) => het.name).join(" ")).toLowerCase();
    return targetList.length > 0 && targetList.every((target) => haystack.includes(target));
  });

  const holdbacks = hatchlings.filter((hatchling) => hatchling.holdback);
  const linkedHatchlings = hatchlings.filter((hatchling) => hatchling.snakeId).length;
  const latestClutch = clutches[0];
  const readiness =
    !selectedProject ? "Create a project" :
    !pairings.length ? "Record the first pairing" :
    !clutches.length ? "Record the clutch" :
    !hatchlings.length ? "Record hatchlings" :
    holdbacks.length ? "Plan the next generation" :
    "Review hatchlings for holdback";

  const futureForecast = useMemo<BreedingGeneticsSnapshot | null>(() => {
    const male = snakes.find((snake) => snake.id === futureMaleId);
    const female = snakes.find((snake) => snake.id === futureFemaleId);
    if (!male || !female || male.id === female.id) return null;
    try { return createBreedingGeneticsSnapshot(female, male); }
    catch { return null; }
  }, [futureMaleId, futureFemaleId, snakes]);

  const futureTargetWords = futureTarget.toLowerCase().split(",").map((item) => item.trim()).filter(Boolean);
  const futureMatches = futureForecast?.outcomes.filter((outcome) => {
    const haystack = (outcome.visualMorphs.join(" ") + " " + outcome.hets.map((het) => het.name).join(" ")).toLowerCase();
    return futureTargetWords.length > 0 && futureTargetWords.every((target) => haystack.includes(target));
  }) ?? [];

  async function createProject() {
    if (!user) return;
    const male = males.find((snake) => snake.id === maleId);
    const female = females.find((snake) => snake.id === femaleId);
    if (!male || !female) { setMessage("Select one male and one female first."); return; }

    setSaving(true); setMessage(""); setError("");
    try {
      const expectedGenetics = createBreedingGeneticsSnapshot(female, male);
      const project: BreedingProject = {
        id: makeId("breeding"), ownerId: user.uid,
        name: name.trim() || male.name + " × " + female.name,
        maleId: male.id, femaleId: female.id, status: "Planned",
        expectedTraits: [...new Set([...traitsFor(male), ...traitsFor(female)])],
        expectedGenetics,
        goal: goal.trim() || undefined,
        targetTraits: targetTraits.split(",").map((item) => item.trim()).filter(Boolean),
        priority,
        holdbackStrategy: holdbackStrategy.trim() || undefined,
        futurePairingNotes: futurePairingNotes.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await saveBreedingProject(user.uid, project);
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
      setName(""); setGoal(""); setTargetTraits(""); setHoldbackStrategy(""); setFuturePairingNotes(""); setNotes("");
      setMessage("✅ Project created. Genetic forecast and next-generation planning are ready.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this breeding project.");
    } finally { setSaving(false); }
  }

  async function addPairing() {
    if (!user || !selectedProject) return;
    setSaving(true); setError("");
    const pairing: BreedingPairing = {
      id: makeId("pairing"), projectId: selectedProject.id,
      maleId: selectedProject.maleId, femaleId: selectedProject.femaleId,
      pairingDate, status: "Paired", notes: notes.trim() || undefined,
      expectedTraits: selectedProject.expectedTraits,
      expectedGenetics: geneticsSnapshot ?? selectedProject.expectedGenetics,
    };
    try {
      await saveBreedingPairing(user.uid, selectedProject.id, pairing);
      setPairings((current) => [pairing, ...current]);
      setNotes(""); setMessage("🤝 Pairing recorded with the canonical genetic snapshot.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save pairing event.");
    } finally { setSaving(false); }
  }

  async function addClutch() {
    if (!user || !selectedProject || !pairings[0]) { setMessage("Record a pairing before adding a clutch."); return; }
    setSaving(true); setError("");
    const clutch: EggClutch = {
      id: makeId("clutch"), projectId: selectedProject.id, pairingId: pairings[0].id,
      laidDate: clutchDate, eggCount: Math.max(1, eggCount), notes: notes.trim() || undefined,
    };
    try {
      await saveEggClutch(user.uid, selectedProject.id, clutch);
      setClutches((current) => [clutch, ...current]);
      setNotes(""); setMessage("🥚 Clutch recorded. The project can now move into hatchling tracking.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save clutch.");
    } finally { setSaving(false); }
  }

  async function addHatchling() {
    if (!user || !selectedProject || !clutches[0]) { setMessage("Record a clutch before adding hatchlings."); return; }
    setSaving(true); setError("");
    const hatchling: HatchlingRecord = {
      id: makeId("hatchling"), projectId: selectedProject.id, clutchId: clutches[0].id,
      hatchDate, name: hatchlingName.trim() || undefined, sex: hatchlingSex,
      morph: hatchlingMorph.trim() || undefined, weightAtHatch: hatchlingWeight ? Number(hatchlingWeight) : undefined,
    };
    try {
      await saveHatchling(user.uid, selectedProject.id, hatchling);
      setHatchlings((current) => [hatchling, ...current]);
      setHatchlingName(""); setHatchlingMorph(""); setHatchlingWeight("");
      setMessage("🐣 Hatchling recorded. Review it below for holdback potential.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save hatchling.");
    } finally { setSaving(false); }
  }

  async function toggleHoldback(hatchling: HatchlingRecord, holdback: boolean) {
    if (!user || !selectedProject) return;
    setSaving(true); setError("");
    const updated: HatchlingRecord = {
      ...hatchling,
      holdback,
      holdbackReason: holdback ? (hatchling.holdbackReason || selectedProject.holdbackStrategy || "Project genetics") : undefined,
    };
    try {
      await saveHatchling(user.uid, selectedProject.id, updated);
      setHatchlings((current) => current.map((item) => item.id === hatchling.id ? updated : item));
      setMessage(holdback ? "🔒 Hatchling marked as a holdback for future planning." : "Holdback removed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update holdback status.");
    } finally { setSaving(false); }
  }

  async function createSnakeFromHatchling(hatchling: HatchlingRecord) {
    if (!user || !selectedProject) return;
    if (hatchling.snakeId) { navigate("/snakes/" + hatchling.snakeId); return; }
    setSaving(true); setMessage(""); setError("");
    try {
      const morphs = hatchling.morphId ? [hatchling.morphId] : [];
      const customMorph = !hatchling.morphId ? (hatchling.morph ?? "") : "";
      const customHets = hatchling.hets?.join(", ") ?? "";
      const weight = hatchling.weightAtHatch ?? null;
      const draft = migrateSnake({
        name: hatchling.name ?? "", species: "Western Hognose", photo: "", sex: hatchling.sex,
        morphs, customMorph, hets: [], customHets,
        startingWeight: weight, startingWeightDate: weight !== null ? hatchling.hatchDate : "",
        weight, lastWeighedDate: weight !== null ? hatchling.hatchDate : "",
        weightHistory: [], weightTracking: { enabled: true, frequency: "Monthly" },
        hatchDate: hatchling.hatchDate, arrivalDate: hatchling.hatchDate,
        notes: 'Created from breeding project "' + selectedProject.name + '". Hatchling record: ' + hatchling.id + ".",
      });
      delete (draft as Partial<Snake>).id;
      const savedSnake = await saveUserSnake(user.uid, draft as Snake);
      if (!savedSnake.id) throw new Error("The Snake was saved but no canonical Snake ID was returned.");
      const linked = { ...hatchling, snakeId: savedSnake.id };
      await saveHatchling(user.uid, selectedProject.id, linked);
      setHatchlings((current) => current.map((item) => item.id === hatchling.id ? linked : item));
      setMessage("🐍 " + (savedSnake.name || "Snake") + " is now linked to the breeding project.");
      navigate("/snakes/" + savedSnake.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create the Snake profile from this hatchling.");
    } finally { setSaving(false); }
  }

  function resetNotes() { setNotes(""); }

  return {
    navigate,user,loading,profileLoading,
    snakes,projects,selectedProjectId,setSelectedProjectId,pairings,clutches,hatchlings,
    maleId,setMaleId,femaleId,setFemaleId,name,setName,goal,setGoal,targetTraits,setTargetTraits,priority,setPriority,
    holdbackStrategy,setHoldbackStrategy,futurePairingNotes,setFuturePairingNotes,notes,setNotes,
    pairingDate,setPairingDate,clutchDate,setClutchDate,eggCount,setEggCount,hatchDate,setHatchDate,
    hatchlingName,setHatchlingName,hatchlingSex,setHatchlingSex,hatchlingMorph,setHatchlingMorph,hatchlingWeight,setHatchlingWeight,
    futureMaleId,setFutureMaleId,futureFemaleId,setFutureFemaleId,futureTarget,setFutureTarget,
    saving,message,error,males,females,selectedMale,selectedFemale,geneticsSnapshot,forecast,targetList,targetMatches,
    holdbacks,linkedHatchlings,latestClutch,readiness,futureForecast,futureTargetWords,futureMatches,
    createProject,addPairing,addClutch,addHatchling,toggleHoldback,createSnakeFromHatchling,resetNotes,
  };
}
