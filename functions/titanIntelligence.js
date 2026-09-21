const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { resolveTitanAccess } = require("./titanIntelligenceAccess");
const { getDeclarations, executeTool } = require("./titanIntelligenceTools");
const { buildSystemInstruction } = require("./titanIntelligencePrompt");
const { generateTitanTurn, collectFunctionCalls, collectWebSources, extractText, GEMINI_API_KEY, MODEL } = require("./titanIntelligenceModel");
const { consumeTitanUsage, getUsageLimit } = require("./titanIntelligenceUsage");
const { buildTitanProvenance } = require("./titanIntelligenceProvenance");

const MAX_QUESTION_LENGTH = 6000;
const MAX_HISTORY_ITEMS = 10;
const VALID_WORKSPACES = new Set(["personal", "rescue", "business", "seller"]);


function sanitiseSpeciesReference(value) {
  if (!value || typeof value !== "object") return null;
  const cleanText = (input, max = 700) => typeof input === "string" ? input.trim().slice(0, max) : "";
  const cleanList = (input, maxItems = 24, maxLength = 500) => Array.isArray(input) ? input.filter((item) => typeof item === "string").slice(0, maxItems).map((item) => item.slice(0, maxLength)) : [];
  const husbandry = Array.isArray(value.husbandry) ? value.husbandry.slice(0, 16).flatMap((item) => item && typeof item === "object" ? [{
    label: cleanText(item.label, 120),
    guidance: cleanText(item.guidance, 900),
    priority: cleanText(item.priority, 40),
    basis: cleanText(item.basis, 80),
    caveat: cleanText(item.caveat, 900),
  }] : []) : [];
  const healthWatch = Array.isArray(value.healthWatch) ? value.healthWatch.slice(0, 10).flatMap((item) => item && typeof item === "object" ? [{
    concern: cleanText(item.concern, 140),
    watchFor: cleanList(item.watchFor, 8, 180),
    riskFactors: cleanList(item.riskFactors, 8, 180),
    prevention: cleanText(item.prevention, 700),
    priority: cleanText(item.priority, 40),
    basis: cleanText(item.basis, 80),
    caveat: cleanText(item.caveat, 900),
  }] : []) : [];
  return {
    id: cleanText(value.id, 160),
    commonName: cleanText(value.commonName, 180),
    scientificName: cleanText(value.scientificName, 200),
    animalGroup: cleanText(value.animalGroup, 60),
    family: cleanText(value.family, 100),
    genus: cleanText(value.genus, 100),
    lifestyle: cleanList(value.lifestyle, 8, 60),
    dietaryGuild: cleanText(value.dietaryGuild, 80),
    careStatus: cleanText(value.careStatus, 60),
    careResolution: cleanList(value.careResolution, 8, 160),
    husbandry,
    healthBaseline: cleanList(value.healthBaseline, 10, 600),
    healthWatch,
    unresolved: cleanList(value.unresolved, 20, 500),
  };
}

function sanitiseHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_ITEMS).flatMap((item) => {
    const role = item?.role === "model" ? "model" : item?.role === "user" ? "user" : null;
    const text = typeof item?.content === "string" ? item.content.trim().slice(0, 5000) : "";
    return role && text ? [{ role, parts: [{ text }] }] : [];
  });
}

function historyPlusQuestion(history, question, animalId, speciesReference) {
  const animalContext = animalId ? `\nSelected Tiny Titans animal ID: ${animalId}\nUse this ID only with the authorised Tiny Titans tools; do not invent another.` : "";
  const speciesContext = speciesReference ? `\n\nAPP_CATALOGUE_CONTEXT — canonical Tiny Titans species reference snapshot:\n${JSON.stringify(speciesReference)}\nPreserve evidence basis, caveats and unresolved gaps from this context.` : "";
  return [...sanitiseHistory(history), { role: "user", parts: [{ text: `${question}${animalContext}${speciesContext}` }] }];
}
  return [...sanitiseHistory(history), { role: "user", parts: [{ text: `${question}${context}` }] }];
}

