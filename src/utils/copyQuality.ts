import { useCallback, useEffect, useMemo, useState } from "react";

const PUNCTUATION = /\s+([,.!?;:])/g;

export function tidyCopy(text: string): string {
  text = text.replace(PUNCTUATION, "$1");

  return text;
}

function looksLikeUnpunctuatedSentence(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 48) return false;
  if (/[.!?…]["'»”’)]?$/.test(trimmed)) return false;
  if (!/[A-Za-z]$/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 8) return false;
  return true;
}

export function hasCopyQualityIssue(text: string): boolean {
  return looksLikeUnpunctuatedSentence(text);
}
