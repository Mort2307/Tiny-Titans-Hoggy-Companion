#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const ROOT = path.resolve("src");
const BASELINE_PATH = path.resolve("scripts/iconography-baseline.json");
const ICON_COMPONENT_PATH = path.resolve("src/components/TinyTitansIcon.tsx");
const ICON_TYPE_PATH = path.resolve("src/types/tinyTitansIcon.ts");

const symbolToIcon = new Map([
  ["🏠","home"],["⌂","home"],["🐍","reptile"],["🐊","reptiles"],["🦎","reptiles"],["🦖","reptiles"],
  ["💬","messages"],["📨","messages"],["📥","messages"],["📱","messages"],["📲","messages"],["📡","messages"],["📣","messages"],["📟","messages"],
  ["🔔","reminders"],["⏰","reminders"],
  ["🌡️","husbandry"],["🌡","husbandry"],["🌱","husbandry"],["🌿","husbandry"],["☀️","husbandry"],["☀","husbandry"],["🌦️","husbandry"],["🌦","husbandry"],["🥶","husbandry"],["🧽","husbandry"],["🪴","husbandry"],
  ["⚖️","weight"],["⚖","weight"],["📊","weight"],
  ["🍽️","feeding"],["🍽","feeding"],["🥄","feeding"],["🥩","feeding"],
  ["❤️","health"],["❤","health"],["💚","health"],["🫀","health"],["💪","health"],["🚑","health"],["🛟","health"],["🩺","vet"],
  ["◉","behaviour"],["👁️","behaviour"],["👁","behaviour"],["👀","behaviour"],
  ["🔭","observatory"],["🔎","observatory"],
  ["⌘","enclosure"],["🏡","enclosure"],["🪨","enclosure"],["🪵","enclosure"],["🪑","enclosure"],["🚪","enclosure"],["🪟","enclosure"],["🏗️","enclosure"],["🏗","enclosure"],["📐","enclosure"],["📏","enclosure"],
  ["🧬","genetics"],["∑","genetics"],
  ["🥚","breeding"],["🐣","breeding"],["🪹","breeding"],
  ["📦","marketplace"],["🗃️","marketplace"],["🗃","marketplace"],["🗄️","marketplace"],["🗄","marketplace"],["🛒","marketplace"],
  ["▣","academy"],["🎓","academy"],["🏫","academy"],["📋","academy"],
  ["📖","handbook"],["📜","handbook"],
  ["📚","knowledge"],["📓","knowledge"],["📰","knowledge"],["▤","knowledge"],
  ["◆","challenge"],["🎯","challenge"],
  ["✓","check"],["✅","check"],["🏁","check"],["👍","check"],
  ["🏆","wall"],["★","wall"],["⭐","wall"],["🏅","wall"],["🥇","wall"],["🥈","wall"],["🥉","wall"],["💯","wall"],
  ["🌍","community"],["🌎","community"],["👥","community"],["◌","community"],["◈","community"],
  ["↔","mentorship"],["🤝","mentorship"],
  ["⚙️","account"],["⚙","account"],["👤","account"],["🧑","account"],["🪪","account"],["🕶️","account"],["🕶","account"],["🔐","account"],["🛡️","account"],["🛡","account"],["●","account"],
  ["📝","contribution"],["🎁","contribution"],["🆕","contribution"],
  ["✦","titan"],["✨","titan"],["🧠","titan"],
  ["👑","plans"],["💠","plans"],["💎","plans"],["◇","plans"],
  ["🧪","testing"],["🐛","testing"],["🤖","testing"],
  ["🛠️","creator"],["🛠","creator"],["⚒","creator"],["🔧","creator"],
  ["🖼️","morph"],["🖼","morph"],
  ["＋","add"],["➕","add"],
  ["✏️","edit"],["✏","edit"],["🗑️","delete"],["🗑","delete"],
  ["💧","water"],["📅","timeline"],["🎂","timeline"],["⏳","timeline"],["⏱️","timeline"],["⏱","timeline"],
  ["💾","save"],["⬆","upload"],["☁️","upload"],["☁","upload"],["📤","export"],["📈","analytics"],
  ["←","back"],["↩️","back"],["↩","back"],["→","forward"],["↗️","forward"],["↗","forward"],["🚀","forward"],
  ["×","close"],["✕","close"],
  ["🔗","link"],["🔒","lock"],["🔓","unlock"],
  ["🔲","grid"],["⬜","grid"],
  ["📷","camera"],["📸","camera"],["🎥","camera"],
  ["🔄","rotate"],["↻","rotate"],["↕","move"],
  ["🔍","search"],["☰","menu"],
  ["💡","info"],["🔵","info"],
  ["⚠️","warning"],["⚠","warning"],["🛑","warning"],["🚫","warning"],["🚦","warning"],["👎","warning"],["🔴","warning"],["🟠","warning"],["🟡","warning"],["🟢","check"],
  ["🧭","compass"],["⚡","power"],["🔥","power"],["🔌","power"],["🔦","power"],
]);

