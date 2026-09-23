import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import type { TitanAtAGlanceSliceId, TitanWeeklyMetricId, WeekStartDay } from "../types/easyNav";

export const TITAN_AT_A_GLANCE_OPTIONS: Array<{
  id: TitanAtAGlanceSliceId;
  label: string;
  icon: TinyTitansIconName;
  description: string;
  creatorOnly?: boolean;
}> = [
  { id: "feed", label: "Last Feed", icon: "feeding", description: "See the latest feeding event and log the next one." },
  { id: "weight", label: "Last Weight", icon: "weight", description: "See current weight and open weight recording." },
  { id: "shed", label: "Last Shed", icon: "shed", description: "See the latest shed status and open Shed Intelligence." },
  { id: "reminders", label: "Reminders", icon: "reminders", description: "See what's due next and manage reminders." },
  { id: "thisWeek", label: "This Week", icon: "timeline", description: "See the current keeper week using your chosen week start." },
  { id: "health", label: "Health", icon: "health", description: "Open health and veterinary records." },
  { id: "behaviour", label: "Behaviour", icon: "behaviour", description: "Open behaviour notes and observations." },
  { id: "husbandry", label: "Husbandry", icon: "husbandry", description: "Open husbandry and environmental care." },
  { id: "intelligence", label: "Titan Intelligence", icon: "titan", description: "Open the intelligence command centre." },
  { id: "genetics", label: "Genetics", icon: "genetics", description: "Open the Morph Library and genetics tools." },
  { id: "breeding", label: "Breeding", icon: "breeding", description: "Open the breeding planner." },
  { id: "snakes", label: "My Animals", icon: "animals", description: "Open your full animal collection." },
  { id: "learning", label: "Learn", icon: "academy", description: "Continue learning and challenges." },
  { id: "community", label: "Community", icon: "community", description: "Open the keeper community." },
  { id: "room", label: "Reptile Room", icon: "enclosure", description: "Open your reptile room." },
  { id: "knowledge", label: "Knowledge Base", icon: "knowledge", description: "Find an answer in the knowledge base." },
  { id: "contribution", label: "Contribute", icon: "contribution", description: "Make a contribution to Tiny Titans." },
  { id: "goals", label: "Titan Goals", icon: "challenge", description: "See your current Titan goals." },
  { id: "account", label: "Account", icon: "account", description: "Open account and personalisation." },
  { id: "creatorCentre", label: "Creator Centre", icon: "creator", description: "Open the private Tiny Titans Creator Centre.", creatorOnly: true },
];

export const TITAN_WEEKLY_METRIC_OPTIONS: Array<{
  id: TitanWeeklyMetricId;
  label: string;
  icon: TinyTitansIconName;
  description: string;
}> = [
  { id: "feed", label: "Feeding", icon: "feeding", description: "Feeding events recorded this week." },
  { id: "weight", label: "Weight", icon: "weight", description: "Weight records added this week." },
  { id: "shed", label: "Sheds", icon: "shed", description: "Shed records logged this week." },
  { id: "health", label: "Health", icon: "health", description: "Health records logged this week." },
  { id: "behaviour", label: "Behaviour", icon: "behaviour", description: "Behaviour observations logged this week." },
  { id: "breeding", label: "Breeding", icon: "breeding", description: "Breeding records recorded this week." },
  { id: "reminders", label: "Reminders", icon: "reminders", description: "Review what is due for the current week." },
  { id: "intelligence", label: "Titan Intelligence", icon: "titan", description: "Show active intelligence context for the current week." },
];

export const WEEK_START_OPTIONS: Array<{ value: WeekStartDay; label: string }> = [
  { value: 0, label: "Sunday" }, { value: 1, label: "Monday" }, { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" }, { value: 4, label: "Thursday" }, { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const DEFAULT_SLICES: TitanAtAGlanceSliceId[] = ["feed", "weight", "shed", "reminders"];
export const DEFAULT_WEEK_START: WeekStartDay = 0;
export const DEFAULT_WEEKLY_METRICS: TitanWeeklyMetricId[] = ["feed", "weight", "shed", "reminders"];
export const MIN_SLICES = 4;
export const MAX_SLICES = 6;
export const MIN_WEEKLY_METRICS = 2;
export const MAX_WEEKLY_METRICS = 6;
