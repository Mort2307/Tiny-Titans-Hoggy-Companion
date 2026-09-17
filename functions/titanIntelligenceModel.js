const MODEL = "gemini-3.8-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function generateTitanTurn({ apiKey, contents, tools, systemInstruction }) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      tools: [...tools, { googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      generationConfig: { temperature: 0.25, maxOutputTokens: 1800 },
      store: false,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error?.message || `Gemini API returned HTTP ${response.status}.`));
  return payload;
}

function collectParts(candidate) {
  return Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
}

function collectFunctionCalls(candidate) {
  return collectParts(candidate)
    .filter((part) => part && part.functionCall && typeof part.functionCall.name === "string")
    .map((part) => ({ id: part.functionCall.id, name: part.functionCall.name, args: part.functionCall.args || {} }));
}

function collectWebSources(candidate) {
  const metadata = candidate?.groundingMetadata;
  if (!metadata || !Array.isArray(metadata.groundingChunks)) return [];
  return metadata.groundingChunks
    .map((chunk) => chunk?.web)
    .filter((web) => web && typeof web.uri === "string" && web.uri.startsWith("http"))
    .map((web) => ({ title: String(web.title || "Web source"), uri: String(web.uri), type: "EXTERNAL_SOURCE" }))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.uri === item.uri) === index)
    .slice(0, 8);
}

function extractText(candidate) {
  return collectParts(candidate)
    .map((part) => typeof part?.text === "string" ? part.text.trim() : "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

module.exports = { MODEL, generateTitanTurn, collectFunctionCalls, collectWebSources, extractText };