import { useState, type FormEvent } from "react";

export default function TitanChatComposer({ disabled, onSubmit }: { disabled?: boolean; onSubmit: (question: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const question = value.trim();
    if (!question || disabled) return;
    setValue("");
    await onSubmit(question);
  };
  return (
    <form className="titan-chat-composer" onSubmit={submit}>
      <label htmlFor="titan-question">Ask Titan anything about your Tiny Titans records</label>
      <textarea id="titan-question" value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} maxLength={6000} rows={4} placeholder="For example: Why has Mort's weight fluctuated recently, and what does my recorded data actually show?" />
      <div className="titan-composer-footer">
        <span>{value.length}/6000</span>
        <button type="submit" disabled={disabled || !value.trim()}>{disabled ? "Thinking…" : "Ask Titan →"}</button>
      </div>
    </form>
  );
}