import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

// Run the exported Firebase HTTP/callable handlers against isolated in-memory
// fixtures. No production SDK, credentials, network calls or animal records.
const source = fs.readFileSync(process.env.COMPANION_TEST_SOURCE || "functions/chatgptCompanion.js", "utf8");
const origin = "https://tinytitanskeeper.web.app";
const clientId = "https://chatgpt.com/oauth/client.json";
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const resource = `${origin}/mcp`;
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const plain = (value) => JSON.parse(JSON.stringify(value));
const dateAfter = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function harness() {
  const rows = new Map();
  let sequence = 0;
  class Timestamp {
    constructor(ms) { this.ms = ms; }
    toMillis() { return this.ms; }
    toDate() { return new Date(this.ms); }
    static fromMillis(ms) { return new Timestamp(ms); }
  }
  const deleted = Symbol("delete");
  const FieldValue = { delete: () => deleted, serverTimestamp: () => Timestamp.fromMillis(Date.now() + sequence++) };
  const clone = (data) => {
    if (data instanceof Timestamp) return Timestamp.fromMillis(data.ms);
    if (Array.isArray(data)) return data.map(clone);
    if (data && typeof data === "object") return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, clone(v)]));
    return data;
  };
  function write(path, data, merge = false) {
    const target = merge ? clone(rows.get(path) || {}) : {};
    for (const [key, value] of Object.entries(data)) {
      const keys = key.split(".");
      let current = target;
      for (const part of keys.slice(0, -1)) current = current[part] ||= {};
      if (value === deleted) delete current[keys.at(-1)];
      else current[keys.at(-1)] = clone(value);
    }
    rows.set(path, target);
  }
  const comparable = (x) => x instanceof Timestamp ? x.ms : x;
  class Ref {
    constructor(path) { this.path = path; this.id = path.split("/").at(-1); }
    collection(name) { return new Query(`${this.path}/${name}`); }
    async get() { return { exists: rows.has(this.path), id: this.id, ref: this, data: () => clone(rows.get(this.path)) }; }
    async set(data, options) { write(this.path, data, options?.merge); }
    async update(data) { assert(rows.has(this.path), "Cannot update a missing fixture document"); write(this.path, data, true); }
    async delete() { rows.delete(this.path); }
  }
  class Query {
    constructor(path, filters = [], order = null, cap = Infinity) { Object.assign(this, { path, filters, order, cap }); }
    doc(id = `auto-${++sequence}`) { return new Ref(`${this.path}/${id}`); }
    where(key, op, value) { assert.equal(op, "=="); return new Query(this.path, [...this.filters, [key, value]], this.order, this.cap); }
    orderBy(key, direction) { return new Query(this.path, this.filters, [key, direction], this.cap); }
    limit(cap) { return new Query(this.path, this.filters, this.order, cap); }
    async get() {
      let entries = [...rows.entries()].filter(([path, data]) => path.startsWith(`${this.path}/`) && path.split("/").length === this.path.split("/").length + 1 && this.filters.every(([key, value]) => data[key] === value));
      if (this.order) {
        const [key, direction] = this.order;
        entries = entries.filter(([, data]) => data[key] !== undefined);
        entries.sort((a, b) => {
          const av = comparable(a[1][key]); const bv = comparable(b[1][key]);
          return (av < bv ? -1 : av > bv ? 1 : 0) * (direction === "desc" ? -1 : 1);
        });
      }
      const docs = await Promise.all(entries.slice(0, this.cap).map(([path]) => new Ref(path).get()));
      return { docs, empty: !docs.length, size: docs.length };
    }
  }
  const db = {
    collection: (path) => new Query(path), doc: (path) => new Ref(path),
    async runTransaction(fn) {
      const writes = []; let written = false;
      const output = await fn({
        get: async (ref) => { assert(!written, "Firestore transactions must read before writing"); return ref.get(); },
        set: (ref, data, options) => { written = true; writes.push(() => ref.set(data, options)); },
        update: (ref, data) => { written = true; writes.push(() => ref.update(data)); },
        delete: (ref) => { written = true; writes.push(() => ref.delete()); },
      });
      for (const write of writes) await write();
      return output;
    },
    batch() {
      const writes = [];
      return { delete: (ref) => writes.push(() => ref.delete()), set: (ref, data, options) => writes.push(() => ref.set(data, options)), async commit() { for (const write of writes) await write(); } };
    },
  };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const exported = {};
  vm.runInNewContext(source, {
    exports: exported, Buffer, URL, URLSearchParams, Date, Intl,
    console: { error() {} },
    require(name) {
      if (name === "node:crypto") return crypto;
      if (name === "firebase-admin/firestore") return { getFirestore: () => db, Timestamp, FieldValue };
      if (name === "firebase-functions/v2/https") return { onCall: (_, fn) => fn, onRequest: (_, fn) => fn, HttpsError };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: "chatgptCompanion.js" });
  function seed(path, data) { rows.set(path, clone(data)); }
  for (const uid of ["keeper-a", "keeper-b"]) {
    seed(`users/${uid}`, { email: `${uid}@example.test`, displayName: uid });
    seed(`paidEntitlements/${uid}`, { tier: "titan_pro", status: "active" });
  }
  for (const name of ["Mort", "Haze", "Lilith", "Marmalade", "Nox"]) {
    seed(`users/keeper-a/snakes/${name.toLowerCase()}`, { name, weight: 1, lastMealDate: "2026-09-28", feedingSchedule: { enabled: true, intervalDays: 14, nextFeedingDate: "2026-10-12" } });
    seed(`users/keeper-a/snakes/${name.toLowerCase()}/feedings/meal`, { date: "2026-09-28", response: "Accepted", foodType: "Fuzzy Mouse" });
    seed(`users/keeper-a/snakes/${name.toLowerCase()}/weights/latest`, { date: "2026-10-01", weight: 96.4, unit: "g" });
  }
  seed("users/keeper-b/snakes/private", { name: "Private animal" });
  async function http(path, body, token, method = "POST", query = {}) {
    const headers = {}; const result = { status: 200, headers };
    const response = {
      status(n) { result.status = n; return this; }, set(k, v) { headers[k.toLowerCase()] = v; return this; },
      json(value) { result.body = plain(value); return this; }, send(value) { result.body = value; return this; },
      redirect(code, url) { result.status = code; headers.location = url; return this; },
    };
    await exported.tinyTitansMcp({ path, body, method, query, get: (key) => key.toLowerCase() === "authorization" ? token ? `Bearer ${token}` : "" : "" }, response);
    return result;
  }
  const callable = (name, uid = "keeper-a", data = {}) => exported[name]({ auth: { uid }, data });
  const call = async (name, args, token) => (await http("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args || {} } }, token)).body.result;
  const verifier = "v".repeat(43);
  function authorizeInput(extra = {}) {
    return { response_type: "code", client_id: clientId, redirect_uri: redirectUri, resource, code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state: "fixture-state", ...extra };
  }
  async function exchange(code, extra = {}) {
    return http("/oauth/token", new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, redirect_uri: redirectUri, resource, code_verifier: verifier, code, ...extra }).toString());
  }
  async function connect(uid = "keeper-a", extra = {}) {
    const prepared = await callable("createChatGPTCompanionConnection", uid, { timezone: "Europe/London" });
    const authorized = await http("/oauth/authorize", { ...authorizeInput(extra), link_code: prepared.linkCode });
    assert.equal(authorized.status, 302, String(authorized.body));
    const code = new URL(authorized.headers.location).searchParams.get("code");
    const tokens = await exchange(code, extra.client_id ? { client_id: extra.client_id } : {});
    assert.equal(tokens.status, 200, JSON.stringify(tokens.body));
    return { token: tokens.body.access_token, refresh: tokens.body.refresh_token, prepared, code };
  }
  return { rows, seed, http, callable, call, connect, exchange, authorizeInput, Timestamp, exported };
}

