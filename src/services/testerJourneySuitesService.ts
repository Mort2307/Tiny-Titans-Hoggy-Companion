import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { TesterCheck } from "./testerBotService";

const VALID_SHED_STATUSES = new Set(["Complete", "Partial", "Problematic"]);
const VALID_FEEDING_RESPONSES = new Set(["Accepted", "Refused", "Partial", "Regurgitated"]);
const VALID_WEIGHT_UNITS = new Set(["g", "kg"]);

function dateIsValid(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function finitePositive(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function getCurrentUserData(uid: string) {
  return getDoc(doc(db, "users", uid));
}

async function getCurrentUserSnakes(uid: string) {
  return getDocs(collection(db, "users", uid, "snakes"));
}

export async function createSnakeProfileChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Snake profile suite requires an authenticated UID.");

  let snakes: Awaited<ReturnType<typeof getCurrentUserSnakes>> | null = null;
  let loadError: string | null = null;
  const load = async () => {
    if (snakes || loadError) return;
    try {
      snakes = await getCurrentUserSnakes(uid);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to read snake profiles.";
    }
  };

  return [
    {
      checkId: "snakes-readable",
      name: "Current user's snake profiles are readable",
      category: "snakes",
      severity: "critical",
      run: async () => {
        await load();
        return snakes
          ? { status: "pass", message: `Read ${snakes.size} snake profile${snakes.size === 1 ? "" : "s"} from the authenticated user's Firebase scope.` }
          : { status: "fail", message: loadError ?? "Snake profiles could not be read." };
      },
    },
    {
      checkId: "snakes-required-fields",
      name: "Snake profiles contain the required identity fields",
      category: "snakes",
      severity: "high",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Snake profile snapshot unavailable." };
        const invalid: string[] = [];
        for (const snakeDoc of snakes.docs) {
          const snake = snakeDoc.data() as Record<string, unknown>;
          if (typeof snake.name !== "string" || !snake.name.trim()) invalid.push(`${snakeDoc.id}: name`);
          if (typeof snake.species !== "string" || !snake.species.trim()) invalid.push(`${snakeDoc.id}: species`);
          if (!Array.isArray(snake.morphs)) invalid.push(`${snakeDoc.id}: morphs`);
          if (!Array.isArray(snake.hets)) invalid.push(`${snakeDoc.id}: hets`);
        }
        return invalid.length === 0
          ? { status: "pass", message: `All ${snakes.size} stored snake profiles contain the core identity/genetics fields.` }
          : { status: "fail", message: `Invalid snake profile fields: ${invalid.slice(0, 8).join(", ")}${invalid.length > 8 ? "…" : ""}` };
      },
    },
    {
      checkId: "snakes-no-undefined-enclosure",
      name: "Snake records do not contain an invalid enclosure value",
      category: "firebase",
      severity: "critical",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Snake profile snapshot unavailable." };
        const invalid: string[] = [];
        for (const snakeDoc of snakes.docs) {
          const snake = snakeDoc.data() as Record<string, unknown>;
          if ("enclosure" in snake && snake.enclosure === undefined) invalid.push(snakeDoc.id);
        }
        return invalid.length === 0
          ? { status: "pass", message: "No stored snake profile contains an undefined enclosure field." }
          : { status: "fail", message: `Found undefined enclosure values in ${invalid.length} snake profile(s).` };
      },
    },
  ];
}

export async function createWeightChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Weight suite requires an authenticated UID.");

  let snakes: Awaited<ReturnType<typeof getCurrentUserSnakes>> | null = null;
  let loadError: string | null = null;
  const load = async () => {
    if (snakes || loadError) return;
    try {
      snakes = await getCurrentUserSnakes(uid);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to read weight data.";
    }
  };

  return [
    {
      checkId: "weights-history-valid",
      name: "Weight history contains valid dates, values and units",
      category: "weights",
      severity: "critical",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Weight snapshot unavailable." };
        const invalid: string[] = [];
        let total = 0;
        for (const snakeDoc of snakes.docs) {
          const snake = snakeDoc.data() as Record<string, unknown>;
          const history = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
          total += history.length;
          for (const record of history) {
            const item = record as Record<string, unknown>;
            if (!finitePositive(item.weight) || !dateIsValid(item.date) || !VALID_WEIGHT_UNITS.has(String(item.unit))) {
              invalid.push(`${snakeDoc.id}:${String(item.id ?? "unknown")}`);
            }
          }
        }
        return invalid.length === 0
          ? { status: "pass", message: `Validated ${total} weight records across ${snakes.size} snake profile(s).` }
          : { status: "fail", message: `${invalid.length} weight record(s) contain an invalid weight, date or unit.` };
      },
    },
    {
      checkId: "weights-history-chronology",
      name: "Weight history is chronologically sortable",
      category: "weights",
      severity: "medium",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Weight snapshot unavailable." };
        let checked = 0;
        let unsortable = 0;
        for (const snakeDoc of snakes.docs) {
          const snake = snakeDoc.data() as Record<string, unknown>;
          const history = (Array.isArray(snake.weightHistory) ? snake.weightHistory : [])
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
          checked += history.length;
          if (history.some((item) => !dateIsValid(item.date))) unsortable += 1;
        }
        return unsortable === 0
          ? { status: "pass", message: `${checked} weight records have usable dates for chronological history/statistics.` }
          : { status: "fail", message: `${unsortable} snake weight histories contain an invalid date.` };
      },
    },
  ];
}