exports.askTitan = onCall({ region: "europe-west2", secrets: [GEMINI_API_KEY], timeoutSeconds: 90, memory: "512MiB" }, async (request) => {
  const uid = String(request.auth?.uid || "");
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in to Ask Titan.");
  const question = String(request.data?.question || "").trim();
  const workspaceKind = VALID_WORKSPACES.has(String(request.data?.workspaceKind || "personal")) ? String(request.data?.workspaceKind || "personal") : "personal";
  const animalId = typeof request.data?.animalId === "string" && request.data.animalId.trim() ? request.data.animalId.trim().slice(0, 160) : undefined;
  const speciesReference = sanitiseSpeciesReference(request.data?.speciesReference);
  if (!question) throw new HttpsError("invalid-argument", "Enter a question for Titan Intelligence.");
  if (question.length > MAX_QUESTION_LENGTH) throw new HttpsError("invalid-argument", `Questions are limited to ${MAX_QUESTION_LENGTH} characters.`);

  const access = await resolveTitanAccess(uid, workspaceKind);
  if (!access.allowed) throw new HttpsError("permission-denied", "Ask Titan is included with all paid Tiny Titans tiers. Rescue workspace members can use it when the Rescue workspace is active.");

  let usage;
  try {
    usage = await consumeTitanUsage(uid, access.effectiveTier);
  } catch (error) {
    if (error?.code === "usage-exhausted") throw new HttpsError("resource-exhausted", `Your Titan Intelligence allowance has been reached for this month. Current allowance: ${getUsageLimit(access.effectiveTier)} questions.`);
    throw error;
  }

  const contents = historyPlusQuestion(request.data?.history, question, animalId, speciesReference);
  const toolCalls = [];
  const webSources = [];
  let responsePayload;

  try {
    let rounds = 0;
    while (rounds < 4) {
      rounds += 1;
      responsePayload = await generateTitanTurn({ apiKey: GEMINI_API_KEY.value(), contents, tools: getDeclarations(), systemInstruction: buildSystemInstruction({ workspaceKind, effectiveTier: access.effectiveTier }) });
      const candidate = responsePayload?.candidates?.[0];
      const sources = collectWebSources(candidate);
      for (const source of sources) if (!webSources.some((item) => item.uri === source.uri)) webSources.push(source);
      const functionCalls = collectFunctionCalls(candidate);
      if (!functionCalls.length) break;
      if (candidate?.content) contents.push(candidate.content);
      const responses = [];
      for (const call of functionCalls) {
        let result;
        let kind = "user_data";
        try {
          const executed = await executeTool(uid, call.name, call.args, workspaceKind);
          result = executed.data;
          kind = executed.kind;
        } catch (error) {
          result = { error: error?.message || "The requested Tiny Titans tool could not complete." };
        }
        toolCalls.push({ name: call.name, kind });
        responses.push({ functionResponse: { name: call.name, response: result || { result: null }, ...(call.id ? { id: call.id } : {}) } });
      }
      contents.push({ role: "user", parts: responses });
    }
  } catch (error) {
    console.error("Titan Intelligence generation failed", { uid, message: error?.message || error });
    if (String(error?.message || "").toLowerCase().includes("api key") || String(error?.message || "").toLowerCase().includes("permission")) {
      throw new HttpsError("failed-precondition", "Titan Intelligence is not fully configured yet. The Tiny Titans creator needs to connect the AI provider before Ask Titan can be used.");
    }
    throw new HttpsError("internal", "Titan Intelligence could not complete this response. Your Tiny Titans records were not changed.");
  }

  const candidate = responsePayload?.candidates?.[0];
  const text = extractText(candidate);
  if (!text) throw new HttpsError("internal", "Titan Intelligence returned no usable answer.");
  const provenance = buildTitanProvenance({ toolCalls, webSources });
  return {
    success: true,
    responseId: crypto.randomUUID(),
    text,
    model: MODEL,
    sources: webSources,
    searchUsed: webSources.length > 0,
    toolCalls: toolCalls.map(({ name, kind }) => ({ name, kind })),
    provenance,
    usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining },
    access: { effectiveTier: access.effectiveTier, source: access.source, workspaceKind: access.workspaceKind },
  };
});