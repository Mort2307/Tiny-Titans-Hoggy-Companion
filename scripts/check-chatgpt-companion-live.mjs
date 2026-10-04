// Read-only deployment smoke check. Never accepts credentials or writes keeper data.
import assert from "node:assert/strict";

const origin = "https://tinytitanskeeper.web.app";
async function request(path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: body ? "POST" : "GET", signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json, text/event-stream", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert(response.headers.get("content-type")?.includes("application/json"), `${path} returned HTML or non-JSON; deploy hosting:keeper and functions:tinyTitansMcp together.`);
  return { response, data: await response.json() };
}

const requiredTools = ["get_profile", "list_animals", "resolve_animal", "get_animal_summary", "get_keeper_snapshot", "get_feeding_history", "get_weight_history", "get_shed_history", "get_recent_activity", "list_reminders", "log_feeding", "log_weight", "log_shed", "log_behaviour", "log_health_observation", "create_reminders", "undo_last_action"];
const jobs = [
  ["root resource metadata", async () => assert.equal((await request("/.well-known/oauth-protected-resource")).data.resource, `${origin}/mcp`)],
  ["path-specific resource metadata", async () => assert.equal((await request("/.well-known/oauth-protected-resource/mcp")).data.resource, `${origin}/mcp`)],
  ["OAuth and registration metadata", async () => {
    const { data } = await request("/.well-known/oauth-authorization-server");
    assert.equal(data.issuer, origin); assert(data.code_challenge_methods_supported.includes("S256"));
    assert.equal(data.registration_endpoint, `${origin}/oauth/register`);
  }],
  ["all keeper commands", async () => {
    const { data } = await request("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" });
    const names = new Set(data.result.tools.map((tool) => tool.name));
    for (const name of requiredTools) assert(names.has(name), `Missing tool: ${name}`);
  }],
  ["OAuth challenge", async () => {
    const { response, data } = await request("/mcp", { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_animals", arguments: {} } });
    assert.equal(response.status, 401); assert.match(response.headers.get("www-authenticate") || "", /resource_metadata=/);
    assert(data.result.isError); assert(!data.result.structuredContent?.animals);
  }],
];
const results = await Promise.allSettled(jobs.map(([, run]) => run()));
let failures = 0;
results.forEach((result, index) => {
  if (result.status === "fulfilled") console.log(`PASS ${jobs[index][0]}`);
  else { failures++; console.error(`FAIL ${jobs[index][0]}: ${result.reason.message}`); }
});
if (failures) process.exitCode = 1;
else console.log("Public connection checks passed. Finish account authorization and verify a real read in ChatGPT before declaring account linking complete.");
