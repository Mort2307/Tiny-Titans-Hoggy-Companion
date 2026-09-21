import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import { uploadReptileRoomVivariumPhoto } from "../../services/reptileRoomPhotoService";
import type { ReptileRoomSlot } from "../../services/reptileRoomService";
import type { Room3DProps } from "../../types/reptileRoom3D";

type VivariumPhotoChange = (slotId:string,persistedUrl:string,previewUrl?:string)=>void;

function VivariumPhotoDock({ room, slot, onPhotoUrl, onPersistPhoto }: { room: Room3DProps["room"]; slot: ReptileRoomSlot; onPhotoUrl: VivariumPhotoChange; onPersistPhoto?: (slotId: string, persistedUrl: string) => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedPhoto = slot.photoUrl || "";
  const upload = async (file: File) => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    const previewUrl = URL.createObjectURL(file);
    try {
      const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, slot.id, file);
      onPhotoUrl(slot.id, url, previewUrl);
      onPersistPhoto?.(slot.id, url);
      setMessage("Photo uploaded and linked to the 3D glass door.");
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setMessage(error instanceof Error ? error.message : "Vivarium photo upload failed.");
    } finally {
      setBusy(false);
    }
  };
  return <section className="rr3d-glass-dock" aria-label="Vivarium glass controls"><div className="rr3d-dock-header"><div><div className="rr3d-control-kicker">VIVARIUM GLASS</div><strong>{slot.label || "Vivarium"}</strong></div><span className={`rr3d-live-pill ${selectedPhoto ? "is-live" : ""}`}>{selectedPhoto ? "LIVE" : "EMPTY"}</span></div><p>The real enclosure photo becomes the clear front-door surface so the digital twin mirrors the physical vivarium.</p>{selectedPhoto ? <img className="rr3d-glass-preview" src={selectedPhoto} alt={`${slot.label || "Vivarium"} glass preview`} /> : <div className="rr3d-glass-empty"><span>Glass surface ready</span><small>Add a fresh enclosure photo to mirror the real vivarium.</small></div>}<div className="rr3d-dock-actions"><label className="rr3d-primary-action">{busy ? "Uploading…" : selectedPhoto ? "Replace photo" : "Add enclosure photo"}<input type="file" accept="image/*" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label></div>{message && <div className="rr3d-dock-status" role="status">{message}</div>}</section>;
}
