import type { ReptileSpace } from "../types/ReptileSpace";
import { rackCapacity, toMillimetres } from "./spatialEngine";

export function validateReptileSpace(space: ReptileSpace): string[] {
  const errors: string[] = [];
  if (space.version !== 2) errors.push("unsupported spatial version");
  if (!space.id) errors.push("missing room id");
  for (const [key, value] of Object.entries(space.dimensions)) if (!Number.isFinite(value) || value <= 0) errors.push(`invalid room dimension: ${key}`);
  for (const object of space.objects) {
    if (!object.id || !object.kind) errors.push("spatial object missing identity");
    if (Object.values(object.dimensions).some((value) => !Number.isFinite(value) || value <= 0)) errors.push(`invalid dimensions: ${object.id}`);
    if (object.kind === "rack") {
      const metadata = object.metadata ?? {};
      const columns = Number(metadata.columns ?? 0);
      const rows = Number(metadata.rows ?? 0);
      const levels = Number(metadata.levels ?? 1);
      if (columns > 0 && rows > 0 && levels > 0 && Number(metadata.capacity) !== rackCapacity(columns, rows, levels)) errors.push(`rack capacity mismatch: ${object.id}`);
    }
  }
  return errors;
}

export function spatialContractSmokeTest(): void {
  if (toMillimetres(1, "m") !== 1000) throw new Error("metre conversion failed");
  if (toMillimetres(1, "ft") !== 304.8) throw new Error("feet conversion failed");
  if (rackCapacity(5, 6, 5) !== 150) throw new Error("rack capacity failed");
}
