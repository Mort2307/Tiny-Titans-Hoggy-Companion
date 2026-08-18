import { useId, useRef, useState } from "react";

type TinyTitansDateInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  helpText?: string;
};

function normaliseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return isValidIsoDate(trimmed) ? trimmed : null;
  const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isValidIsoDate(iso) ? iso : null;
}

function isValidIsoDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function displayDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function TinyTitansDateInput({ id, label, value, onChange, disabled = false, required = false, min, max, helpText }: TinyTitansDateInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [draft, setDraft] = useState(displayDate(value));
  const [invalid, setInvalid] = useState(false);

  function handleTextChange(next: string) {
    setDraft(next);
    if (!next.trim()) {
      setInvalid(false);
      onChange("");
      return;
    }
    const normalised = normaliseDate(next);
    if (normalised) {
      setInvalid(false);
      onChange(normalised);
    } else {
      setInvalid(true);
    }
  }

  function handleBlur() {
    if (!draft.trim()) {
      setDraft("");
      setInvalid(false);
      return;
    }
    const normalised = normaliseDate(draft);
    if (normalised) {
      setDraft(displayDate(normalised));
      setInvalid(false);
      onChange(normalised);
    } else {
      setInvalid(true);
    }
  }

  function handlePickerChange(next: string) {
    setDraft(displayDate(next));
    setInvalid(false);
    onChange(next);
  }

  return <div className="tiny-titans-date-field">
    {label && <label htmlFor={id}>{label}</label>}
    <div className="tiny-titans-date-control">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        value={draft}
        onChange={(event) => handleTextChange(event.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : helpText ? `${id}-help` : undefined}
      />
      <button type="button" className="tiny-titans-date-picker-button" onClick={() => pickerRef.current?.showPicker?.()} disabled={disabled} aria-label={`Choose ${label || "date"} from calendar`} title="Choose from calendar">📅</button>
      <input ref={pickerRef} className="tiny-titans-native-date-picker" type="date" value={value} onChange={(event) => handlePickerChange(event.target.value)} disabled={disabled} min={min} max={max} tabIndex={-1} aria-hidden="true" />
    </div>
    {invalid && <small id={errorId} className="tiny-titans-date-error">Use DD/MM/YYYY, for example 18/08/2026.</small>}
    {!invalid && helpText && <small id={`${id}-help`} className="tiny-titans-date-help">{helpText}</small>}
  </div>;
}
