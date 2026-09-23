import { useRef, useState } from "react";
import TinyTitansIcon from "../TinyTitansIcon";
import { uploadRescueBrandingImage, type RescueBrandingImageKind } from "../../services/rescueBrandingService";

type RescueBrandingPickerProps = {
  label: string; value: string; kind: RescueBrandingImageKind; organisationId: string;
  disabled: boolean; hint: string; onChange: (value: string) => void; onError: (message: string) => void;
};

export function RescueBrandingPicker({
  label, value, kind, organisationId, disabled, hint, onChange, onError,
}: RescueBrandingPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function chooseImage(file: File) {
    setUploading(true);
    onError("");
    try {
      onChange(await uploadRescueBrandingImage(organisationId, kind, file));
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`rescue-branding-picker rescue-branding-picker-${kind}`}>
      <div className="rescue-branding-field-heading">
        <div><strong>{label}</strong><small>{hint}</small></div>
        {value && (
          <button type="button" className="rescue-secondary-button" onClick={() => onChange("")} disabled={disabled || uploading}>
            <TinyTitansIcon name="close" size={16} /> Remove
          </button>
        )}
      </div>
      {value && <img className="rescue-branding-preview" src={value} alt={`${label} preview`} />}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={disabled || uploading}
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void chooseImage(file); }} />
      <button type="button" className="rescue-branding-upload-button" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        <span aria-hidden="true"><TinyTitansIcon name={uploading ? "upload" : "add"} size={20} /></span>
        <span><strong>{uploading ? "Adding image…" : value ? `Replace ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}</strong><small>Choose a JPG, PNG or WebP image from your device.</small></span>
      </button>
      <label className="rescue-branding-url-field">
        <span>Or use a public HTTPS image URL</span>
        <input type="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://…" disabled={disabled || uploading} />
      </label>
    </div>
  );
}