test("public discovery exposes all 17 scoped commands and both metadata locations", async () => {
  const h = harness();
  const tools = await h.http("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(tools.body.result.tools.length, 17);
  assert(tools.body.result.tools.every((tool) => tool.securitySchemes[0].type === "oauth2"));
  for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"]) {
    const r = await h.http(path, undefined, undefined, "GET");
    assert.equal(r.status, 200); assert.equal(r.body.resource, resource);
  }
});

test("missing auth and a link code used as a bearer trigger OAuth with actionable errors", async () => {
  const h = harness();
  for (const token of [undefined, `ttlink_${"a".repeat(43)}`]) {
    const r = await h.http("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_animals" } }, token);
    assert.equal(r.status, 401); assert.match(r.headers["www-authenticate"], /scope="animals.read"/);
    assert.equal(r.body.result.isError, true);
    if (token) assert.match(r.body.result.content[0].text, /not an API key/);
  }
});

test("form-encoded authorization accepts pasted whitespace, stores hashes and consumes code once", async () => {
  const h = harness();
  const p = await h.callable("createChatGPTCompanionConnection");
  assert(!JSON.stringify([...h.rows.values()]).includes(p.linkCode));
  const form = new URLSearchParams({ ...h.authorizeInput(), link_code: ` \n${p.linkCode.slice(0, 20)}\u200b\n${p.linkCode.slice(20)} ` }).toString();
  const r = await h.http("/oauth/authorize", form);
  assert.equal(r.status, 302);
  assert.equal(new URL(r.headers.location).searchParams.get("state"), "fixture-state");
  const replay = await h.http("/oauth/authorize", { ...h.authorizeInput(), link_code: p.linkCode });
  assert.equal(replay.status, 400); assert.match(replay.body, /already been used/);
});

