import { useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { updateUserSnake } from "../services/snakeService";
import { deleteEnclosurePhoto, uploadEnclosurePhoto } from "../services/enclosurePhotoService";
import type { Snake } from "../types/Snake";
import type { EnclosurePhotoMode } from "../types/Enclosure";

type Props = { snake: Snake; onUpdated: (snake: Snake) => void };

export default function EnclosurePhotoEditor({ snake, onUpdated }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const photo = snake.enclosure?.roomPhoto;

  async function savePhoto(file: File) {
    if (!user || !snake.enclosure) return;
    setBusy(true); setMessage("");
    try {
      const url = await uploadEnclosurePhoto(user.uid, snake.id, file);
      const nextSnake: Snake = { ...snake, enclosure: { ...snake.enclosure, roomPhoto: { url, mode: photo?.mode ?? "hybrid", updatedAt: new Date().toISOString() } } };
      onUpdated(await updateUserSnake(user.uid, nextSnake));
      setMessage("Your real vivarium photo is now the room visual.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the vivarium photo."); }
    finally { setBusy(false); }
  }

  async function removePhoto() {
    if (!user || !snake.enclosure || !photo) return;
    setBusy(true); setMessage("");
    try {
      await deleteEnclosurePhoto(user.uid, snake.id);
      const nextSnake: Snake = { ...snake, enclosure: { ...snake.enclosure, roomPhoto: undefined } };
      onUpdated(await updateUserSnake(user.uid, nextSnake));
      setMessage("Vivarium photo removed. Tiny Titans will use the generated enclosure view.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove the vivarium photo."); }
    finally { setBusy(false); }
  }

  async function changeMode(mode: EnclosurePhotoMode) {
    if (!user || !snake.enclosure || !photo) return;
    setBusy(true); setMessage("");
    try {
      onUpdated(await updateUserSnake(user.uid, { ...snake, enclosure: { ...snake.enclosure, roomPhoto: { ...photo, mode } } }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update the photo display mode."); }
    finally { setBusy(false); }
  }

  return <div className="room-photo-editor">
    <div className="room-photo-heading"><div><span>📷 Real Vivarium Photo</span><small>Optional. This photo belongs to {snake.name}'s enclosure record and follows the snake if you move them.</small></div>{photo && <button type="button" className="husbandry-button" onClick={() => void removePhoto()} disabled={busy}>Remove photo</button>}</div>
    {photo ? <div className={`room-photo-preview room-photo-mode-${photo.mode}`}><img src={photo.url} alt={`${snake.name}'s vivarium`} /><div className="room-photo-overlay"><strong>{snake.name}</strong><span>{snake.enclosure.length} × {snake.enclosure.width} × {snake.enclosure.height} cm</span>{photo.mode !== "photo" && <span>🧠 Live Tiny Titans data</span>}</div></div> : <button type="button" className="room-photo-upload" onClick={() => inputRef.current?.click()} disabled={busy}><span>📸</span><strong>Add a photo of this actual vivarium</strong><small>We'll resize it for the room automatically.</small></button>}
    {photo && <div className="room-photo-controls"><span>Display:</span><button type="button" className={photo.mode === "photo" ? "is-active" : ""} onClick={() => void changeMode("photo")} disabled={busy}>🖼️ Photo</button><button type="button" className={photo.mode === "hybrid" ? "is-active" : ""} onClick={() => void changeMode("hybrid")} disabled={busy}>🧠 Hybrid</button><button type="button" className={photo.mode === "minimal" ? "is-active" : ""} onClick={() => void changeMode("minimal")} disabled={busy}>🏷️ Minimal</button><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>Replace</button></div>}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void savePhoto(file); }} />
    {message && <small className="room-photo-message" role="status">{message}</small>}
  </div>;
}