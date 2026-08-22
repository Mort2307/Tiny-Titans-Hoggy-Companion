import { useEffect, useRef, useState } from "react";
import "../styles/MediaPicker.css";

type MediaPickerProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: "image" | "video" | "image-video";
  label?: string;
  helper?: string;
  maxBytes?: number;
};

const ACCEPT_MAP = {
  image: "image/jpeg,image/png,image/webp,image/heic,image/heif",
  video: "video/mp4,video/webm,video/quicktime",
  "image-video": "image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime",
} as const;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPicker({ value, onChange, accept = "image-video", label = "Add image or video", helper = "Choose a file from your device — no URL required.", maxBytes = 20 * 1024 * 1024 }: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function chooseFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`That file is ${formatBytes(file.size)}. Maximum allowed is ${formatBytes(maxBytes)}.`);
      return;
    }
    onChange(file);
  }

  const isVideo = value?.type.startsWith("video/");

  return (
    <div className="media-picker">
      <input ref={inputRef} type="file" accept={ACCEPT_MAP[accept]} onChange={(event) => chooseFile(event.target.files?.[0])} hidden />
      <div className="media-picker__header">
        <div>
          <strong>{label}</strong>
          <small>{helper}</small>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}>{value ? "Change file" : "＋ Add file"}</button>
      </div>
      {value && previewUrl && (
        <div className="media-picker__preview">
          {isVideo ? <video src={previewUrl} controls preload="metadata" /> : <img src={previewUrl} alt="Selected upload preview" />}
          <div><span>{value.name}</span><small>{formatBytes(value.size)}</small><button type="button" onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}>Remove</button></div>
        </div>
      )}
      {error && <p className="media-picker__error" role="alert">{error}</p>}
    </div>
  );
}