test("expired, rotated, revoked and ineligible links fail without issuing tokens", async () => {
  for (const scenario of ["expired", "rotated", "revoked", "ineligible"]) {
    const h = harness(); const p = await h.callable("createChatGPTCompanionConnection");
    if (scenario === "expired") h.rows.get("chatgptConnections/keeper-a").linkExpiresAt = h.Timestamp.fromMillis(0);
    if (scenario === "rotated") await h.callable("createChatGPTCompanionConnection");
    if (scenario === "revoked") await h.callable("revokeChatGPTCompanionConnection");
    if (scenario === "ineligible") h.seed("paidEntitlements/keeper-a", { tier: "free", status: "free" });
    const r = await h.http("/oauth/authorize", { ...h.authorizeInput(), link_code: p.linkCode });
    assert.equal(r.status, 400, scenario);
    assert(![...h.rows.keys()].some((key) => key.startsWith("chatgptOauthCodes/")));
  }
});

test("authorization binds PKCE, resource, client, redirect and rejects replay", async () => {
  const h = harness(); const p = await h.callable("createChatGPTCompanionConnection");
  const authorized = await h.http("/oauth/authorize", { ...h.authorizeInput(), link_code: p.linkCode });
  const code = new URL(authorized.headers.location).searchParams.get("code");
  assert.equal((await h.exchange(code, { code_verifier: "x".repeat(43) })).status, 400);
  assert.equal((await h.exchange(code, { resource: "https://example.test/mcp" })).status, 400);
  assert.equal((await h.exchange(code, { redirect_uri: "https://example.test/callback" })).status, 400);
  assert.equal((await h.exchange(code)).status, 200);
  assert.equal((await h.exchange(code)).status, 400);
});

test("dynamic registration works without secrets and rejects untrusted callbacks", async () => {
  const h = harness();
  const registration = await h.http("/oauth/register", { redirect_uris: [redirectUri], token_endpoint_auth_method: "none" });
  assert.equal(registration.status, 201); assert(!registration.body.client_secret);
  const repeat = await h.http("/oauth/register", { redirect_uris: [redirectUri] });
  assert.equal(repeat.body.client_id, registration.body.client_id);
  assert.equal((await h.http("/oauth/register", { redirect_uris: ["https://chatgpt.com.evil.test/callback"] })).status, 400);
  assert.equal((await h.http("/oauth/register", { redirect_uris: [redirectUri], token_endpoint_auth_method: "client_secret_post" })).status, 400);
  const linked = await h.connect("keeper-a", { client_id: registration.body.client_id });
  assert.equal((await h.call("list_animals", {}, linked.token)).structuredContent.animals.length, 5);
});

test("cancel and an invalid redirect never consume the keeper link", async () => {
  const h = harness(); const p = await h.callable("createChatGPTCompanionConnection");
  const r = await h.http("/oauth/authorize", { ...h.authorizeInput(), decision: "deny", link_code: p.linkCode });
  assert.match(r.headers.location, /access_denied/);
  assert(!h.rows.get("chatgptConnections/keeper-a").linkUsedAt);
  const bad = await h.http("/oauth/authorize", { ...h.authorizeInput({ redirect_uri: "https://example.test/callback" }), link_code: p.linkCode });
  assert.equal(bad.status, 400); assert(!bad.headers.location);
});