const symbols = [...symbolToIcon.keys()].sort((a,b)=>b.length-a.length);
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const symbolPattern = new RegExp(symbols.map(escapeRe).join("|"), "gu");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

function symbolMatches(value) {
  symbolPattern.lastIndex = 0;
  const matches = [...value.matchAll(symbolPattern)];
  symbolPattern.lastIndex = 0;
  return matches;
}

function cleanPlainText(value) {
  symbolPattern.lastIndex = 0;
  return value
    .replace(symbolPattern, "")
    .replace(/\uFE0F/gu, "")
    .replace(/[ \t]{2,}/g, " ");
}

function splitIconText(value) {
  const parts = [];
  let cursor = 0;
  for (const match of symbolMatches(value)) {
    if (match.index > cursor) parts.push({ text: value.slice(cursor, match.index) });
    parts.push({ icon: symbolToIcon.get(match[0]) });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor) });
  return parts;
}

function fragmentForText(value) {
  const body = splitIconText(value).map((part) => {
    if (part.icon) return `<TinyTitansIcon name="${part.icon}" size={18} className="tt-inline-icon" />`;
    return part.text ? `{${JSON.stringify(part.text)}}` : "";
  }).join("");
  return `<>${body}</>`;
}

function iconTokenForValue(value) {
  const hits = symbolMatches(value);
  return hits.length ? symbolToIcon.get(hits[0][0]) : null;
}

function isIconProperty(node) {
  if (!ts.isPropertyAssignment(node.parent)) return false;
  const name = node.parent.name;
  const text = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : "";
  return /^(?:icon|iconName|glyph|symbol|emoji)$/i.test(text);
}

function findNearestJsxExpression(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxExpression(current)) return current;
    if (
      ts.isSourceFile(current) ||
      ts.isStatement(current) ||
      ts.isJsxElement(current) ||
      ts.isJsxSelfClosingElement(current) ||
      ts.isJsxFragment(current)
    ) return null;
    current = current.parent;
  }
  return null;
}

function canBecomeReactNode(node, jsxExpression) {
  if (!jsxExpression) return false;
  if (jsxExpression.expression === node) return true;
  const parent = node.parent;
  if (ts.isConditionalExpression(parent) && (parent.whenTrue === node || parent.whenFalse === node)) {
    let current = parent;
    while (current.parent && current.parent !== jsxExpression) current = current.parent;
    return current.parent === jsxExpression;
  }
  return false;
}

function directIconExpression(node, sourceFile) {
  if (!node.expression) return false;
  if (!(ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) return false;
  const text = node.expression.getText(sourceFile).trim();
  return (
    /^icon$/u.test(text) ||
    /(?:^|[?.])icon(?:\s*\?\?\s*["'][^"']+["'])?$/u.test(text) ||
    /^icons?\s*\[[^\]]+\](?:\s*\?\?\s*["'][^"']+["'])?$/u.test(text)
  );
}

function expressionWithCanonicalSymbols(node, sourceFile) {
  const text = node.expression.getText(sourceFile);
  symbolPattern.lastIndex = 0;
  return text.replace(symbolPattern, (symbol) => symbolToIcon.get(symbol) ?? "");
}

