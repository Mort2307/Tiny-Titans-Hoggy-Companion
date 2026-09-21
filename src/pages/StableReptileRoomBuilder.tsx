import TinyTitansIcon from "../components/TinyTitansIcon";
import Room3D from "../components/reptile-room-3d/Room3D";
import { CameraDirectionPad } from "../components/reptile-room-3d/ReptileRoomPOVViewer";
import { RoomAssetLibraryPanel } from "../components/reptile-room-3d/RoomAssetLibraryPanel";
import { useStableReptileRoomBuilder } from "../hooks/useStableReptileRoomBuilder";
import { StableReptileRoomInspector } from "../components/stable-reptile-room/StableReptileRoomInspector";
import "../styles/stable-reptile-room-builder.css";

export default function StableReptileRoomBuilder() {
  const {
    user, loading, profileLoading, snakes, room, objects, slots,
    selected, setSelected, notice, saving, showGrid, setShowGrid, showCeiling, setShowCeiling,
    mobilePanel, setMobilePanel, inspectorTab, setInspectorTab, photoBusy, selectedObject, selectedSlot,
    snakesById, saveRoom, addAsset, addSnakeVivarium, deleteSelected, duplicateSelected, uploadPhoto,
    removePhoto, updateSelected, updateRoom,
  } = useStableReptileRoomBuilder();

  if (loading || profileLoading) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Loading your reptile room…</div></main>;
  if (!user) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Please sign in to use the Reptile Room.</div></main>;
  if (!room) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Creating your reptile room…</div></main>;

  return <main className="stable-rr3d">
    <header className="stable-rr3d-header"><div><span className="stable-rr3d-kicker">TINY TITANS · 3D DIGITAL TWIN</span><h1>{room.name}</h1><p>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm · {slots.length} vivariums · {objects.length} assets</p></div><div className="stable-rr3d-header-actions"><span>{saving ? "Saving…" : "✓ Saved"}</span><button type="button" onClick={() => void saveRoom()} disabled={saving}><TinyTitansIcon name="save" size={18} /> Save Room</button></div></header>
    {notice && <div className="stable-rr3d-notice" role="status">{notice}</div>}
    <section className="stable-rr3d-layout">
      <aside className="stable-rr3d-sidebar stable-rr3d-desktop-library"><section className="stable-rr3d-snake-list"><div className="stable-rr3d-section-head"><h2>Your Reptiles</h2><span>{snakes.length}</span></div>{snakes.map((snake) => <button key={snake.id} type="button" onClick={() => addSnakeVivarium(snake)}><TinyTitansIcon name="reptile" size={18} /> {snake.name}<small>Add/select vivarium</small></button>)}</section><RoomAssetLibraryPanel onAddAsset={addAsset} /><section className="stable-rr3d-view-controls"><h2>View</h2><div><button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide grid" : "Show grid"}</button><button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button></div></section></aside>
      <section className="stable-rr3d-viewport"><Room3D room={room} objects={objects} slots={slots} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} showGrid={showGrid} showCeiling={showCeiling} onSelect={(selection) => { setSelected(selection); if (selection) setMobilePanel("inspector"); }} onTransformChange={updateSelected} onRoomChange={updateRoom} onSave={saveRoom} /><CameraDirectionPad room={room} className="stable-rr3d-camera-pad" /><div className="stable-rr3d-viewport-actions"><button type="button" onClick={() => setMobilePanel("library")}><TinyTitansIcon name="enclosure" size={18} /> Keeper Toolkit</button>{selected && <button type="button" onClick={() => setMobilePanel("inspector")}><TinyTitansIcon name="edit" size={18} /> Edit selected</button>}</div></section>
      <aside className="stable-rr3d-inspector stable-rr3d-desktop-inspector"><StableReptileRoomInspector selectedObject={selectedObject} selectedSlot={selectedSlot} slots={slots} snakes={snakes} snakesById={snakesById} inspectorTab={inspectorTab} setInspectorTab={setInspectorTab} updateSelected={updateSelected} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} uploadPhoto={uploadPhoto} removePhoto={removePhoto} photoBusy={photoBusy} /></aside>
    </section>
    {mobilePanel && <div className="stable-rr3d-mobile-sheet" role="dialog" aria-modal="true" aria-label={mobilePanel === "library" ? "Keeper Toolkit" : "Asset inspector"}><div className="stable-rr3d-mobile-sheet-backdrop" onClick={() => setMobilePanel(null)} /><div className="stable-rr3d-mobile-sheet-panel"><div className="stable-rr3d-mobile-sheet-head"><strong>{mobilePanel === "library" ? "Keeper Toolkit" : "Inspector"}</strong><button type="button" onClick={() => setMobilePanel(null)} aria-label="Close"><TinyTitansIcon name="close" size={18} /></button></div>{mobilePanel === "library" ? <RoomAssetLibraryPanel onAddAsset={addAsset} /> : <StableReptileRoomInspector selectedObject={selectedObject} selectedSlot={selectedSlot} slots={slots} snakes={snakes} snakesById={snakesById} inspectorTab={inspectorTab} setInspectorTab={setInspectorTab} updateSelected={updateSelected} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} uploadPhoto={uploadPhoto} removePhoto={removePhoto} photoBusy={photoBusy} />}</div></div>}
  </main>;
}

