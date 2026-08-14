import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Snake } from "../types/Snake";
import type { FoodType, FeedingMethod, FeedingRecord, FeedingResponse } from "../types/Feeding";
import { getUserSnakes } from "../services/snakeService";
import { deleteSnakeFeeding, getSnakeFeedings, saveSnakeFeeding } from "../services/feedingService";
import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";
import { generateId } from "../utils/generateId";
import BackHomeButton from "../components/BackHomeButton";

const foodTypes: FoodType[] = ["Pinkie Mouse", "Fuzzy Mouse", "Hopper Mouse", "Adult Mouse", "Rat Pup", "Rat Fuzzy", "Quail", "Other"];
const feedingMethods: FeedingMethod[] = ["Tongs", "Drop Feed", "Hand Fed", "Scented", "Other"];
const feedingResponses: FeedingResponse[] = ["Accepted", "Refused", "Partial", "Regurgitated"];
const responseEmoji: Record<FeedingResponse, string> = { Accepted: "✅", Refused: "❌", Partial: "⚠️", Regurgitated: "🔴" };

export default function FeedingTracker() {
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, weightUnit, formatWeight } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [feedings, setFeedings] = useState<FeedingRecord[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [loadingFeedings, setLoadingFeedings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [foodType, setFoodType] = useState<FoodType>("Pinkie Mouse");
  const [customFood, setCustomFood] = useState("");
  const [size, setSize] = useState("");
  const [weight, setWeight] = useState("");
  const [feedingMethod, setFeedingMethod] = useState<FeedingMethod>("Tongs");
  const [response, setResponse] = useState<FeedingResponse>("Accepted");