function relativeIconImport(file) {
  let rel = path.relative(path.dirname(file), ICON_COMPONENT_PATH).replaceAll(path.sep, "/").replace(/\.tsx$/u, "");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function migrateFile(file) {
  if (file === ICON_COMPONENT_PATH || file === ICON_TYPE_PATH) return false;

  const source = fs.readFileSync(file, "utf8");
  const isTsx = file.endsWith(".tsx");
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const replacements = [];
  let needsIconImport = false;

  function add(start, end, text) {
    replacements.push({ start, end, text });
  }

  function visit(node) {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteralLike(node.initializer)) {
      const prop = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "";
      if (/^(?:icon|iconName|glyph|symbol|emoji)$/i.test(prop)) {
        const token = iconTokenForValue(node.initializer.text);
        if (token) add(node.initializer.getStart(sf), node.initializer.end, JSON.stringify(token));
        return;
      }
    }

    if (isTsx && ts.isJsxText(node)) {
      const raw = source.slice(node.pos, node.end);
      const hits = symbolMatches(raw);
      if (hits.length) {
        symbolPattern.lastIndex = 0;
        const next = raw.replace(symbolPattern, (symbol) => {
          const icon = symbolToIcon.get(symbol);
          if (!icon) return "";
          needsIconImport = true;
          return `<TinyTitansIcon name="${icon}" size={18} className="tt-inline-icon" />`;
        }).replace(/\uFE0F/gu, "");
        add(node.pos, node.end, next);
        return;
      }
    }

    if (isTsx && ts.isJsxExpression(node) && directIconExpression(node, sf)) {
      needsIconImport = true;
      const expr = expressionWithCanonicalSymbols(node, sf);
      add(
        node.getStart(sf),
        node.end,
        `<TinyTitansIcon name={${expr}} size={18} className="tt-inline-icon" />`,
      );
      return;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const value = node.text;
      const hits = symbolMatches(value);
      if (hits.length) {
        if (isIconProperty(node)) return;

        const jsxExpression = isTsx ? findNearestJsxExpression(node) : null;
        if (isTsx && canBecomeReactNode(node, jsxExpression)) {
          needsIconImport = true;
          add(node.getStart(sf), node.end, fragmentForText(value));
          return;
        }

        const onlySymbols = cleanPlainText(value).trim() === "";
        const replacementValue = onlySymbols
          ? (symbolToIcon.get(hits[0][0]) ?? "")
          : cleanPlainText(value);

        if (ts.isNoSubstitutionTemplateLiteral(node)) {
          add(node.getStart(sf), node.end, "`" + replacementValue.replaceAll("`", "\\`") + "`");
        } else {
          add(node.getStart(sf), node.end, JSON.stringify(replacementValue));
        }
        return;
      }
    }

    if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const raw = source.slice(node.pos, node.end);
      if (symbolMatches(raw).length) {
        symbolPattern.lastIndex = 0;
        add(node.pos, node.end, raw.replace(symbolPattern, "").replace(/\uFE0F/gu, ""));
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  // Resolve overlapping edits by keeping the outermost replacement.
  replacements.sort((a, b) => a.start - b.start || b.end - a.end);
  const filtered = [];
  let coveredUntil = -1;
  for (const item of replacements) {
    if (item.start < coveredUntil) continue;
    filtered.push(item);
    coveredUntil = item.end;
  }

  let output = source;
  for (const item of filtered.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, item.start) + item.text + output.slice(item.end);
  }

  if (
    needsIconImport &&
    !/from\s+["'][^"']*TinyTitansIcon["']/u.test(output)
  ) {
    output = `import TinyTitansIcon from "${relativeIconImport(file)}";\n` + output;
  }

  if (output !== source) {
    fs.writeFileSync(file, output);
    return true;
  }
  return false;
}

const changed = [];
for (const file of walk(ROOT)) {
  if (migrateFile(file)) changed.push(path.relative(process.cwd(), file).replaceAll(path.sep, "/"));
}

fs.writeFileSync(
  BASELINE_PATH,
  JSON.stringify({
    version: 2,
    purpose: "Raw platform emoji and Unicode control glyphs are forbidden in keeper-facing Tiny Titans UI. Use TinyTitansIcon custom SVGs.",
    findings: 0,
    byKind: {
      "raw-pictographic-ui": 0,
      "raw-ui-glyph": 0,
      "legacy-icon-metadata": 0,
    },
    fingerprints: [],
  }, null, 2) + "\n",
);

console.log(JSON.stringify({
  migration: "custom-iconography",
  changedFiles: changed.length,
  changed,
}, null, 2));
