import { useEffect } from "react";
import { formatDateForUser, parseUserDate } from "../utils/dateDisplay";

const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;
const SLASH_DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;
const DISPLAY_CLASS = "tt-date-user-display";
const DATE_INPUT_SELECTOR = "input[type='date'], input[id*='date'], input[placeholder*='DD/MM/YYYY']";

type SupportedDateInput = HTMLInputElement;

function formatDateLikeText(value: string): string {
  const normalizedLabel = value.replaceAll("DD/MM/YYYY", "DD-MM-YYYY");
  return normalizedLabel.replace(ISO_DATE_PATTERN, (date) => formatDateForUser(date)).replace(SLASH_DATE_PATTERN, (date) => {
    const parsed = parseUserDate(date.replaceAll("/", "-"));
    return parsed ? formatDateForUser(parsed) : date;
  });
}

function formatTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null = walker.nextNode();
  while (current) {
    const text = current as Text;
    const parent = text.parentElement;
    const tag = parent?.tagName;
    if (parent && tag !== "SCRIPT" && tag !== "STYLE" && tag !== "NOSCRIPT" && tag !== "TEXTAREA" && tag !== "OPTION" && !parent.closest(`.${DISPLAY_CLASS}`)) {
      const value = text.nodeValue ?? "";
      if (ISO_DATE_PATTERN.test(value) || SLASH_DATE_PATTERN.test(value) || value.includes("DD/MM/YYYY")) nodes.push(text);
    }
    ISO_DATE_PATTERN.lastIndex = 0;
    SLASH_DATE_PATTERN.lastIndex = 0;
    current = walker.nextNode();
  }

  nodes.forEach((node) => {
    const original = node.nodeValue ?? "";
    const next = formatDateLikeText(original);
    if (next !== original) node.nodeValue = next;
  });
}

function positionDisplay(input: SupportedDateInput, display: HTMLSpanElement) {
  const parent = input.parentElement;
  if (!parent) return;
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
  display.style.left = `${input.offsetLeft + 12}px`;
  display.style.top = `${input.offsetTop + input.offsetHeight / 2}px`;
  display.style.width = `${Math.max(40, input.clientWidth - 42)}px`;
  display.style.transform = "translateY(-50%)";
}

function syncDateInput(input: SupportedDateInput) {
  const display = input.parentElement?.querySelector<HTMLSpanElement>(`.${DISPLAY_CLASS}`);
  if (!display) return;
  const formatted = formatDateLikeText(input.value);
  display.textContent = formatted || "DD-MM-YYYY";
  display.style.opacity = formatted ? "1" : "0.55";
  positionDisplay(input, display);
}

function isDateTextInput(input: HTMLInputElement): boolean {
  if (input.type === "date") return true;
  if (input.type !== "text") return false;
  return input.id.toLowerCase().includes("date") || input.placeholder.toUpperCase().includes("DD/MM/YYYY") || input.placeholder.toUpperCase().includes("DD-MM-YYYY");
}

function enhanceDateInput(input: HTMLInputElement) {
  if (input.dataset.ttDateFormatEnhanced === "1" || !isDateTextInput(input)) return;
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

  input.placeholder = "DD-MM-YYYY";
  input.style.color = "transparent";
  input.style.caretColor = "transparent";
  input.style.textShadow = "none";
  input.style.position = "relative";
  syncDateInput(input);
}

function enhanceDateInputs(root: ParentNode = document) {
  if (root instanceof HTMLInputElement && isDateTextInput(root)) enhanceDateInput(root);
  root.querySelectorAll<HTMLInputElement>(DATE_INPUT_SELECTOR).forEach(enhanceDateInput);
}

export default function DateDisplayNormalizer() {
  useEffect(() => {
    enhanceDateInputs();
    formatTextNodes(document.body);

    const handleDateEvent = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && isDateTextInput(target)) syncDateInput(target);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const element = node as Element;
          enhanceDateInputs(element);
          formatTextNodes(element);
        });
        if (mutation.type === "childList" && mutation.target instanceof Element) enhanceDateInputs(mutation.target);
      });
    });

    const syncAll = () => document.querySelectorAll<HTMLInputElement>("input[data-tt-date-format-enhanced='1']").forEach(syncDateInput);
    document.addEventListener("input", handleDateEvent, true);
    document.addEventListener("change", handleDateEvent, true);
    document.addEventListener("focusin", handleDateEvent, true);
    window.addEventListener("resize", syncAll, { passive: true });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleDateEvent, true);
      document.removeEventListener("change", handleDateEvent, true);
      document.removeEventListener("focusin", handleDateEvent, true);
      window.removeEventListener("resize", syncAll);
    };
  }, []);

  return null;
}
