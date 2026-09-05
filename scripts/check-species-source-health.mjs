import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const speciesDir = path.join(root, 'src', 'data', 'species');
const outputPath = path.join(root, 'public', 'data', 'species-source-health.json');
const REVIEW_INTERVAL_DAYS = 90;
const files = fs.readdirSync(speciesDir).filter((name) => name.endsWith('.ts'));

const sources = new Map();
for (const file of files) {
  const text = fs.readFileSync(path.join(speciesDir, file), 'utf8');
  const pattern = /^\s*([A-Za-z0-9_]+):\s*\{[^\n]*?url:\s*['\"]([^'\"]+)['\"]/gm;
  for (const match of text.matchAll(pattern)) {
    const [, id, url] = match;
    if (url !== '#') sources.set(id, { sourceId: id, url });
  }
}

let previous = { records: {} };
if (fs.existsSync(outputPath)) {
  try { previous = JSON.parse(fs.readFileSync(outputPath, 'utf8')); } catch { previous = { records: {} }; }
}

const now = new Date();
const records = {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkSource(source) {
  const prior = previous.records?.[source.sourceId];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let response = await fetch(source.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'TinyTitansSourceMonitor/1.0', accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const successful = response.status >= 200 && response.status < 400;
    const changed = Boolean(prior?.contentHash && prior.contentHash !== contentHash);
    records[source.sourceId] = {
      sourceId: source.sourceId,
      status: successful ? (changed ? 'changed' : 'current') : 'unreachable',
      httpStatus: response.status,
      finalUrl: response.url,
      checkedAt: now.toISOString(),
      contentHash,
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined,
      message: changed ? 'The monitored source content hash changed since the previous check. Human review is required before evidence or husbandry values are changed.' : undefined,
    };
    response = null;
  } catch (error) {
    records[source.sourceId] = {
      sourceId: source.sourceId,
      status: 'unreachable',
      checkedAt: now.toISOString(),
      message: error instanceof Error ? error.message : 'Source check failed.',
    };
  } finally {
    clearTimeout(timeout);
  }
  await sleep(100);
}

for (const source of sources.values()) await checkSource(source);

const manifest = {
  generatedAt: now.toISOString(),
  reviewIntervalDays: REVIEW_INTERVAL_DAYS,
  sourceCount: sources.size,
  records,
  policy: 'Monitoring detects availability and source-content changes. It never automatically changes Tiny Titans husbandry guidance.',
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

const counts = Object.values(records).reduce((acc, record) => {
  acc[record.status] = (acc[record.status] ?? 0) + 1;
  return acc;
}, {});
console.log(`Species source monitor: checked ${sources.size} curated source URLs.`);
console.log(`Statuses: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}.`);
console.log(`Wrote ${path.relative(root, outputPath)}.`);
