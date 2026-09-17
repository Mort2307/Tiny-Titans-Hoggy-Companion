const REFUSAL_PATTERN = /refus|declin|ignore|not\s*(eat|interested)|reject/i;
const DAY_MS = 86400000;

function parseRecordDate(item) {
  const value = item?.date || item?.recordedAt || item?.createdAt || item?.timestamp;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function weightSamples(records) {
  return (records?.weights || [])
    .map((item) => ({ date: parseRecordDate(item), grams: Number(item.grams ?? item.weightGrams ?? item.weight ?? NaN) }))
    .filter((item) => Number.isFinite(item.date) && Number.isFinite(item.grams) && item.grams > 0)
    .sort((a, b) => a.date - b.date);
}

function feedingRefusals(records) {
  return (records?.feedings || []).filter((item) => REFUSAL_PATTERN.test(JSON.stringify(item)));
}

function buildWeightSummary(samples) {
  const firstWeight = samples[0]?.grams;
  const currentWeight = samples.at(-1)?.grams;
  const changeGrams = Number.isFinite(firstWeight) && Number.isFinite(currentWeight) ? Number((currentWeight - firstWeight).toFixed(2)) : undefined;
  const changes = samples.slice(1).map((item, index) => Number((item.grams - samples[index].grams).toFixed(2)));
  const largestDrop = changes.length ? Math.min(...changes) : undefined;
  const largestGain = changes.length ? Math.max(...changes) : undefined;
  return {
    sampleCount: samples.length,
    firstWeight,
    currentWeight,
    changeGrams,
    largestRecordedDrop: Number.isFinite(largestDrop) ? largestDrop : undefined,
    largestRecordedGain: Number.isFinite(largestGain) ? largestGain : undefined,
    confidence: samples.length >= 8 ? "High" : samples.length >= 4 ? "Moderate" : "More data needed",
  };
}

function buildShedAssociation(records) {
  const refusals = feedingRefusals(records);
  const sheds = (records?.sheds || []).map(parseRecordDate).filter((value) => value !== null);
  const refusalDates = refusals.map(parseRecordDate).filter((value) => value !== null);
  if (!refusalDates.length || !sheds.length) return undefined;
  const matches = refusalDates.filter((refusalDate) => sheds.some((shedDate) => Math.abs(refusalDate - shedDate) <= 7 * DAY_MS)).length;
  return {
    refusalCountWithDate: refusalDates.length,
    withinSevenDaysOfShed: matches,
    proportion: Number((matches / refusalDates.length).toFixed(3)),
    interpretation: "Temporal overlap only; this does not establish that shedding caused feeding refusal.",
  };
}

function buildAnimalIntelligenceSnapshot(profile, records) {
  const weights = weightSamples(records);
  const refusals = feedingRefusals(records);
  const association = buildShedAssociation(records);
  return {
    profile,
    recordCounts: {
      weights: weights.length,
      feedings: records?.feedings?.length || 0,
      sheds: records?.sheds?.length || 0,
      behaviours: records?.behaviours?.length || 0,
      health: records?.health?.length || 0,
    },
    weightSummary: buildWeightSummary(weights),
    feedingSummary: {
      total: records?.feedings?.length || 0,
      refusals: refusals.length,
      refusalRate: records?.feedings?.length ? Number((refusals.length / records.feedings.length).toFixed(3)) : undefined,
    },
    possibleTemporalAssociations: association ? [association] : [],
    dataLimitations: [
      "Only recorded Tiny Titans data was analysed.",
      "Missing records are not treated as negative evidence.",
      "Temporal associations are not treated as causation.",
    ],
  };
}

module.exports = { parseRecordDate, weightSamples, feedingRefusals, buildWeightSummary, buildShedAssociation, buildAnimalIntelligenceSnapshot };