export async function createFeedingChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Feeding suite requires an authenticated UID.");

  let snakes: Awaited<ReturnType<typeof getCurrentUserSnakes>> | null = null;
  let loadError: string | null = null;
  const load = async () => {
    if (snakes || loadError) return;
    try {
      snakes = await getCurrentUserSnakes(uid);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to read feeding data.";
    }
  };

  return [
    {
      checkId: "feeding-records-valid",
      name: "Feeding records contain valid dates and responses",
      category: "feeding",
      severity: "high",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Feeding snapshot unavailable." };
        let total = 0;
        const invalid: string[] = [];
        for (const snakeDoc of snakes.docs) {
          const snapshot = await getDocs(collection(db, "users", uid, "snakes", snakeDoc.id, "feedings"));
          total += snapshot.size;
          for (const feedingDoc of snapshot.docs) {
            const feeding = feedingDoc.data() as Record<string, unknown>;
            if (!dateIsValid(feeding.date) || !VALID_FEEDING_RESPONSES.has(String(feeding.response))) invalid.push(`${snakeDoc.id}:${feedingDoc.id}`);
          }
        }
        return invalid.length === 0
          ? { status: "pass", message: `Validated ${total} feeding record(s).` }
          : { status: "fail", message: `${invalid.length} feeding record(s) contain an invalid date or response.` };
      },
    },
    {
      checkId: "feeding-record-snake-links",
      name: "Feeding records remain linked to their parent snake",
      category: "feeding",
      severity: "high",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Feeding snapshot unavailable." };
        const invalid: string[] = [];
        for (const snakeDoc of snakes.docs) {
          const snapshot = await getDocs(collection(db, "users", uid, "snakes", snakeDoc.id, "feedings"));
          for (const feedingDoc of snapshot.docs) {
            const feeding = feedingDoc.data() as Record<string, unknown>;
            if (feeding.snakeId !== snakeDoc.id) invalid.push(`${snakeDoc.id}:${feedingDoc.id}`);
          }
        }
        return invalid.length === 0
          ? { status: "pass", message: "All inspected feeding records point back to their owning snake document." }
          : { status: "fail", message: `${invalid.length} feeding record(s) contain an incorrect snakeId link.` };
      },
    },
  ];
}

export async function createShedJourneyChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Shed suite requires an authenticated UID.");

  let snakes: Awaited<ReturnType<typeof getCurrentUserSnakes>> | null = null;
  let loadError: string | null = null;
  const load = async () => {
    if (snakes || loadError) return;
    try {
      snakes = await getCurrentUserSnakes(uid);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to read shed data.";
    }
  };

  return [
    {
      checkId: "sheds-records-valid",
      name: "Shed records preserve date, status and retained-area data",
      category: "sheds",
      severity: "critical",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Shed snapshot unavailable." };
        let total = 0;
        const invalid: string[] = [];
        for (const snakeDoc of snakes.docs) {
          const snapshot = await getDocs(collection(db, "users", uid, "snakes", snakeDoc.id, "sheds"));
          total += snapshot.size;
          for (const shedDoc of snapshot.docs) {
            const shed = shedDoc.data() as Record<string, unknown>;
            if (!dateIsValid(shed.date) || !VALID_SHED_STATUSES.has(String(shed.status)) || !Array.isArray(shed.retainedAreas)) invalid.push(`${snakeDoc.id}:${shedDoc.id}`);
          }
        }
        return invalid.length === 0
          ? { status: "pass", message: `Validated ${total} shed record(s), including independent date/status fields.` }
          : { status: "fail", message: `${invalid.length} shed record(s) have invalid date/status/retained-area data.` };
      },
    },
    {
      checkId: "sheds-retained-areas-valid",
      name: "Shed retained areas use the recognised vocabulary",
      category: "sheds",
      severity: "high",
      run: async () => {
        await load();
        if (!snakes) return { status: "blocked", message: loadError ?? "Shed snapshot unavailable." };
        const allowed = new Set(["Eye Cap", "Head", "Tail Tip", "Body", "Other"]);
        const invalid: string[] = [];
        for (const snakeDoc of snakes.docs) {
          const snapshot = await getDocs(collection(db, "users", uid, "snakes", snakeDoc.id, "sheds"));
          for (const shedDoc of snapshot.docs) {
            const shed = shedDoc.data() as Record<string, unknown>;
            const retainedAreas = Array.isArray(shed.retainedAreas) ? shed.retainedAreas : [];
            if (retainedAreas.some((area) => typeof area !== "string" || !allowed.has(area))) invalid.push(`${snakeDoc.id}:${shedDoc.id}`);
          }
        }
        return invalid.length === 0
          ? { status: "pass", message: "All retained shed areas use recognised values." }
          : { status: "fail", message: `${invalid.length} shed record(s) contain an unsupported retained area.` };
      },
    },
  ];
}

export async function createAccountJourneyChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Account suite requires an authenticated UID.");
  return [
    {
      checkId: "account-document-exists",
      name: "Authenticated account document exists",
      category: "account",
      severity: "critical",
      run: async () => {
        try {
          const snapshot = await getCurrentUserData(uid);
          return snapshot.exists()
            ? { status: "pass", message: "The authenticated user's account document exists." }
            : { status: "fail", message: "The authenticated user's account document is missing." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Unable to read account document." };
        }
      },
    },
    {
      checkId: "account-setup-complete",
      name: "Account setup state is complete",
      category: "account",
      severity: "high",
      run: async () => {
        try {
          const snapshot = await getCurrentUserData(uid);
          if (!snapshot.exists()) return { status: "blocked", message: "Account document does not exist." };
          return snapshot.data().setupComplete === true
            ? { status: "pass", message: "setupComplete is true for the authenticated account." }
            : { status: "fail", message: "The account exists but setupComplete is not true." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Unable to verify account setup." };
        }
      },
    },
  ];
}
