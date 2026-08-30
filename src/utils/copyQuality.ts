import { useEffect } from "react";

/**
 * Conservative UI-copy cleanup.
 *
 * This deliberately operates only on rendered UI text nodes and never touches
 * form values, editable content, code blocks, or script/style content.
 * It fixes deterministic typography issues without changing application data.
 */

const SKIP_TAGS = new Set([
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "SCRIPT",
  "STYLE",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
]);

const UI_TAGS = new Set([
  "A",
  "BUTTON",
  "DD",
  "DT",
  "EM",
  "FIGCAPTION",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LABEL",
  "LI",
  "P",
  "SMALL",
  "SPAN",
  "STRONG",
  "SUMMARY",
]);

const PROSE_TAGS = new Set(["BLOCKQUOTE", "FIGCAPTION", "P", "SMALL"]);
const CAMEL_CASE_UI_TAGS = new Set(["A", "BUTTON", "LABEL", "SUMMARY", "STRONG", "EM", "SPAN", "SMALL"]);

function isSkipped(element: Element): boolean {
  if (SKIP_TAGS.has(element.tagName)) return true;
  if (element.hasAttribute("data-copy-quality-skip")) return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  return Boolean(element.closest("[data-copy-quality-skip], [contenteditable='true']"));
}

function repairSpacing(value: string, element: Element): string {
  let text = value.replace(/[ \t]{2,}/g, " ");

  // Missing spaces after sentence punctuation: "Done.Next" -> "Done. Next"
  text = text.replace(/([.!?…])([A-Za-z])/g, "$1 $2");

  // Missing spaces after common inline punctuation: "Date:10/08" -> "Date: 10/08"
  text = text.replace(/([,;:])([A-Za-z])/g, "$1 $2");

  // Repair joined UI words such as "WeightRecords" and "activeAdvanced".
  if (CAMEL_CASE_UI_TAGS.has(element.tagName)) {
    text = text.replace(/([a-z]{3,})([A-Z][a-z]{2,})/g, "$1 $2");
  }

  // Remove accidental whitespace immediately before punctuation.
  text = text.replace(/\s+([,.!?;:])/g, "$1");

  return text;
}

function looksLikeUnpunctuatedSentence(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 48) return false;
  if (/[.!?…]["'»”’)]?$/.test(trimmed)) return false;
  if (!/[A-Za-z]$/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 8) return false;

  return /\b(?:the|and|or|but|to|of|for|with|your|you|is|are|can|will|has|have|from|into|this|that|when|where|keep|record|use)\b/i.test(trimmed);
}

function polishTextNode(node: Text): void {
  const parent = node.parentElement;
  if (!parent || !UI_TAGS.has(parent.tagName) || isSkipped(parent)) return;

  const original = node.nodeValue ?? "";
  if (!original.trim()) return;

  let polished = repairSpacing(original, parent);

  if (PROSE_TAGS.has(parent.tagName) && looksLikeUnpunctuatedSentence(polished)) {
    polished = `${polished.trim()}.`;
  }

  if (polished !== original) node.nodeValue = polished;
}

function polishRenderedCopy(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    if (current instanceof Text) nodes.push(current);
    current = walker.nextNode();
  }

  for (const node of nodes) polishTextNode(node);
}

/**
 * React component that keeps rendered UI copy clean as client-side routes and
 * dynamic panels mount/unmount.
 */
export function CopyQualityGuard(): null {
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    let scheduled = false;
    let observer: MutationObserver | null = null;

    const run = () => {
      scheduled = false;
      observer?.disconnect();
      polishRenderedCopy(root);
      observer?.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(run);
    };

    observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    run();

    return () => {
      observer?.disconnect();
      observer = null;
    };
  }, []);

  return null;
}
