import type { VivariumDigitalTwin } from "../types/vivariumTwin";

export function evaluateVivariumTwin(twin: VivariumDigitalTwin): VivariumDigitalTwin["intelligence"] {
  const c = twin.checklist;
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!c.substrateType) missing.push("Substrate not recorded");
  if (c.hideCount < 1) missing.push("At least one hide not recorded");
  if (c.waterBowlCount < 1) missing.push("Water bowl not recorded");
  if (!c.heatingType || c.heatingDeviceCount < 1) missing.push("Heating not recorded");
  if (!c.thermostatPresent) missing.push("Thermostat not recorded");
  if (!c.monitoring.includes("thermometer") && !c.monitoring.includes("temp-humidity")) missing.push("Temperature monitoring not recorded");
  if (!c.monitoring.includes("hygrometer") && !c.monitoring.includes("temp-humidity")) warnings.push("Humidity monitoring is not recorded");

  if (c.hideCount >= 2 && c.heatingDeviceCount > 0 && c.thermostatPresent) {
    warnings.push("Configuration records multiple refuge options alongside controlled heating");
  }
  if (c.thermostatPresent && !c.thermostatTargetC) warnings.push("Thermostat target temperature has not been recorded");
  if (c.substrateDepthMm != null && c.substrateDepthMm > 0 && c.substrateDepthMm < 10) warnings.push("Recorded substrate depth is very shallow");

  const total = 7;
  const complete = total - Math.min(total, new Set(missing).size);
  const completenessScore = Math.round((complete / total) * 100);

  return {
    lastVerifiedAt: new Date().toISOString(),
    completenessScore,
    missing,
    warnings,
  };
}