test("granted scope status is accurate and read-only credentials cannot write", async () => {
  const h = harness(); const { token } = await h.connect("keeper-a", { scope: "animals.read records.read" });
  const status = await h.callable("getChatGPTCompanionStatus");
  assert.equal(status.connected, true); assert.equal(status.upgradeRequired, true);
  assert(!status.permissions.includes("write_records"));
  const r = await h.call("log_weight", { animalId: "mort", date: "2026-09-29", weightGrams: 20 }, token);
  assert.equal(r.isError, true); assert.match(r._meta["mcp/www_authenticate"][0], /scope="animals.read records.write"/);
  assert(![...h.rows.keys()].some((key) => key.includes("/weights/gpt-")));
});

test("all read commands use the correct account and latest history weight", async () => {
  const h = harness(); const { token } = await h.connect();
  for (const name of ["get_profile", "list_animals", "resolve_animal", "get_animal_summary", "get_keeper_snapshot", "list_reminders", "get_feeding_history", "get_weight_history", "get_shed_history", "get_recent_activity"]) {
    const r = await h.call(name, { animalId: "mort", query: "Mort", animalNames: ["Mort", "Haze"] }, token);
    assert.equal(r.isError, false, name); assert(!JSON.stringify(r).includes("Private animal"), name);
  }
  const summary = (await h.call("get_animal_summary", { animalId: "mort" }, token)).structuredContent;
  assert.equal(summary.currentWeightGrams, 96.4); assert.equal(summary.lastWeighedDate, "2026-10-01");
  assert.equal(summary.latestWeight.weight, 96.4);
  assert.equal((await h.call("get_animal_summary", { animalId: "private" }, token)).isError, true);
  assert.equal((await h.call("get_animal_summary", { animalId: "../private" }, token)).isError, true);
});

test("five record writers create native tracker records, audit, retry safely, and undo", async () => {
  for (const [name, collection, extra] of [
    ["log_feeding", "feedings", { foodType: "Fuzzy Mouse", weightGrams: 7, feedingMethod: "Tongs" }],
    ["log_weight", "weights", { weightGrams: 99.2 }],
    ["log_shed", "sheds", { status: "Complete", quality: "Perfect", retainedEyeCaps: false }],
    ["log_behaviour", "behaviours", { description: "Exploring the enclosure" }],
    ["log_health_observation", "health", { description: "Routine observation" }],
  ]) {
    const h = harness(); const { token } = await h.connect();
    const args = { animalId: "mort", date: "2026-10-02", idempotencyKey: "fixture-request", ...extra };
    const r = await h.call(name, args, token); assert.equal(r.isError, false, name);
    const path = `users/keeper-a/snakes/mort/${collection}/${r.structuredContent.record.id}`;
    assert(h.rows.has(path), name); assert(r.structuredContent.actionId);
    assert.equal((await h.call(name, args, token)).structuredContent.duplicate, true);
    assert.equal((await h.call("undo_last_action", {}, token)).structuredContent.undone, true);
    assert(!h.rows.has(path), name);
  }
});

test("compound reminder request creates both reminders and reads all three animals", async () => {
  const h = harness(); const { token } = await h.connect();
  const args = { kind: "feeding", animalNames: ["Mort", "Haze"], dueDate: dateAfter(2), idempotencyKey: "batch-one" };
  const reminders = await h.call("create_reminders", args, token);
  assert.equal(reminders.isError, false); assert.equal(reminders.structuredContent.created.length, 2);
  assert(reminders.structuredContent.created.every((r) => !r.recurring && r.timezone === "Europe/London"));
  const retried = await h.call("create_reminders", args, token);
  assert.equal(retried.structuredContent.created.length, 0); assert.equal(retried.structuredContent.duplicates.length, 2);
  const snapshot = (await h.call("get_keeper_snapshot", { animalNames: ["Lilith", "Marmalade", "Nox"] }, token)).structuredContent;
  assert.equal(snapshot.count, 3); assert(snapshot.animals.every((a) => a.lastMealDate === "2026-09-28"));
  assert.equal(snapshot.timezone, "Europe/London"); assert.match(snapshot.localDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await h.call("undo_last_action", {}, token)).isError, false);
  assert.equal((await h.call("list_reminders", {}, token)).structuredContent.count, 0);
});

