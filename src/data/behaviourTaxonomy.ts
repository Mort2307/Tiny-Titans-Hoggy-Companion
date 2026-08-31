export type BehaviourPrimaryCategory =
  | "movement"
  | "resting"
  | "sleeping"
  | "feeding"
  | "drinking"
  | "exploration"
  | "climbing"
  | "burrowing"
  | "defensive"
  | "social-reproductive"
  | "shedding"
  | "digestive"
  | "respiratory"
  | "elimination"
  | "handling"
  | "environmental-response"
  | "medical-clinical"
  | "other";

export interface BehaviourSubcategory { value: string; label: string; }
export interface BehaviourCategory { value: BehaviourPrimaryCategory; label: string; description: string; subcategories: BehaviourSubcategory[]; }

export const BEHAVIOUR_CATEGORIES: BehaviourCategory[] = [
  { value: "movement", label: "🚶 Movement", description: "Locomotion, pacing, wandering and changes in movement pattern.", subcategories: [{ value: "normal-movement", label: "Normal movement" }, { value: "repetitive", label: "Repetitive / pacing" }, { value: "slow-movement", label: "Unusually slow movement" }, { value: "uncoordinated", label: "Uncoordinated movement" }] },
  { value: "resting", label: "🛌 Resting", description: "Quiet resting, coiling, positioning and inactivity.", subcategories: [{ value: "coiled", label: "Coiled" }, { value: "stretched", label: "Stretched out" }, { value: "hidden-rest", label: "Hidden / sheltered" }] },
  { value: "sleeping", label: "😴 Sleeping", description: "Observed sleep or likely sleep states.", subcategories: [{ value: "sleeping", label: "Sleeping" }, { value: "sleep-position", label: "Unusual sleep position" }] },
  { value: "feeding", label: "🍽️ Feeding", description: "Food detection, approach, strike, handling and feeding response.", subcategories: [{ value: "food-investigation", label: "Investigating food" }, { value: "strike", label: "Strike" }, { value: "feeding", label: "Feeding" }, { value: "feeding-reluctance", label: "Feeding reluctance" }] },
  { value: "drinking", label: "💧 Drinking", description: "Water-seeking or drinking behaviour.", subcategories: [{ value: "drinking", label: "Drinking" }, { value: "water-investigation", label: "Investigating water" }] },
  { value: "exploration", label: "🧭 Exploration", description: "Investigating new or familiar surroundings.", subcategories: [{ value: "exploring", label: "Exploring" }, { value: "climbing-search", label: "Searching / route checking" }] },
  { value: "climbing", label: "🧗 Climbing", description: "Climbing, elevated positioning and attempts to climb.", subcategories: [{ value: "successful-climb", label: "Successful climb" }, { value: "attempted-climb", label: "Attempted climb" }, { value: "elevated-rest", label: "Resting elevated" }] },
  { value: "burrowing", label: "🕳️ Burrowing", description: "Digging, tunnelling and substrate interaction.", subcategories: [{ value: "digging", label: "Digging" }, { value: "burrowed", label: "Burrowed" }, { value: "surfacing", label: "Surfacing" }] },
  { value: "defensive", label: "🛡️ Defensive / Boundary", description: "Threat displays, avoidance and boundary-setting. The same display may have different meanings depending on context.", subcategories: [{ value: "hiss", label: "Hiss" }, { value: "head-flattening", label: "Head / neck flattening" }, { value: "false-strike", label: "Bluff / false strike" }, { value: "strike", label: "Contact strike" }, { value: "musking", label: "Musking" }, { value: "freeze", label: "Freeze / stillness" }, { value: "avoidance", label: "Avoidance / retreat" }] },
  { value: "social-reproductive", label: "🧬 Social / Reproductive", description: "Courtship, mating and reproductive-context behaviour.", subcategories: [{ value: "courtship", label: "Courtship" }, { value: "mating", label: "Mating" }, { value: "post-mating", label: "Post-mating" }] },
  { value: "shedding", label: "🐍 Shedding", description: "Pre-shed, shed and post-shed observations.", subcategories: [{ value: "pre-shed", label: "Pre-shed" }, { value: "shedding", label: "Active shed" }, { value: "post-shed", label: "Post-shed" }, { value: "retained", label: "Retained material" }] },
  { value: "digestive", label: "🥣 Digestive", description: "Post-feeding digestive and gastrointestinal observations.", subcategories: [{ value: "post-feed", label: "Post-feed" }, { value: "regurgitation", label: "Regurgitation" }, { value: "defecation", label: "Defecation" }] },
  { value: "respiratory", label: "🫁 Respiratory", description: "Observed breathing-related signs or sounds; not a diagnosis.", subcategories: [{ value: "breathing-change", label: "Breathing change" }, { value: "audible-breathing", label: "Audible breathing" }, { value: "open-mouth", label: "Open-mouth behaviour" }] },
  { value: "elimination", label: "🚽 Elimination", description: "Urates, faeces and elimination-related observations.", subcategories: [{ value: "faeces", label: "Faeces" }, { value: "urates", label: "Urates" }, { value: "combined", label: "Combined elimination" }] },
  { value: "handling", label: "🤲 Handling", description: "Responses observed during or after routine handling.", subcategories: [{ value: "calm", label: "Calm" }, { value: "exploratory", label: "Exploratory" }, { value: "avoidance", label: "Avoidance" }, { value: "boundary", label: "Boundary-setting" }] },
  { value: "environmental-response", label: "🏠 Environmental response", description: "Behaviour linked to enclosure, temperature, substrate, lighting or other environmental change.", subcategories: [{ value: "temperature-choice", label: "Temperature choice" }, { value: "substrate-response", label: "Substrate response" }, { value: "enclosure-change", label: "Response to enclosure change" }] },
  { value: "medical-clinical", label: "🩺 Medical / Clinical observation", description: "Observed signs that may warrant veterinary assessment. Tiny Titans does not diagnose conditions.", subcategories: [{ value: "injury", label: "Possible injury" }, { value: "swelling", label: "Swelling / visible change" }, { value: "skin-change", label: "Skin change" }, { value: "neurological", label: "Neurological-looking sign" }, { value: "other-clinical", label: "Other clinical observation" }] },
  { value: "other", label: "✨ Other", description: "A useful observation that does not fit another category.", subcategories: [{ value: "other", label: "Other" }] },
];

export function getBehaviourCategory(value: string) { return BEHAVIOUR_CATEGORIES.find((item) => item.value === value); }
