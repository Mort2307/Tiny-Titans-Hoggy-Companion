import { useEffect } from "react";
import { formatDateForUser } from "../utils/dateDisplay";

const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;
const ENHANCED_INPUT = "data-tt-date-format-enhanced";
const DISPLAY_CLASS = "tt-date-user-display";

function formatTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null = walker.nextNode();
  while (current) {
    const text = current as Text;
    const parent = text.parentElement;
    const tag = parent?.tagName;
    if (parent && tag !== "SCRIPT" && tag !== "STYLE" && tag !== "NOSCRIPT" && tag !== "TEXTAREA" && tag !== "OPTION") {
      if (ISO_DATE_PATTERN.test(text.nodeValue ?? "")) nodes.push(text);
    }
    ISO_DATE_PATTERN.lastIndex = 0;
    current = walker.nextNode();
  }

  nodes.forEach((node) => {
    const original = node.nodeValue ?? "";
    const next = original.replace(ISO_DATE_PATTERN, (value) => formatDateForUser(value));
    ISO_DATE_PATTERN.lastIndex = 0;
    if (next !== original) node.nodeValue = next;
  });
}

function positionDisplay(input: HTMLInputElement, display: HTMLSpanElement) {
  const parent = input.parentElement;
  if (!parent) return;
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
  display.style.left = `${input.offsetLeft + 12}px`;
  display.style.top = `${input.offsetTop + input.offsetHeight / 2}px`;
  display.style.width = `${Math.max(40, input.clientWidth - 42)}px`;
  display.style.transform = "translateY(-50%)";
}

function enhanceDateInput(input: HTMLInputElement) {
  if (input.dataset.ttDateFormatEnhanced === "1" || input.type !== "date") return;
  const parent = input.parentElement;
  if (!parent) return;

  input.dataset.ttDateFormatEnhanced = "1";
  const display = document.createElement("span");
  display.className = DISPLAY_CLASS;
  display.setAttribute("aria-hidden", "true");
  Object.assign(display.style, {
    position: "absolute",
    pointerEvents: "none",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    zIndex: "1",
    font: getComputedStyle(input).font,
    lineHeight: getComputedStyle(input).lineHeight,
  });
  parent.appendChild(display);

  const sync = () => {
    const formatted = formatDateForUser(input.value);
    display.textContent = formatted || "DD-MM-YYYY";
    display.style.opacity = formatted ? "1" : "0.55";
    positionDisplay(input, display);
  };

  input.style.color = "transparent";
  input.style.caretColor = "transparent";
  input.style.textShadow = "none";
  input.style.position = "relative";
  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  input.addEventListener("focus", sync);
  window.addEventListener("resize", sync, { passive: true });
  sync();
}

function enhanceDateInputs(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>("input[type='date']").forEach(enhanceDateInput);
}

export default function DateDisplayNormalizer() {
  useEffect(() => {
    enhanceDateInputs();
    formatTextNodes(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const element = node as Element;
          enhanceDateInputs(element);
          formatTextNodes(element);
        });
        if (mutation.type === "childList" && mutation.target instanceof Element) {
          enhanceDateInputs(mutation.target);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
