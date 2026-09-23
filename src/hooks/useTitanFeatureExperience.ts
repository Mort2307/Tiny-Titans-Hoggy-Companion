import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getLearningProgress } from "../services/learningEngine";
import { getUserSnakes } from "../services/snakeService";
import { learningSignalsFromProgress, buildSpeciesMasterySnapshot } from "../intelligence/v50/titanLearningAdapter";
import { buildAnimalTimeline, buildBehaviourProfile, getGrowthInsight } from "../intelligence/v50/animalIntelligenceEngine";
import { buildAnimalMasterRecord } from "../intelligence/v50/animalMasterRecordEngine";
import { featureById } from "../config/titanFeatureExperience";
import { buildFamilyRecords, birthDateFor, snakeRecords } from "../lib/titanFeatureRecords";
import type { Snake } from "../types/Snake";

export default function useTitanFeatureExperience() {
  const { featureId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const feature = featureById(featureId);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [referenceNow] = useState(() => Date.now());
  const [learningProgress, setLearningProgress] = useState(() => getLearningProgress(user?.uid));

  useEffect(() => {
    if (!user) return;
    setLearningProgress(getLearningProgress(user.uid));
    let active = true;
    void getUserSnakes(user.uid).then((result) => {
      if (!active) return;
      setSnakes(result);
      setSelectedSnakeId((current) => current || result[0]?.id || "");
    }).catch(() => { if (active) setSnakes([]); });
    return () => { active = false; };
  }, [user]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const records = useMemo(() => selectedSnake ? snakeRecords(selectedSnake) : null, [selectedSnake]);
  const growth = useMemo(() => records ? getGrowthInsight(records.weights) : null, [records]);
  const timeline = useMemo(() => records && selectedSnake ? buildAnimalTimeline({ name:selectedSnake.name, weights:records.weights, feedings:records.feedings, sheds:records.sheds, behaviour:records.behaviour, health:records.health }) : [], [records, selectedSnake]);
  const behaviour = useMemo(() => records ? buildBehaviourProfile(records.behaviour) : null, [records]);
  const masterRecord = useMemo(() => records && growth && behaviour && selectedSnake ? buildAnimalMasterRecord({ growth, behaviour, timeline, counts:{ weights:records.weights.length, feedings:records.feedings.length, sheds:records.sheds.length, behaviour:records.behaviour.length, health:records.health.length, journal:timeline.length, passport:timeline.length } }) : null, [records, growth, behaviour, timeline, selectedSnake]);
  const familyRecords = useMemo(() => buildFamilyRecords(snakes), [snakes]);
  const ageDays = useMemo(() => { if (!selectedSnake) return undefined; const born = birthDateFor(selectedSnake); return born ? Math.max(0, Math.floor((referenceNow - born) / 86400000)) : undefined; }, [selectedSnake, referenceNow]);
  const learningSignals = useMemo(() => learningSignalsFromProgress(learningProgress), [learningProgress]);
  const mastery = useMemo(() => buildSpeciesMasterySnapshot(learningProgress), [learningProgress]);

  return { navigate, user, feature, snakes, selectedSnakeId, setSelectedSnakeId, learningProgress, selectedSnake, records, growth, timeline, behaviour, masterRecord, familyRecords, ageDays, learningSignals, mastery };
}