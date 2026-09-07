import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getPrivacyPreferences } from "./privacyService";
import { resolveCommunityLocation, type ResolvedCommunityLocation } from "./communityLocationResolver";

export type CommunityCount = {
  name: string;
  count: number;
};

export type CommunityLocationMember = {
  uid: string;
  displayName: string;
  role: string;
  city: string;
  country: string;
  areaId: string;
  latitude: number;
  longitude: number;
  snakeCount?: number;
  speciesCounts?: CommunityCount[];
  morphCounts?: CommunityCount[];
};

type AnyRecord = Record<string, unknown>;

type CommunitySnakeSummary = {
  snakeCount: number;
  speciesCounts: CommunityCount[];
  morphCounts: CommunityCount[];
};

function hasValidCoordinates(location: AnyRecord | undefined): location is AnyRecord & { latitude: number; longitude: number } {
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    && !(latitude === 0 && longitude === 0);
}

function normaliseLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function firstString(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return normaliseLabel(value);
  }
  return "";
}

function stringList(record: AnyRecord, keys: string[]) {
  const values: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) values.push(normaliseLabel(value));
    else if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string" && entry.trim()) values.push(normaliseLabel(entry));
        else if (entry && typeof entry === "object") {
          const entryRecord = entry as AnyRecord;
          const label = firstString(entryRecord, ["name", "label", "morph", "gene", "id"]);
          if (label) values.push(label);
        }
      }
    }
  }
  return values;
}

function increment(counts: Map<string, number>, label: string) {
  const key = normaliseLabel(label);
  if (!key) return;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function toSortedCounts(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function getSnakeSpecies(record: AnyRecord) {
  return firstString(record, ["speciesName", "species", "speciesCommonName", "speciesLabel", "speciesId"]);
}

function getSnakeMorphs(record: AnyRecord) {
  return stringList(record, ["morph", "morphName", "morphs", "visualMorphs", "genetics", "genes", "traits"]);
}

async function getCommunitySnakeSummary(uid: string): Promise<CommunitySnakeSummary | undefined> {
  try {
    const snapshot = await getDocs(collection(db, "users", uid, "snakes"));
    const speciesCounts = new Map<string, number>();
    const morphCounts = new Map<string, number>();

    snapshot.docs.forEach((item) => {
      const snake = item.data() as AnyRecord;
      const species = getSnakeSpecies(snake);
      if (species) increment(speciesCounts, species);

      const morphs = getSnakeMorphs(snake);
      for (const morph of new Set(morphs)) increment(morphCounts, morph);
    });

    return {
      snakeCount: snapshot.size,
      speciesCounts: toSortedCounts(speciesCounts),
      morphCounts: toSortedCounts(morphCounts),
    };
  } catch (error) {
    console.warn("Tiny Titans: unable to read community snake intelligence", { uid, error });
    return undefined;
  }
}

async function buildCanonicalLocation(location: AnyRecord, city: string, country: string): Promise<ResolvedCommunityLocation | null> {
  if (hasValidCoordinates(location)) {
    return {
      city,
      country,
      areaId: typeof location.areaId === "string" && location.areaId.trim()
        ? location.areaId.trim()
        : `legacy-${city.toLocaleLowerCase("en-GB")}-${country.toLocaleLowerCase("en-GB")}`,
      latitude: Number(location.latitude.toFixed(2)),
      longitude: Number(location.longitude.toFixed(2)),
      precision: "city",
      source: "open-meteo-geocoding",
      countryCode: typeof location.countryCode === "string" ? location.countryCode : undefined,
    };
  }

  try {
    return await resolveCommunityLocation(city, country);
  } catch {
    return null;
  }
}

/** Creator-only community location intelligence using the canonical privacy document and city-level coordinates. */
export async function getCommunityLocationMembers(): Promise<CommunityLocationMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  const candidates = await Promise.all(snapshot.docs.map(async (item) => {
    const data = item.data() as AnyRecord;
    const preferences = await getPrivacyPreferences(item.id).catch(() => null);
    if (!preferences?.communityLocation) return null;

    const location = data.approximateLocation as AnyRecord | undefined;
    const city = String(location?.city ?? "").trim();
    const country = String(location?.country ?? "").trim();
    if (!location || !city || !country) return null;

    const canonical = await buildCanonicalLocation(location, city, country);
    if (!canonical) return null;

    return {
      uid: item.id,
      displayName: String(data.displayName ?? "").trim() || "Anonymous Titan",
      role: String(data.role ?? "user").trim() || "user",
      city: canonical.city,
      country: canonical.country,
      areaId: canonical.areaId,
      latitude: canonical.latitude,
      longitude: canonical.longitude,
    } satisfies CommunityLocationMember;
  }));

  const eligible = candidates.filter((member): member is CommunityLocationMember => member !== null);
  return Promise.all(eligible.map(async (member) => {
    const summary = await getCommunitySnakeSummary(member.uid);
    return summary
      ? { ...member, ...summary }
      : member;
  }));
}