test("backdated feeding preserves the latest anchor and undo restores feeding schedule", async () => {
  const h = harness(); const { token } = await h.connect();
  h.seed("users/keeper-a/reminders/recurring", { kind: "feeding", snakeId: "mort", status: "active", scheduleType: "recurring", frequencyDays: 14, timezone: "Europe/London", time: "09:00" });
  const old = await h.call("log_feeding", { animalId: "mort", date: "2026-09-20", foodType: "Fuzzy Mouse", idempotencyKey: "old" }, token);
  assert.equal(old.isError, false); assert.equal(h.rows.get("users/keeper-a/reminders/recurring").nextOccurrenceDate, "2026-10-12");
  await h.call("log_feeding", { animalId: "mort", date: "2026-10-02", foodType: "Fuzzy Mouse", idempotencyKey: "new" }, token);
  assert.equal(h.rows.get("users/keeper-a/snakes/mort").feedingSchedule.nextFeedingDate, "2026-10-16");
  await h.call("undo_last_action", {}, token);
  assert.equal(h.rows.get("users/keeper-a/snakes/mort").feedingSchedule.nextFeedingDate, "2026-10-12");
  assert.equal(h.rows.get("users/keeper-a/reminders/recurring").nextOccurrenceDate, "2026-10-12");
});

test("refresh rotates, and disconnect or a plan change rejects account access", async () => {
  const h = harness(); const linked = await h.connect();
  const body = { grant_type: "refresh_token", client_id: clientId, resource, refresh_token: linked.refresh };
  const next = await h.http("/oauth/token", body); assert.equal(next.status, 200);
  assert.equal((await h.http("/oauth/token", body)).status, 400);
  assert.equal((await h.call("list_animals", {}, next.body.access_token)).isError, false);
  h.seed("paidEntitlements/keeper-a", { tier: "free", status: "free" });
  assert.equal((await h.call("list_animals", {}, next.body.access_token)).isError, true);
  await h.callable("revokeChatGPTCompanionConnection");
  assert.equal((await h.call("list_animals", {}, linked.token)).isError, true);
});

test("undo refuses another account path even if an audit entry is corrupted", async () => {
  const h = harness(); const { token } = await h.connect();
  h.seed("chatgptConnections/keeper-a/actions/corrupt", { reversible: true, requesterUid: "keeper-a", dataOwnerUid: "keeper-a", recordPath: "users/keeper-b/snakes/private", recordCollection: "weights", createdAt: h.Timestamp.fromMillis(Date.now()) });
  const r = await h.call("undo_last_action", {}, token);
  assert.equal(r.isError, true); assert.equal(r.structuredContent.code, "UNDO_RECORD_INVALID");
  assert(h.rows.has("users/keeper-b/snakes/private"));
});

test("completed reminders can be requested explicitly", async () => {
  const h = harness(); const { token } = await h.connect();
  h.seed("users/keeper-a/reminders/done", { kind: "weight", status: "completed" });
  assert.equal((await h.call("list_reminders", { status: "completed" }, token)).structuredContent.count, 1);
});

test("reused write keys cannot silently accept changed payloads", async () => {
  const h = harness(); const { token } = await h.connect();
  const args = { animalId: "mort", date: "2026-10-02", weightGrams: 98, idempotencyKey: "same-request" };
  assert.equal((await h.call("log_weight", args, token)).isError, false);
  const conflict = await h.call("log_weight", { ...args, weightGrams: 198 }, token);
  assert.equal(conflict.structuredContent.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(h.rows.get("users/keeper-a/snakes/mort").weight, 98);
});

test("undo preserves a tracker record edited after ChatGPT created it", async () => {
  const h = harness(); const { token } = await h.connect();
  const saved = await h.call("log_weight", { animalId: "mort", date: "2026-10-02", weightGrams: 98 }, token);
  const path = `users/keeper-a/snakes/mort/weights/${saved.structuredContent.record.id}`;
  h.rows.get(path).weight = 100;
  const result = await h.call("undo_last_action", {}, token);
  assert.equal(result.structuredContent.code, "UNDO_RECORD_CHANGED"); assert(h.rows.has(path));
});

test("a reminder validation failure cannot leave a feeding record or audit half saved", async () => {
  const h = harness(); const { token } = await h.connect();
  h.seed("users/keeper-a/reminders/broken", { kind: "feeding", snakeId: "mort", status: "active", frequencyDays: 14, time: "invalid" });
  const result = await h.call("log_feeding", { animalId: "mort", date: "2026-10-02", foodType: "Fuzzy Mouse", idempotencyKey: "atomic-write" }, token);
  assert.equal(result.isError, true);
  assert(![...h.rows.keys()].some((path) => path.includes("/feedings/gpt-")));
  assert(![...h.rows.keys()].some((path) => path.startsWith("chatgptConnections/keeper-a/actions/")));
  assert.equal(h.rows.get("users/keeper-a/snakes/mort").lastMealDate, "2026-09-28");
});
