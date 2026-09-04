import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import { getSnakeWeights } from "../services/weightService";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { findSnakeSpecies } from "../data/species";
import { SPECIES_SOURCES } from "../data/species/speciesSources";
import { ageInYears, growthStageForAge, husbandryReferenceBands, husbandryReferences } from "../data/husbandryReferences";
import "../styles/husbandry-care.css";

function trend(records: WeightRecord[]) { const a = [...records].sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime()); if (a.length < 2) return { tone: "unknown", text: "Keep recording weights so Tiny Titans can establish this snake's own trajectory.", change: null as number | null }; const change = a.at(-1)!.weight - a[0].weight; return { tone: change < 0 ? "check" : "good", text: `${a.length} measurements show a ${change > 0 ? "upward" : change < 0 ? "downward" : "stable"} recorded trajectory (${change >= 0 ? "+" : ""}${change.toFixed(1)} g).`, change }; }

function rangeText(range?: { min: number; max: number; unit: string; context?: string }) { if (!range) return null; return `${range.min}–${range.max}${range.unit}${range.context ? ` · ${range.context}` : ""}`; }

function SpeciesGuidance({ speciesValue }: { speciesValue: string }) {
  const species = findSnakeSpecies(speciesValue);
  const husbandry = species?.knowledge.husbandry;
  if (!species || !husbandry) return <section className="husbandry-panel"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">📚 SPECIES GUIDANCE</p><h2>Species profile not yet mapped</h2></div></div><p>Tiny Titans could not confidently match <strong>{speciesValue || "this species"}</strong> to the current species registry. No generic temperature or humidity values are substituted.</p></section>;
  const sources = species.knowledge.sourceIds.map((id) => SPECIES_SOURCES[id]).filter(Boolean);
  const temperatureRows = [
    ["Basking", rangeText(husbandry.temperature?.basking)],
    ["Warm side", rangeText(husbandry.temperature?.warmSide)],
    ["Cool side", rangeText(husbandry.temperature?.coolSide)],
    ["Night", rangeText(husbandry.temperature?.night)],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  const humidity = rangeText(husbandry.humidity?.target) ?? rangeText(husbandry.humidity?.acceptable);
  const risk = species.knowledge.riskClass;
  return <section className="husbandry-panel">
    <div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">🧬 SPECIES-SPECIFIC GUIDANCE</p><h2>{species.commonNames[0]}</h2><p className="husbandry-muted"><em>{species.acceptedScientificName}</em> · evidence confidence: <strong>{husbandry.evidenceLevel}</strong> · reviewed {species.knowledge.reviewedOn}</p></div><span className={`husbandry-assessment-badge ${risk === "venomous" || risk === "high-risk" ? "check" : "good"}`}>{risk === "venomous" ? "☠️ Venomous" : risk === "high-risk" ? "⚠️ High risk" : risk === "specialist" ? "🟠 Specialist" : "🟢 Companion"}</span></div>
    <p>{species.knowledge.summary}</p>
    {(risk === "venomous" || risk === "high-risk") && <div className="husbandry-callout check"><strong>Safety boundary:</strong> this species needs specialist facilities/training. Tiny Titans provides environmental context but deliberately does not provide casual handling procedures for venomous or high-risk snakes.</div>}
    <div className="husbandry-stats husbandry-stats--five">